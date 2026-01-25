'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Folder {
  id: number
  name: string
  parentId: number | null
  depth: number
  deckCount: number
  sortOrder: number
}

interface TreeNode extends Folder {
  children: TreeNode[]
}

interface FolderTreeProps {
  collapsed?: boolean
  onFolderSelect?: (folderId: number | null) => void
}

export default function FolderTree({ collapsed = false, onFolderSelect }: FolderTreeProps) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [creatingIn, setCreatingIn] = useState<number | null | 'root'>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [dragOverFolderId, setDragOverFolderId] = useState<number | null | 'root'>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentFolderId = searchParams.get('folderId')

  useEffect(() => {
    fetchFolders()
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchFolders() {
    try {
      const res = await fetch('/api/folders')
      if (res.ok) {
        const data = await res.json()
        setFolders(data)
        // Auto-expand folders that contain the current folder
        if (currentFolderId) {
          const expandedSet = new Set<number>()
          let folder = data.find((f: Folder) => f.id === parseInt(currentFolderId))
          while (folder?.parentId) {
            expandedSet.add(folder.parentId)
            folder = data.find((f: Folder) => f.id === folder.parentId)
          }
          setExpanded(expandedSet)
        }
      }
    } catch (error) {
      console.error('Error fetching folders:', error)
    } finally {
      setLoading(false)
    }
  }

  // Build tree structure from flat list
  function buildTree(folders: Folder[]): TreeNode[] {
    const map = new Map<number, TreeNode>()
    const roots: TreeNode[] = []

    // Create nodes
    folders.forEach(f => map.set(f.id, { ...f, children: [] }))

    // Build hierarchy
    folders.forEach(f => {
      const node = map.get(f.id)!
      if (f.parentId === null) {
        roots.push(node)
      } else {
        const parent = map.get(f.parentId)
        if (parent) {
          parent.children.push(node)
        }
      }
    })

    // Sort by sortOrder, then by name
    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name))
      nodes.forEach(n => sortNodes(n.children))
    }
    sortNodes(roots)

    return roots
  }

  function toggleExpand(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function selectFolder(folderId: number | null) {
    if (onFolderSelect) {
      onFolderSelect(folderId)
    }
    if (folderId === null) {
      router.push('/')
    } else {
      router.push(`/?folderId=${folderId}`)
    }
    setMenuOpen(null)
  }

  async function createFolder(parentId: number | null) {
    if (!newFolderName.trim()) return

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim(), parentId }),
      })

      if (res.ok) {
        setNewFolderName('')
        setCreatingIn(null)
        fetchFolders()
        // Expand parent if creating a subfolder
        if (parentId) {
          setExpanded(prev => new Set(prev).add(parentId))
        }
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to create folder')
      }
    } catch (error) {
      console.error('Error creating folder:', error)
    }
  }

  async function renameFolder(id: number) {
    if (!editName.trim()) return

    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })

      if (res.ok) {
        setEditingId(null)
        setEditName('')
        fetchFolders()
      }
    } catch (error) {
      console.error('Error renaming folder:', error)
    }
  }

  async function deleteFolder(id: number) {
    if (!confirm('Delete this folder? Decks inside will become unfiled (not deleted).')) return

    try {
      const res = await fetch(`/api/folders/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchFolders()
        // If we're viewing the deleted folder, go home
        if (currentFolderId === String(id)) {
          router.push('/')
        }
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
    }
  }

  async function reorderFolder(folderId: number, direction: 'up' | 'down', parentId: number | null) {
    try {
      const res = await fetch('/api/folders/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, direction, parentId }),
      })
      if (res.ok) {
        fetchFolders()
      }
    } catch (error) {
      console.error('Error reordering folder:', error)
    }
    setMenuOpen(null)
  }

  // Drag and drop handlers for moving decks into folders
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDragEnter(e: React.DragEvent, folderId: number | null) {
    e.preventDefault()
    setDragOverFolderId(folderId === null ? 'root' : folderId)
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear if we're leaving the actual element (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverFolderId(null)
    }
  }

  async function handleDrop(e: React.DragEvent, targetFolderId: number | null) {
    e.preventDefault()
    setDragOverFolderId(null)

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.type !== 'deck') return

      const res = await fetch(`/api/decks/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: targetFolderId }),
      })

      if (res.ok) {
        // Notify DeckList to remove the deck from view
        window.dispatchEvent(new CustomEvent('deck-moved', {
          detail: { deckId: data.id, targetFolderId }
        }))
        // Refresh to show updated state
        router.refresh()
        fetchFolders()
      }
    } catch (error) {
      console.error('Error moving deck:', error)
    }
  }

  function startEdit(folder: Folder, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(folder.id)
    setEditName(folder.name)
    setMenuOpen(null)
  }

  function startCreateSubfolder(parentId: number, e: React.MouseEvent) {
    e.stopPropagation()
    setCreatingIn(parentId)
    setNewFolderName('')
    setMenuOpen(null)
    // Expand the parent
    setExpanded(prev => new Set(prev).add(parentId))
  }

  function renderNode(node: TreeNode, level: number = 0): React.ReactNode {
    const isExpanded = expanded.has(node.id)
    const hasChildren = node.children.length > 0
    const isSelected = currentFolderId === String(node.id)
    const isEditing = editingId === node.id
    const canCreateSubfolder = node.depth < 2

    if (collapsed) {
      // In collapsed mode, just show folder icon for root folders
      if (level > 0) return null
      return (
        <button
          key={node.id}
          onClick={() => selectFolder(node.id)}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, node.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node.id)}
          className={`w-full flex justify-center p-2 rounded-lg transition-colors ${
            isSelected ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'
          } ${dragOverFolderId === node.id ? 'bg-amber-100 ring-2 ring-amber-400' : ''}`}
          title={node.name}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </button>
      )
    }

    return (
      <div key={node.id}>
        <div
          className={`group flex items-center gap-1 py-1.5 px-2 rounded-lg cursor-pointer transition-colors ${
            isSelected ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 text-gray-700'
          } ${dragOverFolderId === node.id ? 'bg-amber-100 ring-2 ring-amber-400 ring-inset' : ''}`}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => selectFolder(node.id)}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, node.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node.id)}
        >
          {/* Expand/collapse button */}
          <button
            onClick={(e) => toggleExpand(node.id, e)}
            className={`w-4 h-4 flex items-center justify-center flex-shrink-0 ${
              hasChildren ? 'text-gray-400 hover:text-gray-600' : 'invisible'
            }`}
          >
            <svg
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Folder icon */}
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
          </svg>

          {/* Name or edit input */}
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => renameFolder(node.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') renameFolder(node.id)
                if (e.key === 'Escape') setEditingId(null)
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 text-sm bg-white border border-primary-300 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-primary-400"
              autoFocus
            />
          ) : (
            <span className="flex-1 text-sm truncate">{node.name}</span>
          )}

          {/* Deck count */}
          {node.deckCount > 0 && !isEditing && (
            <span className="text-xs text-gray-400">{node.deckCount}</span>
          )}

          {/* Menu button */}
          {!isEditing && (
            <div className="relative" ref={menuOpen === node.id ? menuRef : null}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(menuOpen === node.id ? null : node.id)
                }}
                className="w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-opacity"
              >
                <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {menuOpen === node.id && (
                <div className="absolute right-0 top-6 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px]">
                  <button
                    onClick={(e) => { e.stopPropagation(); reorderFolder(node.id, 'up', node.parentId) }}
                    className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Move Up
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); reorderFolder(node.id, 'down', node.parentId) }}
                    className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Move Down
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={(e) => startEdit(node, e)}
                    className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Rename
                  </button>
                  {canCreateSubfolder && (
                    <button
                      onClick={(e) => startCreateSubfolder(node.id, e)}
                      className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      New Subfolder
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteFolder(node.id)
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Children */}
        {isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
            {/* New subfolder input */}
            {creatingIn === node.id && (
              <div
                className="flex items-center gap-1 py-1.5 px-2"
                style={{ paddingLeft: `${8 + (level + 1) * 16}px` }}
              >
                <div className="w-4" />
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                </svg>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onBlur={() => {
                    if (newFolderName.trim()) createFolder(node.id)
                    else setCreatingIn(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createFolder(node.id)
                    if (e.key === 'Escape') setCreatingIn(null)
                  }}
                  placeholder="Folder name"
                  className="flex-1 text-sm bg-white border border-primary-300 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-primary-400"
                  autoFocus
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="px-2 py-1">
        <div className="h-6 bg-gray-100 rounded animate-pulse" />
      </div>
    )
  }

  const tree = buildTree(folders)

  return (
    <div className="py-2">
      {/* All Decks option - accepts drops to move to root */}
      {!collapsed && (
        <button
          onClick={() => selectFolder(null)}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, null)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-left ${
            !currentFolderId ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 text-gray-700'
          } ${dragOverFolderId === 'root' ? 'bg-amber-100 ring-2 ring-amber-400 ring-inset' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="text-sm">All Decks</span>
        </button>
      )}

      {/* Folder tree */}
      {tree.map(node => renderNode(node))}

      {/* New folder at root input */}
      {creatingIn === 'root' && !collapsed && (
        <div className="flex items-center gap-1 py-1.5 px-3">
          <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
          </svg>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={() => {
              if (newFolderName.trim()) createFolder(null)
              else setCreatingIn(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createFolder(null)
              if (e.key === 'Escape') setCreatingIn(null)
            }}
            placeholder="Folder name"
            className="flex-1 text-sm bg-white border border-primary-300 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-primary-400"
            autoFocus
          />
        </div>
      )}

      {/* New folder button */}
      {!collapsed && creatingIn === null && (
        <button
          onClick={() => setCreatingIn('root')}
          className="w-full flex items-center gap-2 px-3 py-1.5 mt-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-left"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm">New Folder</span>
        </button>
      )}
    </div>
  )
}
