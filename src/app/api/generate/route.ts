import { NextRequest, NextResponse } from 'next/server'
import { db, decks, flashcards } from '@/db'
import { eq, inArray, and, or, isNull } from 'drizzle-orm'
import { smartCardOperations, generateFromInstructions, ExistingCardSummary, ExistingCard } from '@/lib/anthropic'
import { auth } from '@/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { deckId, deckName, instructions, customPrompt } = body

    if (!instructions?.trim()) {
      return NextResponse.json({ error: 'Instructions required' }, { status: 400 })
    }

    // For existing decks, use smart operations
    if (deckId) {
      const [deck] = await db.select().from(decks).where(and(
        eq(decks.id, deckId),
        or(eq(decks.userId, session.user.id), isNull(decks.userId))
      ))
      if (!deck) {
        return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
      }

      // Get all existing cards with IDs
      const existingCards: ExistingCard[] = await db
        .select({ id: flashcards.id, front: flashcards.front, back: flashcards.back })
        .from(flashcards)
        .where(eq(flashcards.deckId, deckId))

      // Use smart operations for existing decks
      const result = await smartCardOperations(
        instructions,
        existingCards,
        deck.name,
        customPrompt || undefined
      )

      // If AI says it can't do something, return that message
      if (result.cannotDo && result.operations.length === 0) {
        return NextResponse.json({
          success: true,
          cannotDo: result.cannotDo,
          summary: result.summary,
          suggestedDeckName: result.suggestedDeckName,
          operations: { added: [], updated: [], deleted: [] },
          totalCards: existingCards.length,
        })
      }

      // Process operations
      const added: { front: string; back: string; reason?: string }[] = []
      const updated: { id: number; front: string; back: string; reason?: string }[] = []
      const deleted: { id: number; front: string; reason?: string }[] = []

      for (const op of result.operations) {
        if (op.operation === 'add' && op.front && op.back) {
          const [newCard] = await db.insert(flashcards).values({
            deckId,
            front: op.front,
            back: op.back,
          }).returning()
          added.push({ front: op.front, back: op.back, reason: op.reason })
        } else if (op.operation === 'update' && op.cardId && op.front && op.back) {
          await db.update(flashcards)
            .set({ front: op.front, back: op.back })
            .where(eq(flashcards.id, op.cardId))
          updated.push({ id: op.cardId, front: op.front, back: op.back, reason: op.reason })
        } else if (op.operation === 'delete' && op.cardId) {
          const cardToDelete = existingCards.find(c => c.id === op.cardId)
          if (cardToDelete) {
            await db.delete(flashcards).where(eq(flashcards.id, op.cardId))
            deleted.push({ id: op.cardId, front: cardToDelete.front, reason: op.reason })
          }
        }
      }

      // Get updated total count
      const allCards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.deckId, deckId))

      return NextResponse.json({
        success: true,
        summary: result.summary,
        suggestedDeckName: result.suggestedDeckName,
        cannotDo: result.cannotDo,
        operations: { added, updated, deleted },
        totalCards: allCards.length,
      })
    }

    // For new decks, use the simpler generation flow
    const result = await generateFromInstructions(
      instructions,
      undefined,
      15,
      customPrompt || undefined,
      undefined
    )

    if (result.flashcards.length === 0) {
      return NextResponse.json(
        { error: 'No flashcards could be generated from these instructions' },
        { status: 400 }
      )
    }

    // Create new deck
    const finalName = deckName?.trim() || result.deckName?.trim() || 'New Deck'
    const [newDeck] = await db.insert(decks).values({
      name: finalName,
      description: `Generated from: "${instructions.trim().slice(0, 100)}${instructions.length > 100 ? '...' : ''}"`,
      userId: session.user.id,
    }).returning()

    // Insert flashcards
    const cardValues = result.flashcards.map(card => ({
      deckId: newDeck.id,
      front: card.front,
      back: card.back,
    }))
    await db.insert(flashcards).values(cardValues)

    return NextResponse.json({
      success: true,
      deck: newDeck,
      isNewDeck: true,
      summary: result.summary,
      operations: {
        added: result.flashcards.map(c => ({ front: c.front, back: c.back })),
        updated: [],
        deleted: [],
      },
      totalCards: result.flashcards.length,
    })
  } catch (error) {
    console.error('Generate error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to process request', details: errorMessage },
      { status: 500 }
    )
  }
}
