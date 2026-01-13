import { NextRequest, NextResponse } from 'next/server'
import { db, decks, flashcards } from '@/db'
import { eq } from 'drizzle-orm'
import { generateFromInstructions, ExistingCardSummary } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deckId, deckName, instructions, customPrompt } = body

    if (!instructions?.trim()) {
      return NextResponse.json({ error: 'Instructions required' }, { status: 400 })
    }

    let existingDeck = null
    let existingCardSummary: ExistingCardSummary | undefined

    // If deckId provided, fetch existing deck and cards for context
    if (deckId) {
      const [deck] = await db.select().from(decks).where(eq(decks.id, deckId))
      if (!deck) {
        return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
      }
      existingDeck = deck

      // Get existing cards for context
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
    }

    // Generate flashcards from instructions
    const result = await generateFromInstructions(
      instructions,
      existingCardSummary,
      deckId ? 10 : 15, // More cards for new decks
      customPrompt || undefined
    )

    if (result.flashcards.length === 0) {
      return NextResponse.json(
        { error: 'No flashcards could be generated from these instructions' },
        { status: 400 }
      )
    }

    // Create or use existing deck
    let targetDeck
    if (existingDeck) {
      targetDeck = existingDeck
    } else {
      // Create new deck - derive name from instructions if not provided
      const derivedName = deckName?.trim() ||
        instructions.trim().slice(0, 50).replace(/[^\w\s]/g, '').trim() ||
        'New Deck'

      const [newDeck] = await db.insert(decks).values({
        name: derivedName,
        description: `Generated from: "${instructions.trim().slice(0, 100)}${instructions.length > 100 ? '...' : ''}"`,
      }).returning()
      targetDeck = newDeck
    }

    // Insert new flashcards
    const cardValues = result.flashcards.map(card => ({
      deckId: targetDeck.id,
      front: card.front,
      back: card.back,
    }))

    await db.insert(flashcards).values(cardValues)

    // Get total card count
    const allCards = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.deckId, targetDeck.id))

    return NextResponse.json({
      success: true,
      deck: targetDeck,
      cardsCreated: result.flashcards.length,
      totalCards: allCards.length,
      isNewDeck: !existingDeck,
    })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { error: 'Failed to generate flashcards' },
      { status: 500 }
    )
  }
}
