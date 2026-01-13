import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { db, decks, flashcards } from '@/db'
import { parseFileFromBuffer } from '@/lib/file-parser'
import { generateFlashcards } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const deckName = formData.get('deckName') as string | null

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

    // Upload file to Vercel Blob for storage
    const blob = await put(file.name, file, {
      access: 'public',
    })

    // Parse the file content
    const buffer = Buffer.from(await file.arrayBuffer())
    const content = await parseFileFromBuffer(buffer, file.name)

    if (!content.trim()) {
      return NextResponse.json(
        { error: 'Could not extract text from file' },
        { status: 400 }
      )
    }

    // Generate flashcards using Claude
    const generatedCards = await generateFlashcards(content)

    if (generatedCards.length === 0) {
      return NextResponse.json(
        { error: 'No flashcards could be generated from this content' },
        { status: 400 }
      )
    }

    // Create deck in database
    const [newDeck] = await db.insert(decks).values({
      name: deckName || file.name.replace(/\.[^/.]+$/, ''),
      description: `Generated from ${file.name}`,
      sourceFileName: file.name,
    }).returning()

    // Insert flashcards
    const cardValues = generatedCards.map(card => ({
      deckId: newDeck.id,
      front: card.front,
      back: card.back,
    }))

    await db.insert(flashcards).values(cardValues)

    return NextResponse.json({
      success: true,
      deck: newDeck,
      cardsCreated: generatedCards.length,
      blobUrl: blob.url,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    )
  }
}
