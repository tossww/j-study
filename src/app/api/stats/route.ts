import { NextResponse } from 'next/server'
import { db, flashcards, decks } from '@/db'
import { sql, eq, or, isNull } from 'drizzle-orm'
import { auth } from '@/auth'

// GET /api/stats - Get study statistics including streak
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all study days (days when cards were reviewed) for user's decks
    const studyDays = await db
      .select({
        studyDate: sql<string>`DATE(${flashcards.updatedAt})`.as('study_date'),
      })
      .from(flashcards)
      .innerJoin(decks, eq(flashcards.deckId, decks.id))
      .where(sql`${flashcards.timesCorrect} + ${flashcards.timesIncorrect} > 0 AND (${decks.userId} = ${session.user.id} OR ${decks.userId} IS NULL)`)
      .groupBy(sql`DATE(${flashcards.updatedAt})`)
      .orderBy(sql`DATE(${flashcards.updatedAt}) DESC`)

    // Calculate streak
    const streak = calculateStreak(studyDays.map(d => d.studyDate))

    // Get total stats (for user's decks)
    const [totals] = await db
      .select({
        totalCards: sql<number>`count(*)::int`,
        totalCorrect: sql<number>`coalesce(sum(${flashcards.timesCorrect}), 0)::int`,
        totalIncorrect: sql<number>`coalesce(sum(${flashcards.timesIncorrect}), 0)::int`,
        cardsStudied: sql<number>`count(*) filter (where ${flashcards.timesCorrect} + ${flashcards.timesIncorrect} > 0)::int`,
      })
      .from(flashcards)
      .innerJoin(decks, eq(flashcards.deckId, decks.id))
      .where(or(eq(decks.userId, session.user.id), isNull(decks.userId)))

    const totalAttempts = totals.totalCorrect + totals.totalIncorrect
    const overallAccuracy = totalAttempts > 0
      ? Math.round((totals.totalCorrect / totalAttempts) * 100)
      : null

    // Get cards due today
    const now = new Date()
    const [dueResult] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(flashcards)
      .innerJoin(decks, eq(flashcards.deckId, decks.id))
      .where(sql`
        ${flashcards.nextReviewAt} <= ${now.toISOString()}
        AND (${decks.userId} = ${session.user.id} OR ${decks.userId} IS NULL)
      `)

    return NextResponse.json({
      cardsDue: dueResult?.count || 0,
      streak,
      totalCards: totals.totalCards,
      cardsStudied: totals.cardsStudied,
      totalAttempts,
      overallAccuracy,
      studyDaysCount: studyDays.length,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Check if most recent study day is today or yesterday
  const mostRecent = new Date(dates[0])
  mostRecent.setHours(0, 0, 0, 0)

  // If last study wasn't today or yesterday, streak is 0
  if (mostRecent < yesterday) {
    return 0
  }

  // Count consecutive days
  let streak = 1
  let currentDate = mostRecent

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i])
    prevDate.setHours(0, 0, 0, 0)

    const expectedPrev = new Date(currentDate)
    expectedPrev.setDate(expectedPrev.getDate() - 1)

    if (prevDate.getTime() === expectedPrev.getTime()) {
      streak++
      currentDate = prevDate
    } else {
      break
    }
  }

  return streak
}
