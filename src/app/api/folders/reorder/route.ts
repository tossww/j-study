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
    const { folderId, direction, parentId, targetParentId, targetIndex } = body as {
      folderId: number
      direction?: 'up' | 'down'
      parentId?: number | null
      targetParentId?: number | null
      targetIndex?: number
    }

    if (!folderId) {
      return NextResponse.json({ error: 'folderId required' }, { status: 400 })
    }

    // Position-based reordering (drag and drop)
    if (targetIndex !== undefined) {
      // Get the folder being moved
      const [folder] = await db.select().from(folders).where(eq(folders.id, folderId))
      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
      }

      // Get siblings at target location
      const siblings = await db
        .select()
        .from(folders)
        .where(and(
          targetParentId === null || targetParentId === undefined
            ? isNull(folders.parentId)
            : eq(folders.parentId, targetParentId),
          or(eq(folders.userId, session.user.id), isNull(folders.userId))
        ))
        .orderBy(folders.sortOrder, folders.name)

      // Filter out the folder being moved (if it's in same group)
      const filteredSiblings = siblings.filter(s => s.id !== folderId)

      // Calculate new depth if parent changed
      let newDepth = 0
      if (targetParentId !== null && targetParentId !== undefined) {
        const [parentFolder] = await db.select().from(folders).where(eq(folders.id, targetParentId))
        if (parentFolder) {
          newDepth = parentFolder.depth + 1
          if (newDepth > 4) {
            return NextResponse.json({ error: 'Maximum folder nesting depth reached' }, { status: 400 })
          }
        }
      }

      // Reassign sortOrder for all siblings with new folder inserted at targetIndex
      for (let i = 0; i < filteredSiblings.length; i++) {
        const newOrder = i < targetIndex ? i : i + 1
        await db.update(folders)
          .set({ sortOrder: newOrder })
          .where(eq(folders.id, filteredSiblings[i].id))
      }

      // Update the moved folder
      await db.update(folders)
        .set({
          sortOrder: targetIndex,
          parentId: targetParentId ?? null,
          depth: newDepth
        })
        .where(eq(folders.id, folderId))

      return NextResponse.json({ success: true })
    }

    // Direction-based reordering (up/down buttons)
    if (!direction) {
      return NextResponse.json({ error: 'direction or targetIndex required' }, { status: 400 })
    }

    // Get all sibling folders (same parentId)
    const siblings = await db
      .select()
      .from(folders)
      .where(and(
        parentId === null || parentId === undefined
          ? isNull(folders.parentId)
          : eq(folders.parentId, parentId),
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
