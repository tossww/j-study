import { NextRequest, NextResponse } from 'next/server'
import { db, decks, flashcards } from '@/db'
import { desc, eq, sql, isNull, and, or } from 'drizzle-orm'
import { auth } from '@/auth'

// GET /api/decks - Get all decks with card counts and accuracy stats
// Query params: ?folderId=X (filter by folder), ?folderId=null (unfiled only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const folderIdParam = searchParams.get('folderId')

    // Build where conditions
    const userCondition = or(
      eq(decks.userId, session.user.id),
      isNull(decks.userId) // Include orphaned decks for backward compatibility
    )

    let whereCondition = userCondition

    // Filter by folder if specified
    if (folderIdParam !== null) {
      if (folderIdParam === 'null') {
        // Get unfiled decks only
        whereCondition = and(userCondition, isNull(decks.folderId))!
      } else {
        const folderId = parseInt(folderIdParam)
        if (!isNaN(folderId)) {
          whereCondition = and(userCondition, eq(decks.folderId, folderId))!
        }
      }
    }

    const allDecks = await db
      .select({
        id: decks.id,
        name: decks.name,
        description: decks.description,
        sourceFileName: decks.sourceFileName,
        folderId: decks.folderId,
        sortOrder: decks.sortOrder,
        isFavorite: decks.isFavorite,
        createdAt: decks.createdAt,
        updatedAt: decks.updatedAt,
        cardCount: sql<number>`count(${flashcards.id})::int`,
        totalCorrect: sql<number>`coalesce(sum(${flashcards.timesCorrect}), 0)::int`,
        totalIncorrect: sql<number>`coalesce(sum(${flashcards.timesIncorrect}), 0)::int`,
      })
      .from(decks)
      .leftJoin(flashcards, eq(decks.id, flashcards.deckId))
      .where(whereCondition)
      .groupBy(decks.id)
      .orderBy(desc(decks.isFavorite), decks.sortOrder, decks.name)

    // Calculate accuracy percentage for each deck
    const decksWithAccuracy = allDecks.map(deck => {
      const total = deck.totalCorrect + deck.totalIncorrect
      const accuracy = total > 0 ? Math.round((deck.totalCorrect / total) * 100) : null
      return {
        ...deck,
        accuracy,
        totalAttempts: total,
      }
    })

    return NextResponse.json(decksWithAccuracy)
  } catch (error) {
    console.error('Error fetching decks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch decks' },
      { status: 500 }
    )
  }
}
