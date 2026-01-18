import { NextRequest, NextResponse } from 'next/server'
import { db, flashcards, decks } from '@/db'
import { eq, asc, and, or, isNull } from 'drizzle-orm'
import { auth } from '@/auth'

// GET /api/flashcards/[deckId] - Get all flashcards for a deck
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deckId: deckIdStr } = await params
    const deckId = parseInt(deckIdStr)

    if (isNaN(deckId)) {
      return NextResponse.json(
        { error: 'Invalid deck ID' },
        { status: 400 }
      )
    }

    // Verify deck belongs to user
    const [deck] = await db
      .select()
      .from(decks)
      .where(and(
        eq(decks.id, deckId),
        or(eq(decks.userId, session.user.id), isNull(decks.userId))
      ))

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
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

// POST /api/flashcards/[deckId] - Add a new flashcard to a deck
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deckId: deckIdStr } = await params
    const deckId = parseInt(deckIdStr)

    if (isNaN(deckId)) {
      return NextResponse.json(
        { error: 'Invalid deck ID' },
        { status: 400 }
      )
    }

    // Check if deck exists and belongs to user
    const [deck] = await db
      .select()
      .from(decks)
      .where(and(
        eq(decks.id, deckId),
        or(eq(decks.userId, session.user.id), isNull(decks.userId))
      ))

    if (!deck) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { front, back } = body

    if (!front || typeof front !== 'string' || front.trim().length === 0) {
      return NextResponse.json(
        { error: 'Front (question) is required' },
        { status: 400 }
      )
    }

    if (!back || typeof back !== 'string' || back.trim().length === 0) {
      return NextResponse.json(
        { error: 'Back (answer) is required' },
        { status: 400 }
      )
    }

    // Create new flashcard
    const [newCard] = await db
      .insert(flashcards)
      .values({
        deckId,
        front: front.trim(),
        back: back.trim(),
      })
      .returning()

    // Update deck's updatedAt
    await db
      .update(decks)
      .set({ updatedAt: new Date() })
      .where(eq(decks.id, deckId))

    return NextResponse.json(newCard, { status: 201 })
  } catch (error) {
    console.error('Error creating flashcard:', error)
    return NextResponse.json(
      { error: 'Failed to create flashcard' },
      { status: 500 }
    )
  }
}
