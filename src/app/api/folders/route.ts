import { NextRequest, NextResponse } from 'next/server'
import { db, folders, decks } from '@/db'
import { desc, eq, sql, isNull, or } from 'drizzle-orm'
import { auth } from '@/auth'

// GET /api/folders - Get all folders with deck counts
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allFolders = await db
      .select({
        id: folders.id,
        name: folders.name,
        parentId: folders.parentId,
        depth: folders.depth,
        sortOrder: folders.sortOrder,
        createdAt: folders.createdAt,
        updatedAt: folders.updatedAt,
        deckCount: sql<number>`(
          SELECT count(*)::int FROM ${decks} WHERE ${decks.folderId} = ${folders.id}
        )`,
      })
      .from(folders)
      .where(or(eq(folders.userId, session.user.id), isNull(folders.userId)))
      .orderBy(folders.sortOrder, folders.name)

    return NextResponse.json(allFolders)
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    )
  }
}

// POST /api/folders - Create a new folder
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, parentId } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      )
    }

    let depth = 0

    // If parentId is provided, validate it and calculate depth
    if (parentId !== null && parentId !== undefined) {
      const [parentFolder] = await db
        .select()
        .from(folders)
        .where(eq(folders.id, parentId))

      if (!parentFolder) {
        return NextResponse.json(
          { error: 'Parent folder not found' },
          { status: 404 }
        )
      }

      // Check depth limit (max 3 levels: 0, 1, 2)
      if (parentFolder.depth >= 2) {
        return NextResponse.json(
          { error: 'Maximum folder nesting depth reached (3 levels)' },
          { status: 400 }
        )
      }

      depth = parentFolder.depth + 1
    }

    const [newFolder] = await db
      .insert(folders)
      .values({
        name: name.trim(),
        parentId: parentId ?? null,
        depth,
        userId: session.user.id,
      })
      .returning()

    return NextResponse.json(newFolder, { status: 201 })
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    )
  }
}
