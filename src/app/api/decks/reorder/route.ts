import { NextRequest, NextResponse } from 'next/server'
import { db, decks } from '@/db'
import { eq, and, or, isNull } from 'drizzle-orm'
import { auth } from '@/auth'

// POST /api/decks/reorder - Reorder decks within a folder
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { deckId, targetIndex, folderId } = body as {
      deckId: number
      targetIndex: number
      folderId: number | null
    }

    if (!deckId || targetIndex === undefined) {
      return NextResponse.json({ error: 'deckId and targetIndex required' }, { status: 400 })
    }

    // Get the deck being moved
    const [deck] = await db.select().from(decks).where(eq(decks.id, deckId))
    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
    }

    // Get all decks in the same folder
    const siblings = await db
      .select()
      .from(decks)
      .where(and(
        folderId === null || folderId === undefined
          ? isNull(decks.folderId)
          : eq(decks.folderId, folderId),
        or(eq(decks.userId, session.user.id), isNull(decks.userId))
      ))
      .orderBy(decks.sortOrder, decks.name)

    // Filter out the deck being moved
    const filteredSiblings = siblings.filter(s => s.id !== deckId)

    // Reassign sortOrder for all siblings with the deck inserted at targetIndex
    for (let i = 0; i < filteredSiblings.length; i++) {
      const newOrder = i < targetIndex ? i : i + 1
      await db.update(decks)
        .set({ sortOrder: newOrder })
        .where(eq(decks.id, filteredSiblings[i].id))
    }

    // Update the moved deck
    await db.update(decks)
      .set({ sortOrder: targetIndex })
      .where(eq(decks.id, deckId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering decks:', error)
    return NextResponse.json({ error: 'Failed to reorder decks' }, { status: 500 })
  }
}
