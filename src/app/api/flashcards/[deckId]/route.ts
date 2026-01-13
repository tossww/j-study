import { NextRequest, NextResponse } from 'next/server'
import { db, flashcards } from '@/db'
import { eq, asc } from 'drizzle-orm'

// GET /api/flashcards/[deckId] - Get all flashcards for a deck
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

    const cards = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.deckId, deckId))
      .orderBy(asc(flashcards.nextReviewAt))

    return NextResponse.json(cards)
  } catch (error) {
    console.error('Error fetching flashcards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch flashcards' },
      { status: 500 }
    )
  }
}
