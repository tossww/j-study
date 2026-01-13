import { NextRequest, NextResponse } from 'next/server'
import { db, flashcards } from '@/db'
import { eq } from 'drizzle-orm'

// POST /api/study - Update flashcard after study
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cardId, correct } = body

    if (typeof cardId !== 'number' || typeof correct !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Get current card state
    const [card] = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.id, cardId))

    if (!card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      )
    }

    // Simple SM-2 spaced repetition algorithm
    let { easeFactor, interval, repetitions } = card

    if (correct) {
      // Increase repetitions and calculate new interval
      repetitions += 1
      if (repetitions === 1) {
        interval = 1
      } else if (repetitions === 2) {
        interval = 6
      } else {
        interval = Math.round(interval * (easeFactor / 100))
      }
      // Increase ease factor slightly
      easeFactor = Math.min(easeFactor + 15, 300)
    } else {
      // Reset on incorrect
      repetitions = 0
      interval = 0
      // Decrease ease factor
      easeFactor = Math.max(easeFactor - 20, 130)
    }

    // Calculate next review date
    const nextReviewAt = new Date()
    nextReviewAt.setDate(nextReviewAt.getDate() + interval)

    // Update the card
    await db
      .update(flashcards)
      .set({
        easeFactor,
        interval,
        repetitions,
        nextReviewAt,
        timesCorrect: correct ? card.timesCorrect + 1 : card.timesCorrect,
        timesIncorrect: correct ? card.timesIncorrect : card.timesIncorrect + 1,
        updatedAt: new Date(),
      })
      .where(eq(flashcards.id, cardId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating study progress:', error)
    return NextResponse.json(
      { error: 'Failed to update study progress' },
      { status: 500 }
    )
  }
}
