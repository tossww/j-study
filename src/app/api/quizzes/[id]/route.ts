import { NextRequest, NextResponse } from 'next/server'
import { db, savedQuizzes } from '@/db'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/auth'

// GET - Get a specific quiz
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const quizId = parseInt(id, 10)

    const [quiz] = await db
      .select()
      .from(savedQuizzes)
      .where(and(
        eq(savedQuizzes.id, quizId),
        eq(savedQuizzes.userId, session.user.id)
      ))

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...quiz,
      questions: JSON.parse(quiz.questions),
      deckIds: quiz.deckIds ? JSON.parse(quiz.deckIds) : null,
    })
  } catch (error) {
    console.error('Error fetching quiz:', error)
    return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 })
  }
}

// PATCH - Update quiz (record new score)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const quizId = parseInt(id, 10)
    const body = await request.json()
    const { score } = body

    const [quiz] = await db
      .select()
      .from(savedQuizzes)
      .where(and(
        eq(savedQuizzes.id, quizId),
        eq(savedQuizzes.userId, session.user.id)
      ))

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    await db.update(savedQuizzes)
      .set({
        lastScore: score,
        timesTaken: quiz.timesTaken + 1,
        lastTakenAt: new Date(),
      })
      .where(eq(savedQuizzes.id, quizId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating quiz:', error)
    return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 })
  }
}

// DELETE - Delete a quiz
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const quizId = parseInt(id, 10)

    await db.delete(savedQuizzes)
      .where(and(
        eq(savedQuizzes.id, quizId),
        eq(savedQuizzes.userId, session.user.id)
      ))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting quiz:', error)
    return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 })
  }
}
