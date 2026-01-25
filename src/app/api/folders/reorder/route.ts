import { NextRequest, NextResponse } from 'next/server'
import { db, folders } from '@/db'
import { eq, and, or, isNull } from 'drizzle-orm'
import { auth } from '@/auth'

// POST /api/folders/reorder - Reorder folders
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { folderId, direction, parentId } = body as {
      folderId: number
      direction: 'up' | 'down'
      parentId: number | null
    }

    if (!folderId || !direction) {
      return NextResponse.json({ error: 'folderId and direction required' }, { status: 400 })
    }

    // Get all sibling folders (same parentId)
    const siblings = await db
      .select()
      .from(folders)
      .where(and(
        parentId === null ? isNull(folders.parentId) : eq(folders.parentId, parentId),
        or(eq(folders.userId, session.user.id), isNull(folders.userId))
      ))
      .orderBy(folders.sortOrder, folders.name)

    // Find current folder index
    const currentIndex = siblings.findIndex(f => f.id === folderId)
    if (currentIndex === -1) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Calculate swap index
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (swapIndex < 0 || swapIndex >= siblings.length) {
      return NextResponse.json({ error: 'Cannot move further' }, { status: 400 })
    }

    // Swap sortOrder values
    const currentFolder = siblings[currentIndex]
    const swapFolder = siblings[swapIndex]

    await db.update(folders)
      .set({ sortOrder: swapFolder.sortOrder })
      .where(eq(folders.id, currentFolder.id))

    await db.update(folders)
      .set({ sortOrder: currentFolder.sortOrder })
      .where(eq(folders.id, swapFolder.id))

    // If they had the same sortOrder, assign new values
    if (currentFolder.sortOrder === swapFolder.sortOrder) {
      for (let i = 0; i < siblings.length; i++) {
        await db.update(folders)
          .set({ sortOrder: i })
          .where(eq(folders.id, siblings[i].id))
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering folders:', error)
    return NextResponse.json({ error: 'Failed to reorder folders' }, { status: 500 })
  }
}
