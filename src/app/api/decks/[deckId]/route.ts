import { NextRequest, NextResponse } from 'next/server'
import { db, decks, folders } from '@/db'
import { eq, and, or, isNull } from 'drizzle-orm'
import { auth } from '@/auth'

// GET /api/decks/[deckId] - Get a single deck
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deckId: deckIdStr } = await params
    const deckId = parseInt(deckIdStr)

    if (isNaN(deckId)) {
      return NextResponse.json(
        { error: 'Invalid deck ID' },
        { status: 400 }
      )
    }

    const [deck] = await db
      .select()
      .from(decks)
      .where(and(
        eq(decks.id, deckId),
        or(eq(decks.userId, session.user.id), isNull(decks.userId))
      ))

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(deck)
  } catch (error) {
    console.error('Error fetching deck:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deck' },
      { status: 500 }
    )
  }
}

// PATCH /api/decks/[deckId] - Update deck (rename, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deckId: deckIdStr } = await params
    const deckId = parseInt(deckIdStr)

    if (isNaN(deckId)) {
      return NextResponse.json(
        { error: 'Invalid deck ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, description, folderId } = body

    // At least one field must be provided
    if (name === undefined && description === undefined && folderId === undefined) {
      return NextResponse.json(
        { error: 'At least one field is required' },
        { status: 400 }
      )
    }

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      )
    }

    // Check if deck exists and belongs to user
    const [existingDeck] = await db
      .select()
      .from(decks)
      .where(and(
        eq(decks.id, deckId),
        or(eq(decks.userId, session.user.id), isNull(decks.userId))
      ))

    if (!existingDeck) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      )
    }

    // Validate folderId if provided (and not null)
    if (folderId !== undefined && folderId !== null) {
      const [folder] = await db
        .select()
        .from(folders)
        .where(eq(folders.id, folderId))

      if (!folder) {
        return NextResponse.json(
          { error: 'Folder not found' },
          { status: 404 }
        )
      }
    }

    // Build update object
    const updates: { name?: string; description?: string | null; folderId?: number | null; updatedAt: Date } = {
      updatedAt: new Date(),
    }
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (folderId !== undefined) updates.folderId = folderId

    // Update deck
    const [updatedDeck] = await db
      .update(decks)
      .set(updates)
      .where(eq(decks.id, deckId))
      .returning()

    return NextResponse.json(updatedDeck)
  } catch (error) {
    console.error('Error updating deck:', error)
    return NextResponse.json(
      { error: 'Failed to update deck' },
      { status: 500 }
    )
  }
}

// DELETE /api/decks/[deckId] - Delete a deck and its flashcards
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deckId: deckIdStr } = await params
    const deckId = parseInt(deckIdStr)

    if (isNaN(deckId)) {
      return NextResponse.json(
        { error: 'Invalid deck ID' },
        { status: 400 }
      )
    }

    // Check if deck exists and belongs to user
    const [deck] = await db
      .select()
      .from(decks)
      .where(and(
        eq(decks.id, deckId),
        or(eq(decks.userId, session.user.id), isNull(decks.userId))
      ))

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      )
    }

    // Delete deck (flashcards cascade automatically)
    await db.delete(decks).where(eq(decks.id, deckId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting deck:', error)
    return NextResponse.json(
      { error: 'Failed to delete deck' },
      { status: 500 }
    )
  }
}
