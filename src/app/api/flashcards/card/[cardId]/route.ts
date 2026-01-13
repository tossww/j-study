import { NextRequest, NextResponse } from 'next/server'
import { db, flashcards, decks } from '@/db'
import { eq } from 'drizzle-orm'

// PATCH /api/flashcards/card/[cardId] - Update a flashcard
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId: cardIdStr } = await params
    const cardId = parseInt(cardIdStr)

    if (isNaN(cardId)) {
      return NextResponse.json(
        { error: 'Invalid card ID' },
        { status: 400 }
      )
    }

    // Check if card exists
    const [existingCard] = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.id, cardId))

    if (!existingCard) {
      return NextResponse.json(
        { error: 'Flashcard not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { front, back } = body

    if (!front || typeof front !== 'string' || front.trim().length === 0) {
      return NextResponse.json(
        { error: 'Front (question) is required' },
        { status: 400 }
      )
    }

    if (!back || typeof back !== 'string' || back.trim().length === 0) {
      return NextResponse.json(
        { error: 'Back (answer) is required' },
        { status: 400 }
      )
    }

    // Update flashcard
    const [updatedCard] = await db
      .update(flashcards)
      .set({
        front: front.trim(),
        back: back.trim(),
        updatedAt: new Date(),
      })
      .where(eq(flashcards.id, cardId))
      .returning()

    // Update deck's updatedAt
    await db
      .update(decks)
      .set({ updatedAt: new Date() })
      .where(eq(decks.id, existingCard.deckId))

    return NextResponse.json(updatedCard)
  } catch (error) {
    console.error('Error updating flashcard:', error)
    return NextResponse.json(
      { error: 'Failed to update flashcard' },
      { status: 500 }
    )
  }
}

// DELETE /api/flashcards/card/[cardId] - Delete a flashcard
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId: cardIdStr } = await params
    const cardId = parseInt(cardIdStr)

    if (isNaN(cardId)) {
      return NextResponse.json(
        { error: 'Invalid card ID' },
        { status: 400 }
      )
    }

    // Check if card exists
    const [existingCard] = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.id, cardId))

    if (!existingCard) {
      return NextResponse.json(
        { error: 'Flashcard not found' },
        { status: 404 }
      )
    }

    // Delete flashcard
    await db.delete(flashcards).where(eq(flashcards.id, cardId))

    // Update deck's updatedAt
    await db
      .update(decks)
      .set({ updatedAt: new Date() })
      .where(eq(decks.id, existingCard.deckId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting flashcard:', error)
    return NextResponse.json(
      { error: 'Failed to delete flashcard' },
      { status: 500 }
    )
  }
}
