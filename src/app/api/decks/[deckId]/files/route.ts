import { NextRequest, NextResponse } from 'next/server'
import { db, referenceFiles, decks } from '@/db'
import { eq, and, or, isNull } from 'drizzle-orm'
import { del } from '@vercel/blob'
import { auth } from '@/auth'

// GET /api/decks/[deckId]/files - List all reference files for a deck
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

    // Get all reference files for this deck
    const files = await db
      .select()
      .from(referenceFiles)
      .where(eq(referenceFiles.deckId, deckId))

    return NextResponse.json(files)
  } catch (error) {
    console.error('Error fetching reference files:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reference files' },
      { status: 500 }
    )
  }
}

// DELETE /api/decks/[deckId]/files?fileId=123 - Delete a reference file
export async function DELETE(
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
    const url = new URL(request.url)
    const fileIdStr = url.searchParams.get('fileId')

    if (isNaN(deckId)) {
      return NextResponse.json(
        { error: 'Invalid deck ID' },
        { status: 400 }
      )
    }

    if (!fileIdStr) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    const fileId = parseInt(fileIdStr)
    if (isNaN(fileId)) {
      return NextResponse.json(
        { error: 'Invalid file ID' },
        { status: 400 }
      )
    }

    // Get the file to delete
    const [file] = await db
      .select()
      .from(referenceFiles)
      .where(and(
        eq(referenceFiles.id, fileId),
        eq(referenceFiles.deckId, deckId)
      ))

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Delete from Vercel Blob
    try {
      await del(file.blobUrl)
    } catch (blobError) {
      console.error('Failed to delete from Blob:', blobError)
      // Continue with DB deletion even if Blob deletion fails
    }

    // Delete from database
    await db
      .delete(referenceFiles)
      .where(eq(referenceFiles.id, fileId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting reference file:', error)
    return NextResponse.json(
      { error: 'Failed to delete reference file' },
      { status: 500 }
    )
  }
}
