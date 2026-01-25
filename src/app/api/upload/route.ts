import { NextRequest, NextResponse } from 'next/server'
import { db, decks, flashcards, referenceFiles } from '@/db'
import { eq, and, or, isNull } from 'drizzle-orm'
import { parseFileFromBuffer } from '@/lib/file-parser'
import { analyzeAndGenerateFlashcards, analyzeImageAndGenerateFlashcards, ExistingCardSummary, ImageMimeType } from '@/lib/anthropic'
import { put } from '@vercel/blob'
import { auth } from '@/auth'
import sharp from 'sharp'
import heicDecode from 'heic-decode'
import jpeg from 'jpeg-js'

// Image MIME types we support (after conversion)
const IMAGE_MIME_TYPES: Record<string, ImageMimeType> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

// HEIF/HEIC types that need conversion
const HEIF_TYPES = ['.heic', '.heif']

function isImageFile(fileName: string): boolean {
  const ext = '.' + fileName.split('.').pop()?.toLowerCase()
  return ext in IMAGE_MIME_TYPES || HEIF_TYPES.includes(ext)
}

function isHeifFile(fileName: string): boolean {
  const ext = '.' + fileName.split('.').pop()?.toLowerCase()
  return HEIF_TYPES.includes(ext)
}

function getImageMimeType(fileName: string): ImageMimeType | null {
  const ext = '.' + fileName.split('.').pop()?.toLowerCase()
  return IMAGE_MIME_TYPES[ext] || null
}

async function convertHeifToJpeg(buffer: Buffer): Promise<Buffer> {
  // Use heic-decode to decode HEIC, then jpeg-js to encode as JPEG
  const { width, height, data } = await heicDecode({ buffer })
  const jpegData = jpeg.encode({ width, height, data: Buffer.from(data) }, 90)
  return jpegData.data
}

const MAX_IMAGE_SIZE = 4.5 * 1024 * 1024 // 4.5MB to leave some margin under 5MB limit

async function compressImageIfNeeded(buffer: Buffer, mimeType: ImageMimeType): Promise<{ buffer: Buffer; mimeType: ImageMimeType }> {
  // If already under limit, return as-is
  if (buffer.length <= MAX_IMAGE_SIZE) {
    return { buffer, mimeType }
  }

  // Calculate how much we need to shrink
  const ratio = Math.sqrt(MAX_IMAGE_SIZE / buffer.length)

  let sharpInstance = sharp(buffer)
  const metadata = await sharpInstance.metadata()

  if (metadata.width && metadata.height) {
    const newWidth = Math.floor(metadata.width * ratio)
    const newHeight = Math.floor(metadata.height * ratio)
    sharpInstance = sharpInstance.resize(newWidth, newHeight, { fit: 'inside' })
  }

  // Convert to JPEG with quality reduction for better compression
  const compressed = await sharpInstance
    .jpeg({ quality: 80 })
    .toBuffer()

  // If still too large, try more aggressive compression
  if (compressed.length > MAX_IMAGE_SIZE) {
    const moreCompressed = await sharp(buffer)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 60 })
      .toBuffer()
    return { buffer: moreCompressed, mimeType: 'image/jpeg' }
  }

  return { buffer: compressed, mimeType: 'image/jpeg' }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const deckName = formData.get('deckName') as string | null
    const deckIdStr = formData.get('deckId') as string | null
    const generateAnswers = formData.get('generateAnswers') === 'true'
    const additionalInstructions = formData.get('additionalInstructions') as string | null
    const customPrompt = formData.get('customPrompt') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const validTextTypes = ['.pdf', '.txt', '.md', '.markdown']
    const validImageTypes = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.heic', '.heif']
    const fileName = file.name.toLowerCase()
    const isValidTextType = validTextTypes.some(ext => fileName.endsWith(ext))
    const isValidImageType = validImageTypes.some(ext => fileName.endsWith(ext))

    if (!isValidTextType && !isValidImageType) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: PDF, TXT, MD, PNG, JPG, GIF, WEBP, HEIC' },
        { status: 400 }
      )
    }

    // Get file buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Check if it's an image file
    const isImage = isImageFile(file.name)
    let content = ''

    if (!isImage) {
      // Parse text content for non-image files
      content = await parseFileFromBuffer(buffer, file.name)

      if (!content.trim()) {
        return NextResponse.json(
          { error: 'Could not extract text from file' },
          { status: 400 }
        )
      }
    }

    // Check if adding to existing deck
    let existingCardSummary: ExistingCardSummary | undefined
    let existingDeck = null
    const deckId = deckIdStr ? parseInt(deckIdStr) : null

    if (deckId) {
      // Fetch existing deck and cards (verify ownership)
      const [deck] = await db.select().from(decks).where(and(
        eq(decks.id, deckId),
        or(eq(decks.userId, session.user.id), isNull(decks.userId))
      ))
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
    let result
    if (isImage) {
      // Convert HEIF/HEIC to JPEG if needed
      let imageBuffer: Buffer = buffer
      let mimeType: ImageMimeType

      if (isHeifFile(file.name)) {
        imageBuffer = await convertHeifToJpeg(buffer) as Buffer
        mimeType = 'image/jpeg'
      } else {
        const detectedMime = getImageMimeType(file.name)
        if (!detectedMime) {
          return NextResponse.json(
            { error: 'Unsupported image type' },
            { status: 400 }
          )
        }
        mimeType = detectedMime
      }

      // Compress image if it exceeds 4.5MB (Anthropic limit is 5MB)
      const compressed = await compressImageIfNeeded(imageBuffer, mimeType)
      imageBuffer = compressed.buffer
      mimeType = compressed.mimeType

      result = await analyzeImageAndGenerateFlashcards(
        imageBuffer,
        mimeType,
        existingCardSummary,
        200,  // High card limit with Opus
        additionalInstructions || undefined,
        customPrompt || undefined
      )
    } else {
      // Use text analysis for documents
      result = await analyzeAndGenerateFlashcards(
        content,
        existingCardSummary,
        generateAnswers,
        200,  // High card limit with Opus
        additionalInstructions || undefined,
        customPrompt || undefined
      )
    }

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
        originalPrompt: additionalInstructions || null,
        sourceFileName: file.name,
        analysis: analysisJson,
        userId: session.user.id,
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

    // Upload file to Vercel Blob for reference
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
    let fileType: string
    if (isImage) {
      fileType = 'image'
    } else if (fileExtension === 'pdf') {
      fileType = 'pdf'
    } else if (fileExtension === 'md' || fileExtension === 'markdown') {
      fileType = 'md'
    } else {
      fileType = 'txt'
    }

    try {
      const blob = await put(`reference/${targetDeck.id}/${Date.now()}-${file.name}`, buffer, {
        access: 'public',
      })

      await db.insert(referenceFiles).values({
        deckId: targetDeck.id,
        fileName: file.name,
        blobUrl: blob.url,
        fileType: fileType,
        fileSize: buffer.length,
      })
    } catch (blobError) {
      // Log but don't fail - flashcards were created successfully
      console.error('Failed to upload reference file to Blob:', blobError)
    }

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
