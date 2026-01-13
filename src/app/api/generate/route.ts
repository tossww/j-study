import { NextRequest, NextResponse } from 'next/server'
import { db, decks, flashcards } from '@/db'
import { eq } from 'drizzle-orm'
import { generateFromInstructions, ExistingCardSummary } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deckId, instructions, customPrompt } = body

    if (!deckId) {
      return NextResponse.json({ error: 'Deck ID required' }, { status: 400 })
    }

    if (!instructions?.trim()) {
      return NextResponse.json({ error: 'Instructions required' }, { status: 400 })
    }

    // Fetch existing deck
    const [deck] = await db.select().from(decks).where(eq(decks.id, deckId))
    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
    }

    // Get existing cards for context
    let existingCardSummary: ExistingCardSummary | undefined
    const existingCards = await db
      .select({ front: flashcards.front, back: flashcards.back })
      .from(flashcards)
      .where(eq(flashcards.deckId, deckId))

    if (existingCards.length > 0) {
      const topics = [...new Set(
        existingCards.map(c => {
          const words = c.front.split(' ').slice(0, 4).join(' ')
          return words.replace(/[?.,!]/g, '')
        })
      )].slice(0, 10)

      existingCardSummary = {
        topics,
        sampleCards: existingCards.slice(0, 5),
        totalCount: existingCards.length,
      }
    }

    // Generate flashcards from instructions
    const result = await generateFromInstructions(
      instructions,
      existingCardSummary,
      10,
      customPrompt || undefined
    )

    if (result.flashcards.length === 0) {
      return NextResponse.json(
        { error: 'No flashcards could be generated from these instructions' },
        { status: 400 }
      )
    }

    // Insert new flashcards
    const cardValues = result.flashcards.map(card => ({
      deckId: deck.id,
      front: card.front,
      back: card.back,
    }))

    await db.insert(flashcards).values(cardValues)

    // Get total card count
    const allCards = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.deckId, deck.id))

    return NextResponse.json({
      success: true,
      cardsCreated: result.flashcards.length,
      totalCards: allCards.length,
    })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { error: 'Failed to generate flashcards' },
      { status: 500 }
    )
  }
}
