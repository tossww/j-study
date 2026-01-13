import { NextRequest, NextResponse } from 'next/server'
import { db, decks, flashcards } from '@/db'
import { eq } from 'drizzle-orm'
import { parseFileFromBuffer } from '@/lib/file-parser'
import { analyzeAndGenerateFlashcards, ExistingCardSummary } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const deckName = formData.get('deckName') as string | null
    const deckIdStr = formData.get('deckId') as string | null
    const generateAnswers = formData.get('generateAnswers') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['.pdf', '.txt', '.md', '.markdown']
    const fileName = file.name.toLowerCase()
    const isValidType = validTypes.some(ext => fileName.endsWith(ext))

    if (!isValidType) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: PDF, TXT, MD' },
        { status: 400 }
      )
    }

    // Parse the file content
    const buffer = Buffer.from(await file.arrayBuffer())
    const content = await parseFileFromBuffer(buffer, file.name)

    if (!content.trim()) {
      return NextResponse.json(
        { error: 'Could not extract text from file' },
        { status: 400 }
      )
    }

    // Check if adding to existing deck
    let existingCardSummary: ExistingCardSummary | undefined
    let existingDeck = null
    const deckId = deckIdStr ? parseInt(deckIdStr) : null

    if (deckId) {
      // Fetch existing deck and cards
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
        // Extract topics from existing cards (simplified: use first few words of questions)
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

    // Analyze content and generate flashcards
    const result = await analyzeAndGenerateFlashcards(
      content,
      existingCardSummary,
      generateAnswers
    )

    if (result.flashcards.length === 0) {
      return NextResponse.json(
        { error: 'No flashcards could be generated from this content' },
        { status: 400 }
      )
    }

    // Create or update deck
    let targetDeck
    const analysisJson = JSON.stringify(result.analysis)

    if (existingDeck) {
      // Update existing deck with new analysis
      const [updated] = await db
        .update(decks)
        .set({
          analysis: analysisJson,
          updatedAt: new Date(),
        })
        .where(eq(decks.id, existingDeck.id))
        .returning()
      targetDeck = updated
    } else {
      // Create new deck
      const [newDeck] = await db.insert(decks).values({
        name: deckName || file.name.replace(/\.[^/.]+$/, ''),
        description: `Generated from ${file.name}`,
        sourceFileName: file.name,
        analysis: analysisJson,
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
      analysis: result.analysis,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    )
  }
}
