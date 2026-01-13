import { NextRequest, NextResponse } from 'next/server'
import { db, decks } from '@/db'
import { eq } from 'drizzle-orm'

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
