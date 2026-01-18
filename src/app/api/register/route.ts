import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, decks, folders } from '@/db/schema'
import { eq, isNull } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }


    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const [newUser] = await db.insert(users).values({
      name: name || null,
      email,
      password: hashedPassword,
    }).returning()

    // Check if this is the first user - assign orphaned data
    const userCount = await db.select().from(users)
    if (userCount.length === 1) {
      // This is the first user - assign all orphaned decks and folders
      await db.update(decks)
        .set({ userId: newUser.id })
        .where(isNull(decks.userId))

      await db.update(folders)
        .set({ userId: newUser.id })
        .where(isNull(folders.userId))
    }

    return NextResponse.json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
