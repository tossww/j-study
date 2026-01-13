import { NextResponse } from 'next/server'
import { db, decks, flashcards } from '@/db'
import { desc, eq, sql } from 'drizzle-orm'

// GET /api/decks - Get all decks with card counts
export async function GET() {
  try {
    const allDecks = await db
      .select({
        id: decks.id,
        name: decks.name,
        description: decks.description,
        sourceFileName: decks.sourceFileName,
        createdAt: decks.createdAt,
        cardCount: sql<number>`count(${flashcards.id})::int`,
      })
      .from(decks)
      .leftJoin(flashcards, eq(decks.id, flashcards.deckId))
      .groupBy(decks.id)
      .orderBy(desc(decks.createdAt))

    return NextResponse.json(allDecks)
  } catch (error) {
    console.error('Error fetching decks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch decks' },
      { status: 500 }
    )
  }
}
