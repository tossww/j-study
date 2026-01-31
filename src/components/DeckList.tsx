'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Deck {
  id: number
  name: string
  description: string | null
  sourceFileName: string | null
  folderId: number | null
  createdAt: string
  updatedAt: string
  cardCount: number
  accuracy: number | null
  totalAttempts: number
}

interface Folder {
  id: number
  name: string
  parentId: number | null
  depth: number
}

interface DeckListProps {
  folderId?: number | null
  selectMode?: boolean
  selectedDecks?: number[]
  onSelectionChange?: (deckIds: number[]) => void
  showControls?: boolean
}

type SortOption = 'recent' | 'oldest' | 'name-asc' | 'name-desc' | 'cards-desc' | 'cards-asc' | 'accuracy-desc' | 'accuracy-asc'

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recently Updated' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'cards-desc', label: 'Most Cards' },
  { value: 'cards-asc', label: 'Fewest Cards' },
  { value: 'accuracy-desc', label: 'Best Accuracy' },
  { value: 'accuracy-asc', label: 'Needs Practice' },
]

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function DeckList({ folderId, selectMode = false, selectedDecks = [], onSelectionChange, showControls = true }: DeckListProps = {}) {
  const router = useRouter()
  const [decks, setDecks] = useState<Deck[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [moveMenuOpen, setMoveMenuOpen] = useState<number | null>(null)
  const [movingId, setMovingId] = useState<number | null>(null)
  const [expandedMoveFolder, setExpandedMoveFolder] = useState<number | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const moveMenuRef = useRef<HTMLDivElement>(null)

  // Search and sort states
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('recent')

  useEffect(() => {
    async function fetchData() {
      try {
        // Build URL with folder filter if specified
        let url = '/api/decks'
        if (folderId !== undefined) {
          url += `?folderId=${folderId === null ? 'null' : folderId}`
        }

        // Fetch decks and folders in parallel
        const [decksRes, foldersRes] = await Promise.all([
          fetch(url),
          fetch('/api/folders')
        ])

        if (!decksRes.ok) throw new Error('Failed to fetch decks')
        const decksData = await decksRes.json()
        setDecks(decksData)

        if (foldersRes.ok) {
          const foldersData = await foldersRes.json()
          setFolders(foldersData)
        }
      } catch {
        setError('Failed to load decks')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [folderId])

  // Close move menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moveMenuRef.current && !moveMenuRef.current.contains(event.target as Node)) {
        setMoveMenuOpen(null)
        setExpandedMoveFolder(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleDelete = async (e: React.MouseEvent, deckId: number, deckName: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm(`Delete "${deckName}" and all its flashcards?`)) {
      return
    }

    setDeletingId(deckId)
    try {
      const response = await fetch(`/api/decks/${deckId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete')
      setDecks(decks.filter(d => d.id !== deckId))
    } catch {
      alert('Failed to delete deck')
    } finally {
      setDeletingId(null)
    }
  }

  const handleMove = async (e: React.MouseEvent, deckId: number, targetFolderId: number | null) => {
    e.preventDefault()
    e.stopPropagation()

    setMovingId(deckId)
    setMoveMenuOpen(null)

    try {
      const response = await fetch(`/api/decks/${deckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: targetFolderId }),
      })

      if (!response.ok) throw new Error('Failed to move deck')

      // Remove deck from current list if we're viewing a specific folder
      if (folderId !== undefined) {
        setDecks(decks.filter(d => d.id !== deckId))
      } else {
        // Update the deck's folderId in the list
        setDecks(decks.map(d => d.id === deckId ? { ...d, folderId: targetFolderId } : d))
      }
    } catch {
      alert('Failed to move deck')
    } finally {
      setMovingId(null)
    }
  }

  // Get root-level folders (no parent)
  const getRootFolders = () => folders.filter(f => f.parentId === null)

  // Get child folders of a parent
  const getChildFolders = (parentId: number) => folders.filter(f => f.parentId === parentId)

  // Check if folder has children
  const hasChildren = (folderId: number) => folders.some(f => f.parentId === folderId)

  // Drag handlers for deck cards
  const handleDragStart = (e: React.DragEvent, deck: Deck) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'deck',
      id: deck.id,
      name: deck.name,
    }))
    e.dataTransfer.effectAllowed = 'move'
    setDraggingId(deck.id)
  }

  const handleDragEnd = () => {
    // Small delay to prevent click from firing after drag
    setTimeout(() => {
      setDraggingId(null)
      setDropTargetIndex(null)
    }, 100)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDropTargetIndex(index)
  }

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    setDropTargetIndex(null)

    if (draggingId === null) return

    const draggedDeck = decks.find(d => d.id === draggingId)
    if (!draggedDeck) return

    const currentIndex = decks.findIndex(d => d.id === draggingId)
    if (currentIndex === targetIndex) return

    // Optimistically update UI
    const newDecks = [...decks]
    newDecks.splice(currentIndex, 1)
    newDecks.splice(targetIndex, 0, draggedDeck)
    setDecks(newDecks)

    // Call API to persist the new order
    try {
      await fetch('/api/decks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId: draggingId,
          targetIndex,
          folderId: folderId ?? null,
        }),
      })
    } catch (error) {
      console.error('Failed to reorder deck:', error)
      // Revert on error
      setDecks(decks)
    }
  }

  const handleDeckClick = (deckId: number) => {
    if (selectMode && onSelectionChange) {
      if (selectedDecks.includes(deckId)) {
        onSelectionChange(selectedDecks.filter(id => id !== deckId))
      } else {
        onSelectionChange([...selectedDecks, deckId])
      }
    } else {
      router.push(`/study?deck=${deckId}`)
    }
  }

  // Listen for deck-moved events from FolderTree/FolderContents
  useEffect(() => {
    function handleDeckMoved(e: CustomEvent<{ deckId: number; targetFolderId: number | null }>) {
      const { deckId, targetFolderId } = e.detail
      // Remove deck from list if it was moved to a different folder
      if (folderId !== targetFolderId) {
        setDecks(prev => prev.filter(d => d.id !== deckId))
      }
    }

    window.addEventListener('deck-moved', handleDeckMoved as EventListener)
    return () => window.removeEventListener('deck-moved', handleDeckMoved as EventListener)
  }, [folderId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (decks.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-2xl border border-gray-100">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-lavender flex items-center justify-center">
          <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <p className="text-gray-600 mb-2">No decks yet</p>
        <p className="text-sm text-gray-400 mb-4">Create your first deck to get started</p>
        <Link
          href="/upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Deck
        </Link>
      </div>
    )
  }

  // Filter and sort decks
  const filteredDecks = decks
    .filter(deck => {
      if (!searchQuery.trim()) return true
      const query = searchQuery.toLowerCase()
      return (
        deck.name.toLowerCase().includes(query) ||
        deck.description?.toLowerCase().includes(query) ||
        deck.sourceFileName?.toLowerCase().includes(query)
      )
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        case 'oldest':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'cards-desc':
          return b.cardCount - a.cardCount
        case 'cards-asc':
          return a.cardCount - b.cardCount
        case 'accuracy-desc':
          return (b.accuracy ?? -1) - (a.accuracy ?? -1)
        case 'accuracy-asc':
          // Cards with no accuracy (never studied) should be at top for "needs practice"
          if (a.accuracy === null && b.accuracy !== null) return -1
          if (b.accuracy === null && a.accuracy !== null) return 1
          return (a.accuracy ?? 0) - (b.accuracy ?? 0)
        default:
          return 0
      }
    })

  return (
    <div>
      {/* Search and Sort Controls */}
      {showControls && decks.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search decks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none w-full sm:w-auto pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 cursor-pointer"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}

      {/* Results count when searching */}
      {searchQuery && (
        <p className="text-sm text-gray-500 mb-3">
          {filteredDecks.length === 0
            ? 'No decks found'
            : `${filteredDecks.length} deck${filteredDecks.length !== 1 ? 's' : ''} found`
          }
        </p>
      )}

      {/* Deck Grid */}
      <div className="grid gap-2">
      {filteredDecks.map((deck, index) => (
        <div
          key={deck.id}
          draggable={!selectMode}
          onDragStart={(e) => {
            if (selectMode) return
            // Set both formats: text/plain for reordering, application/json for folder drops
            e.dataTransfer.setData('text/plain', deck.id.toString())
            e.dataTransfer.setData('application/json', JSON.stringify({
              type: 'deck',
              id: deck.id,
              name: deck.name,
            }))
            e.dataTransfer.effectAllowed = 'move'
            setDraggingId(deck.id)
          }}
          onDragEnd={() => {
            setDraggingId(null)
            setDropTargetIndex(null)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            if (draggingId !== null && draggingId !== deck.id) {
              setDropTargetIndex(index)
            }
          }}
          onDrop={(e) => {
            e.preventDefault()
            if (draggingId !== null && draggingId !== deck.id) {
              handleDrop(e, index)
            }
          }}
          onClick={() => !draggingId && handleDeckClick(deck.id)}
          className={`group relative p-4 bg-white rounded-2xl shadow-soft border transition-all ${
            selectMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
          } ${
            draggingId === deck.id ? 'opacity-50 scale-95' : ''
          } ${
            dropTargetIndex === index && draggingId !== deck.id ? 'border-primary-400 border-2' : ''
          } ${
            selectMode && selectedDecks.includes(deck.id)
              ? 'border-primary-400 bg-primary-50 shadow-soft-lg'
              : 'border-gray-50 hover:shadow-soft-lg hover:border-primary-100'
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-4 flex-1 pr-4">
              {/* Checkbox in select mode */}
              {selectMode ? (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  selectedDecks.includes(deck.id)
                    ? 'bg-primary-500'
                    : 'bg-gray-100 border-2 border-gray-200'
                }`}>
                  {selectedDecks.includes(deck.id) && (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-accent-lavender flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{deck.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400">{deck.cardCount} cards</span>
                  <span className="text-xs text-gray-300">•</span>
                  <span className="text-xs text-gray-400">{formatRelativeTime(deck.updatedAt)}</span>
                  {deck.accuracy !== null && (
                    <>
                      <span className="text-xs text-gray-300">•</span>
                      <span className={`text-xs font-medium ${deck.accuracy >= 70 ? 'text-green-600' : deck.accuracy >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {deck.accuracy}%
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            {!selectMode && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link
                href={`/quiz?deck=${deck.id}`}
                onClick={(e) => e.stopPropagation()}
                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                title="Take a quiz"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Link>
              <Link
                href={`/study?deck=${deck.id}&weak=true`}
                onClick={(e) => e.stopPropagation()}
                className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                title="Practice weak cards"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </Link>
              <Link
                href={`/study?deck=${deck.id}&trouble=true`}
                onClick={(e) => e.stopPropagation()}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                title="Practice trouble cards"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </Link>
              <Link
                href={`/edit/${deck.id}`}
                onClick={(e) => e.stopPropagation()}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors"
                title="Edit deck"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </Link>
              {/* Move to folder button */}
              <div className="relative" ref={moveMenuOpen === deck.id ? moveMenuRef : null}>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (moveMenuOpen === deck.id) {
                      setMoveMenuOpen(null)
                      setExpandedMoveFolder(null)
                    } else {
                      setMoveMenuOpen(deck.id)
                      setExpandedMoveFolder(null)
                    }
                  }}
                  disabled={movingId === deck.id}
                  className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors disabled:opacity-50"
                  title="Move to folder"
                >
                  {movingId === deck.id ? (
                    <span className="block w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  )}
                </button>
                {/* Move dropdown - hierarchical */}
                {moveMenuOpen === deck.id && (
                  <div className="absolute right-0 top-10 z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-2 min-w-[220px] max-h-72 overflow-y-auto">
                    {/* Header with back button when in subfolder */}
                    {expandedMoveFolder !== null ? (
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 mb-1">
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            const currentFolder = folders.find(f => f.id === expandedMoveFolder)
                            setExpandedMoveFolder(currentFolder?.parentId ?? null)
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {folders.find(f => f.id === expandedMoveFolder)?.name}
                        </span>
                      </div>
                    ) : (
                      <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Move to
                      </div>
                    )}

                    {/* Move here button when viewing a folder */}
                    {expandedMoveFolder !== null && expandedMoveFolder !== deck.folderId && (
                      <button
                        onClick={(e) => handleMove(e, deck.id, expandedMoveFolder)}
                        className="w-full px-3 py-2 text-left text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2 font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Move here</span>
                      </button>
                    )}

                    {/* Unfiled option - only at root level */}
                    {expandedMoveFolder === null && deck.folderId !== null && (
                      <button
                        onClick={(e) => handleMove(e, deck.id, null)}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span>Unfiled (Root)</span>
                      </button>
                    )}

                    {/* Folder list - show root folders or children of expanded folder */}
                    {(expandedMoveFolder === null ? getRootFolders() : getChildFolders(expandedMoveFolder))
                      .filter(f => f.id !== deck.folderId)
                      .map(folder => (
                        <button
                          key={folder.id}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (hasChildren(folder.id)) {
                              // Has subfolders - expand to show them
                              setExpandedMoveFolder(folder.id)
                            } else {
                              // No subfolders - move directly
                              handleMove(e, deck.id, folder.id)
                            }
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                          </svg>
                          <span className="truncate flex-1">{folder.name}</span>
                          {hasChildren(folder.id) && (
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </button>
                      ))}

                    {/* Empty state */}
                    {expandedMoveFolder === null && folders.length === 0 && deck.folderId === null && (
                      <div className="px-3 py-2 text-sm text-gray-400 italic">
                        No folders yet
                      </div>
                    )}
                    {expandedMoveFolder !== null && getChildFolders(expandedMoveFolder).filter(f => f.id !== deck.folderId).length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-400 italic">
                        No subfolders
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={(e) => handleDelete(e, deck.id, deck.name)}
                disabled={deletingId === deck.id}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                title="Delete deck"
              >
                {deletingId === deck.id ? (
                  <span className="block w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </div>
            )}
          </div>
        </div>
      ))}
      </div>
    </div>
  )
}
