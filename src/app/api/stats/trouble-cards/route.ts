import { NextResponse } from 'next/server'
import { db } from '@/db'
import { flashcards, decks } from '@/db/schema'
import { sql, desc, gt, and, eq, or, isNull } from 'drizzle-orm'
import { auth } from '@/auth'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get cards that have been attempted at least once and have errors
    // Sort by error rate (timesIncorrect / total attempts)
    const troubleCards = await db
      .select({
        id: flashcards.id,
        deckId: flashcards.deckId,
        front: flashcards.front,
        back: flashcards.back,
        timesCorrect: flashcards.timesCorrect,
        timesIncorrect: flashcards.timesIncorrect,
        deckName: decks.name,
        // SRS fields for Flashcard component
        repetitions: flashcards.repetitions,
        interval: flashcards.interval,
        easeFactor: flashcards.easeFactor,
        // Calculate error rate as a percentage
        errorRate: sql<number>`
          CASE
            WHEN (${flashcards.timesCorrect} + ${flashcards.timesIncorrect}) > 0
            THEN ROUND((${flashcards.timesIncorrect}::numeric / (${flashcards.timesCorrect} + ${flashcards.timesIncorrect})) * 100, 1)
            ELSE 0
          END
        `.as('error_rate'),
        totalAttempts: sql<number>`(${flashcards.timesCorrect} + ${flashcards.timesIncorrect})`.as('total_attempts'),
      })
      .from(flashcards)
      .innerJoin(decks, sql`${flashcards.deckId} = ${decks.id}`)
      .where(
        and(
          gt(flashcards.timesIncorrect, 0), // Must have at least one error
          gt(sql`(${flashcards.timesCorrect} + ${flashcards.timesIncorrect})`, 0), // Must have been attempted
          or(eq(decks.userId, session.user.id), isNull(decks.userId)) // User's decks only
        )
      )
      .orderBy(
        desc(sql`(${flashcards.timesIncorrect}::numeric / NULLIF(${flashcards.timesCorrect} + ${flashcards.timesIncorrect}, 0))`),
        desc(flashcards.timesIncorrect) // Secondary sort by total errors
      )
      .limit(limit)

    return NextResponse.json({
      success: true,
      cards: troubleCards,
      total: troubleCards.length,
    })
  } catch (error) {
    console.error('Error fetching trouble cards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trouble cards' },
      { status: 500 }
    )
  }
}
