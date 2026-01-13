import { NextResponse } from 'next/server'
import { db, decks, flashcards } from '@/db'
import { desc, eq, sql } from 'drizzle-orm'

// GET /api/decks - Get all decks with card counts and accuracy stats
export async function GET() {
  try {
    const allDecks = await db
      .select({
        id: decks.id,
        name: decks.name,
        description: decks.description,
        sourceFileName: decks.sourceFileName,
        createdAt: decks.createdAt,
        updatedAt: decks.updatedAt,
        cardCount: sql<number>`count(${flashcards.id})::int`,
        totalCorrect: sql<number>`coalesce(sum(${flashcards.timesCorrect}), 0)::int`,
        totalIncorrect: sql<number>`coalesce(sum(${flashcards.timesIncorrect}), 0)::int`,
      })
      .from(decks)
      .leftJoin(flashcards, eq(decks.id, flashcards.deckId))
      .groupBy(decks.id)
      .orderBy(desc(decks.updatedAt))

    // Calculate accuracy percentage for each deck
    const decksWithAccuracy = allDecks.map(deck => {
      const total = deck.totalCorrect + deck.totalIncorrect
      const accuracy = total > 0 ? Math.round((deck.totalCorrect / total) * 100) : null
      return {
        ...deck,
        accuracy,
        totalAttempts: total,
      }
    })

    return NextResponse.json(decksWithAccuracy)
  } catch (error) {
    console.error('Error fetching decks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch decks' },
      { status: 500 }
    )
  }
}
