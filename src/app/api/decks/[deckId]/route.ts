import { NextRequest, NextResponse } from 'next/server'
import { db, decks } from '@/db'
import { eq } from 'drizzle-orm'

// GET /api/decks/[deckId] - Get a single deck
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
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
      .where(eq(decks.id, deckId))

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
    const { deckId: deckIdStr } = await params
    const deckId = parseInt(deckIdStr)

    if (isNaN(deckId)) {
      return NextResponse.json(
        { error: 'Invalid deck ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Check if deck exists
    const [existingDeck] = await db
      .select()
      .from(decks)
      .where(eq(decks.id, deckId))

    if (!existingDeck) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      )
    }

    // Update deck
    const [updatedDeck] = await db
      .update(decks)
      .set({
        name: name.trim(),
        description: description?.trim() || null,
        updatedAt: new Date(),
      })
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
    const { deckId: deckIdStr } = await params
    const deckId = parseInt(deckIdStr)

    if (isNaN(deckId)) {
      return NextResponse.json(
        { error: 'Invalid deck ID' },
        { status: 400 }
      )
    }

    // Check if deck exists
    const [deck] = await db
      .select()
      .from(decks)
      .where(eq(decks.id, deckId))

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
