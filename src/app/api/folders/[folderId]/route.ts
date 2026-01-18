import { NextRequest, NextResponse } from 'next/server'
import { db, folders, decks } from '@/db'
import { eq, sql } from 'drizzle-orm'

// GET /api/folders/[folderId] - Get folder with contents
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId: folderIdStr } = await params
    const folderId = parseInt(folderIdStr)

    if (isNaN(folderId)) {
      return NextResponse.json(
        { error: 'Invalid folder ID' },
        { status: 400 }
      )
    }

    const [folder] = await db
      .select()
      .from(folders)
      .where(eq(folders.id, folderId))

    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      )
    }

    // Get subfolders
    const subfolders = await db
      .select()
      .from(folders)
      .where(eq(folders.parentId, folderId))
      .orderBy(folders.name)

    // Get decks in this folder
    const folderDecks = await db
      .select()
      .from(decks)
      .where(eq(decks.folderId, folderId))

    return NextResponse.json({
      ...folder,
      subfolders,
      decks: folderDecks,
    })
  } catch (error) {
    console.error('Error fetching folder:', error)
    return NextResponse.json(
      { error: 'Failed to fetch folder' },
      { status: 500 }
    )
  }
}

// PATCH /api/folders/[folderId] - Update folder (rename or move)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId: folderIdStr } = await params
    const folderId = parseInt(folderIdStr)

    if (isNaN(folderId)) {
      return NextResponse.json(
        { error: 'Invalid folder ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, parentId } = body

    // Check folder exists
    const [existingFolder] = await db
      .select()
      .from(folders)
      .where(eq(folders.id, folderId))

    if (!existingFolder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      )
    }

    const updates: { name?: string; parentId?: number | null; depth?: number; updatedAt: Date } = {
      updatedAt: new Date(),
    }

    // Handle rename
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Folder name cannot be empty' },
          { status: 400 }
        )
      }
      updates.name = name.trim()
    }

    // Handle move
    if (parentId !== undefined) {
      // Moving to root
      if (parentId === null) {
        updates.parentId = null
        updates.depth = 0
        // Need to update children depths too
        await updateChildrenDepths(folderId, 0)
      } else {
        // Prevent moving folder into itself or its children
        if (parentId === folderId) {
          return NextResponse.json(
            { error: 'Cannot move folder into itself' },
            { status: 400 }
          )
        }

        // Check if target is a descendant
        const isDescendant = await checkIsDescendant(folderId, parentId)
        if (isDescendant) {
          return NextResponse.json(
            { error: 'Cannot move folder into its own subfolder' },
            { status: 400 }
          )
        }

        // Get parent folder
        const [parentFolder] = await db
          .select()
          .from(folders)
          .where(eq(folders.id, parentId))

        if (!parentFolder) {
          return NextResponse.json(
            { error: 'Parent folder not found' },
            { status: 404 }
          )
        }

        // Check depth limit
        const newDepth = parentFolder.depth + 1
        const subtreeDepth = await getSubtreeMaxDepth(folderId)
        const depthIncrease = newDepth - existingFolder.depth

        if (subtreeDepth + depthIncrease > 2) {
          return NextResponse.json(
            { error: 'Moving would exceed maximum folder nesting depth (3 levels)' },
            { status: 400 }
          )
        }

        updates.parentId = parentId
        updates.depth = newDepth
        await updateChildrenDepths(folderId, newDepth)
      }
    }

    const [updatedFolder] = await db
      .update(folders)
      .set(updates)
      .where(eq(folders.id, folderId))
      .returning()

    return NextResponse.json(updatedFolder)
  } catch (error) {
    console.error('Error updating folder:', error)
    return NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    )
  }
}

// DELETE /api/folders/[folderId] - Delete folder (decks become unfiled)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId: folderIdStr } = await params
    const folderId = parseInt(folderIdStr)

    if (isNaN(folderId)) {
      return NextResponse.json(
        { error: 'Invalid folder ID' },
        { status: 400 }
      )
    }

    const [folder] = await db
      .select()
      .from(folders)
      .where(eq(folders.id, folderId))

    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      )
    }

    // Get all descendant folder IDs (for unfiling their decks)
    const descendantIds = await getAllDescendantIds(folderId)
    const allFolderIds = [folderId, ...descendantIds]

    // Unfile all decks in this folder and its subfolders
    for (const id of allFolderIds) {
      await db
        .update(decks)
        .set({ folderId: null, updatedAt: new Date() })
        .where(eq(decks.folderId, id))
    }

    // Delete folder (children cascade automatically due to schema)
    await db.delete(folders).where(eq(folders.id, folderId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting folder:', error)
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    )
  }
}

// Helper: Check if targetId is a descendant of folderId
async function checkIsDescendant(folderId: number, targetId: number): Promise<boolean> {
  const descendants = await getAllDescendantIds(folderId)
  return descendants.includes(targetId)
}

// Helper: Get all descendant folder IDs
async function getAllDescendantIds(folderId: number): Promise<number[]> {
  const children = await db
    .select({ id: folders.id })
    .from(folders)
    .where(eq(folders.parentId, folderId))

  const ids: number[] = []
  for (const child of children) {
    ids.push(child.id)
    const grandchildren = await getAllDescendantIds(child.id)
    ids.push(...grandchildren)
  }
  return ids
}

// Helper: Get max depth in subtree
async function getSubtreeMaxDepth(folderId: number): Promise<number> {
  const [folder] = await db
    .select({ depth: folders.depth })
    .from(folders)
    .where(eq(folders.id, folderId))

  if (!folder) return 0

  const children = await db
    .select({ id: folders.id })
    .from(folders)
    .where(eq(folders.parentId, folderId))

  if (children.length === 0) return folder.depth

  let maxDepth = folder.depth
  for (const child of children) {
    const childMax = await getSubtreeMaxDepth(child.id)
    maxDepth = Math.max(maxDepth, childMax)
  }
  return maxDepth
}

// Helper: Update depths of all children when folder is moved
async function updateChildrenDepths(folderId: number, parentNewDepth: number): Promise<void> {
  const children = await db
    .select({ id: folders.id })
    .from(folders)
    .where(eq(folders.parentId, folderId))

  for (const child of children) {
    const childNewDepth = parentNewDepth + 1
    await db
      .update(folders)
      .set({ depth: childNewDepth, updatedAt: new Date() })
      .where(eq(folders.id, child.id))
    await updateChildrenDepths(child.id, childNewDepth)
  }
}
