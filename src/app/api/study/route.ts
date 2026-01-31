import { NextRequest, NextResponse } from 'next/server'
import { db, flashcards, decks } from '@/db'
import { eq, and, or, isNull } from 'drizzle-orm'
import { auth } from '@/auth'

// SRS Grade types
type SRSGrade = 'again' | 'hard' | 'good' | 'easy'

// Learning steps in minutes
const LEARNING_STEPS = [1, 10] // 1 minute, 10 minutes
const GRADUATING_INTERVAL = 1 // First review interval after graduating (days)
const EASY_INTERVAL = 4 // Interval when pressing Easy on new/learning cards (days)

// Ease factor adjustments
const EASE_AGAIN = -20 // Decrease on Again
const EASE_HARD = -15 // Decrease on Hard
const EASE_GOOD = 0 // No change on Good
const EASE_EASY = 15 // Increase on Easy
const MIN_EASE = 130 // Minimum ease factor (1.3)
const MAX_EASE = 300 // Maximum ease factor (3.0)

// Interval multipliers for review cards
const HARD_MULTIPLIER = 1.2
const EASY_BONUS = 1.3

// POST /api/study - Update flashcard after study
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { cardId, grade, correct } = body

    // Support both new grade system and legacy correct boolean
    let srsGrade: SRSGrade
    if (grade) {
      srsGrade = grade as SRSGrade
    } else if (typeof correct === 'boolean') {
      // Legacy support: map boolean to grade
      srsGrade = correct ? 'good' : 'again'
    } else {
      return NextResponse.json(
        { error: 'Invalid request body - must provide grade or correct' },
        { status: 400 }
      )
    }

    if (typeof cardId !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request body - cardId must be a number' },
        { status: 400 }
      )
    }

    // Get current card state (verify it belongs to user's deck)
    const cardResult = await db
      .select({
        id: flashcards.id,
        easeFactor: flashcards.easeFactor,
        interval: flashcards.interval,
        repetitions: flashcards.repetitions,
        learningStep: flashcards.learningStep,
        timesCorrect: flashcards.timesCorrect,
        timesIncorrect: flashcards.timesIncorrect,
      })
      .from(flashcards)
      .innerJoin(decks, eq(flashcards.deckId, decks.id))
      .where(and(
        eq(flashcards.id, cardId),
        or(eq(decks.userId, session.user.id), isNull(decks.userId))
      ))

    const card = cardResult[0]

    if (!card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      )
    }

    // Calculate new SRS values based on grade
    const { newEaseFactor, newInterval, newRepetitions, newLearningStep, nextReviewAt, isCorrect } =
      calculateSRS(card, srsGrade)

    // Update the card
    await db
      .update(flashcards)
      .set({
        easeFactor: newEaseFactor,
        interval: newInterval,
        repetitions: newRepetitions,
        learningStep: newLearningStep,
        nextReviewAt,
        timesCorrect: isCorrect ? card.timesCorrect + 1 : card.timesCorrect,
        timesIncorrect: isCorrect ? card.timesIncorrect : card.timesIncorrect + 1,
        updatedAt: new Date(),
      })
      .where(eq(flashcards.id, cardId))

    return NextResponse.json({
      success: true,
      newInterval,
      learningStep: newLearningStep,
      nextReviewAt
    })
  } catch (error) {
    console.error('Error updating study progress:', error)
    return NextResponse.json(
      { error: 'Failed to update study progress' },
      { status: 500 }
    )
  }
}

interface CardState {
  easeFactor: number
  interval: number
  repetitions: number
  learningStep: number | null
}

interface SRSResult {
  newEaseFactor: number
  newInterval: number
  newRepetitions: number
  newLearningStep: number
  nextReviewAt: Date
  isCorrect: boolean
}

function calculateSRS(card: CardState, grade: SRSGrade): SRSResult {
  let { easeFactor, interval, repetitions } = card
  let learningStep = card.learningStep ?? 0
  const now = new Date()
  let nextReviewAt = new Date(now)
  let isCorrect = grade !== 'again'

  // Determine if card is in learning phase (step < 3) or review phase (step >= 3)
  const isLearning = learningStep < 3

  if (isLearning) {
    // ===== LEARNING PHASE =====
    switch (grade) {
      case 'again':
        // Reset to first learning step
        learningStep = 1
        nextReviewAt.setMinutes(now.getMinutes() + LEARNING_STEPS[0])
        break

      case 'hard':
        // Stay at current step, repeat after first step interval
        if (learningStep === 0) learningStep = 1
        nextReviewAt.setMinutes(now.getMinutes() + LEARNING_STEPS[0])
        break

      case 'good':
        // Advance to next learning step
        if (learningStep === 0) {
          // New card -> first learning step
          learningStep = 1
          nextReviewAt.setMinutes(now.getMinutes() + LEARNING_STEPS[0])
        } else if (learningStep === 1) {
          // First step -> second step
          learningStep = 2
          nextReviewAt.setMinutes(now.getMinutes() + LEARNING_STEPS[1])
        } else {
          // Second step -> graduate to review
          learningStep = 3
          interval = GRADUATING_INTERVAL
          repetitions = 1
          nextReviewAt.setDate(now.getDate() + interval)
        }
        break

      case 'easy':
        // Graduate immediately with easy interval
        learningStep = 3
        interval = EASY_INTERVAL
        repetitions = 1
        easeFactor = Math.min(easeFactor + EASE_EASY, MAX_EASE)
        nextReviewAt.setDate(now.getDate() + interval)
        break
    }
  } else {
    // ===== REVIEW PHASE =====
    const ef = easeFactor / 100

    switch (grade) {
      case 'again':
        // Lapse: reset to learning
        learningStep = 2 // Go to second learning step (10min)
        repetitions = 0
        easeFactor = Math.max(easeFactor + EASE_AGAIN, MIN_EASE)
        nextReviewAt.setMinutes(now.getMinutes() + LEARNING_STEPS[1])
        break

      case 'hard':
        // Increase interval slightly, decrease ease
        interval = Math.max(1, Math.round(interval * HARD_MULTIPLIER))
        easeFactor = Math.max(easeFactor + EASE_HARD, MIN_EASE)
        repetitions += 1
        nextReviewAt.setDate(now.getDate() + interval)
        break

      case 'good':
        // Normal interval increase
        interval = Math.max(1, Math.round(interval * ef))
        easeFactor = Math.max(easeFactor + EASE_GOOD, MIN_EASE)
        repetitions += 1
        nextReviewAt.setDate(now.getDate() + interval)
        break

      case 'easy':
        // Larger interval increase with bonus
        interval = Math.max(1, Math.round(interval * ef * EASY_BONUS))
        easeFactor = Math.min(easeFactor + EASE_EASY, MAX_EASE)
        repetitions += 1
        nextReviewAt.setDate(now.getDate() + interval)
        break
    }
  }

  return {
    newEaseFactor: easeFactor,
    newInterval: interval,
    newRepetitions: repetitions,
    newLearningStep: learningStep,
    nextReviewAt,
    isCorrect
  }
}
