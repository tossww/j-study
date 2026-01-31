import { NextRequest, NextResponse } from 'next/server'
import { db, savedQuizzes } from '@/db'
import { eq, desc } from 'drizzle-orm'
import { auth } from '@/auth'

// GET - List saved quizzes
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const quizzes = await db
      .select()
      .from(savedQuizzes)
      .where(eq(savedQuizzes.userId, session.user.id))
      .orderBy(desc(savedQuizzes.lastTakenAt), desc(savedQuizzes.createdAt))

    return NextResponse.json(quizzes.map(q => ({
      ...q,
      questions: JSON.parse(q.questions),
      deckIds: q.deckIds ? JSON.parse(q.deckIds) : null,
    })))
  } catch (error) {
    console.error('Error fetching quizzes:', error)
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 })
  }
}

// POST - Save a quiz
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, sourceType, sourceName, deckIds, questions, customInstructions, score } = body

    const [quiz] = await db.insert(savedQuizzes).values({
      userId: session.user.id,
      title,
      sourceType,
      sourceName,
      deckIds: deckIds ? JSON.stringify(deckIds) : null,
      questions: JSON.stringify(questions),
      customInstructions,
      lastScore: score,
      timesTaken: 1,
      lastTakenAt: new Date(),
    }).returning()

    return NextResponse.json({ success: true, quiz })
  } catch (error) {
    console.error('Error saving quiz:', error)
    return NextResponse.json({ error: 'Failed to save quiz' }, { status: 500 })
  }
}
