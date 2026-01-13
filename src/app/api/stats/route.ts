import { NextResponse } from 'next/server'
import { db, flashcards } from '@/db'
import { sql } from 'drizzle-orm'

// GET /api/stats - Get study statistics including streak
export async function GET() {
  try {
    // Get all study days (days when cards were reviewed)
    // Based on flashcard updatedAt when timesCorrect or timesIncorrect > 0
    const studyDays = await db
      .select({
        studyDate: sql<string>`DATE(${flashcards.updatedAt})`.as('study_date'),
      })
      .from(flashcards)
      .where(sql`${flashcards.timesCorrect} + ${flashcards.timesIncorrect} > 0`)
      .groupBy(sql`DATE(${flashcards.updatedAt})`)
      .orderBy(sql`DATE(${flashcards.updatedAt}) DESC`)

    // Calculate streak
    const streak = calculateStreak(studyDays.map(d => d.studyDate))

    // Get total stats
    const [totals] = await db
      .select({
        totalCards: sql<number>`count(*)::int`,
        totalCorrect: sql<number>`coalesce(sum(${flashcards.timesCorrect}), 0)::int`,
        totalIncorrect: sql<number>`coalesce(sum(${flashcards.timesIncorrect}), 0)::int`,
        cardsStudied: sql<number>`count(*) filter (where ${flashcards.timesCorrect} + ${flashcards.timesIncorrect} > 0)::int`,
      })
      .from(flashcards)

    const totalAttempts = totals.totalCorrect + totals.totalIncorrect
    const overallAccuracy = totalAttempts > 0
      ? Math.round((totals.totalCorrect / totalAttempts) * 100)
      : null

    return NextResponse.json({
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
