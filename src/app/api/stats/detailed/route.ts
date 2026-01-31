import { NextResponse } from 'next/server'
import { db, flashcards, decks, studySessions } from '@/db'
import { sql, eq, or, isNull, desc } from 'drizzle-orm'
import { auth } from '@/auth'

// GET /api/stats/detailed - Get detailed study statistics
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get card mastery breakdown (based on learningStep and interval)
    const masteryBreakdown = await db
      .select({
        status: sql<string>`
          CASE
            WHEN ${flashcards.learningStep} = 0 AND ${flashcards.repetitions} = 0 THEN 'new'
            WHEN ${flashcards.learningStep} < 3 THEN 'learning'
            WHEN ${flashcards.repetitions} <= 4 OR ${flashcards.interval} <= 14 THEN 'young'
            ELSE 'mature'
          END
        `.as('status'),
        count: sql<number>`count(*)::int`.as('count'),
      })
      .from(flashcards)
      .innerJoin(decks, eq(flashcards.deckId, decks.id))
      .where(or(eq(decks.userId, session.user.id), isNull(decks.userId)))
      .groupBy(sql`
        CASE
          WHEN ${flashcards.learningStep} = 0 AND ${flashcards.repetitions} = 0 THEN 'new'
          WHEN ${flashcards.learningStep} < 3 THEN 'learning'
          WHEN ${flashcards.repetitions} <= 4 OR ${flashcards.interval} <= 14 THEN 'young'
          ELSE 'mature'
        END
      `)

    // Get study activity for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailyActivity = await db
      .select({
        date: sql<string>`DATE(${flashcards.updatedAt})`.as('date'),
        cardsStudied: sql<number>`count(DISTINCT ${flashcards.id})::int`.as('cards_studied'),
        correct: sql<number>`sum(CASE WHEN ${flashcards.timesCorrect} > 0 THEN 1 ELSE 0 END)::int`.as('correct'),
      })
      .from(flashcards)
      .innerJoin(decks, eq(flashcards.deckId, decks.id))
      .where(sql`
        ${flashcards.updatedAt} >= ${thirtyDaysAgo.toISOString()}
        AND (${flashcards.timesCorrect} + ${flashcards.timesIncorrect}) > 0
        AND (${decks.userId} = ${session.user.id} OR ${decks.userId} IS NULL)
      `)
      .groupBy(sql`DATE(${flashcards.updatedAt})`)
      .orderBy(sql`DATE(${flashcards.updatedAt})`)

    // Get deck performance
    const deckPerformance = await db
      .select({
        id: decks.id,
        name: decks.name,
        cardCount: sql<number>`count(${flashcards.id})::int`.as('card_count'),
        studied: sql<number>`count(*) filter (where ${flashcards.timesCorrect} + ${flashcards.timesIncorrect} > 0)::int`.as('studied'),
        correct: sql<number>`coalesce(sum(${flashcards.timesCorrect}), 0)::int`.as('correct'),
        incorrect: sql<number>`coalesce(sum(${flashcards.timesIncorrect}), 0)::int`.as('incorrect'),
        avgInterval: sql<number>`coalesce(avg(${flashcards.interval}), 0)::int`.as('avg_interval'),
      })
      .from(decks)
      .leftJoin(flashcards, eq(decks.id, flashcards.deckId))
      .where(or(eq(decks.userId, session.user.id), isNull(decks.userId)))
      .groupBy(decks.id, decks.name)
      .orderBy(desc(sql`count(*) filter (where ${flashcards.timesCorrect} + ${flashcards.timesIncorrect} > 0)`))

    // Calculate deck accuracies
    const decksWithAccuracy = deckPerformance.map(deck => {
      const total = deck.correct + deck.incorrect
      return {
        ...deck,
        accuracy: total > 0 ? Math.round((deck.correct / total) * 100) : null,
        needsWork: total > 0 && (deck.correct / total) < 0.7,
      }
    })

    // Get cards due today
    const now = new Date()
    const cardsDue = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(flashcards)
      .innerJoin(decks, eq(flashcards.deckId, decks.id))
      .where(sql`
        ${flashcards.nextReviewAt} <= ${now.toISOString()}
        AND (${decks.userId} = ${session.user.id} OR ${decks.userId} IS NULL)
      `)

    // Get upcoming reviews (next 7 days)
    const upcomingReviews = await db
      .select({
        date: sql<string>`DATE(${flashcards.nextReviewAt})`.as('date'),
        count: sql<number>`count(*)::int`.as('count'),
      })
      .from(flashcards)
      .innerJoin(decks, eq(flashcards.deckId, decks.id))
      .where(sql`
        ${flashcards.nextReviewAt} > ${now.toISOString()}
        AND ${flashcards.nextReviewAt} <= ${new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()}
        AND (${decks.userId} = ${session.user.id} OR ${decks.userId} IS NULL)
      `)
      .groupBy(sql`DATE(${flashcards.nextReviewAt})`)
      .orderBy(sql`DATE(${flashcards.nextReviewAt})`)

    return NextResponse.json({
      mastery: masteryBreakdown.reduce((acc, item) => {
        acc[item.status] = item.count
        return acc
      }, {} as Record<string, number>),
      dailyActivity,
      deckPerformance: decksWithAccuracy,
      cardsDueToday: cardsDue[0]?.count || 0,
      upcomingReviews,
    })
  } catch (error) {
    console.error('Error fetching detailed stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch detailed stats' },
      { status: 500 }
    )
  }
}
