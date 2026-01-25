import { NextResponse } from 'next/server'
import { db } from '@/db'
import { decks, flashcards } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sourceDeckIds, targetDeckId, newDeckName } = body as {
      sourceDeckIds: number[]
      targetDeckId?: number
      newDeckName?: string
    }

    if (!sourceDeckIds || sourceDeckIds.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 decks to merge' }, { status: 400 })
    }

    if (!targetDeckId && !newDeckName) {
      return NextResponse.json({ error: 'Must specify target deck or new deck name' }, { status: 400 })
    }

    let finalDeckId: number

    if (targetDeckId) {
      // Merging into existing deck
      finalDeckId = targetDeckId

      // Verify target deck exists
      const targetDeck = await db.select().from(decks).where(eq(decks.id, targetDeckId)).limit(1)
      if (targetDeck.length === 0) {
        return NextResponse.json({ error: 'Target deck not found' }, { status: 404 })
      }
    } else {
      // Create new deck
      const [newDeck] = await db.insert(decks).values({
        name: newDeckName!,
        description: `Merged from ${sourceDeckIds.length} decks`,
      }).returning()

      finalDeckId = newDeck.id
    }

    // Get all source deck IDs except the target (if merging into existing)
    const deckIdsToMergeFrom = sourceDeckIds.filter(id => id !== finalDeckId)

    // Move all flashcards from source decks to target deck
    const movedCards = await db.update(flashcards)
      .set({ deckId: finalDeckId })
      .where(inArray(flashcards.deckId, deckIdsToMergeFrom))
      .returning()

    // Delete source decks (cards already moved)
    await db.delete(decks).where(inArray(decks.id, deckIdsToMergeFrom))

    // Get final deck info
    const [finalDeck] = await db.select().from(decks).where(eq(decks.id, finalDeckId))

    return NextResponse.json({
      deck: finalDeck,
      cardsMoved: movedCards.length,
      decksDeleted: deckIdsToMergeFrom.length,
    })
  } catch (error) {
    console.error('Error merging decks:', error)
    return NextResponse.json({ error: 'Failed to merge decks' }, { status: 500 })
  }
}
