'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Deck {
  id: number
  name: string
  description: string | null
  sourceFileName: string | null
  createdAt: string
  updatedAt: string
  cardCount: number
  accuracy: number | null
  totalAttempts: number
}

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

export default function DeckList() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    async function fetchDecks() {
      try {
        const response = await fetch('/api/decks')
        if (!response.ok) throw new Error('Failed to fetch decks')
        const data = await response.json()
        setDecks(data)
      } catch {
        setError('Failed to load decks')
      } finally {
        setLoading(false)
      }
    }

    fetchDecks()
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
      <div className="text-center p-8">
        <p className="text-gray-600 mb-4">No decks yet</p>
        <Link
          href="/upload"
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Upload your first study material
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-4 max-w-2xl mx-auto">
      {decks.map((deck) => (
        <div
          key={deck.id}
          className="relative p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all"
        >
          <Link href={`/study?deck=${deck.id}`} className="block">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-8">
                <h3 className="font-semibold text-gray-900">{deck.name}</h3>
                {deck.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{deck.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span>Updated {formatRelativeTime(deck.updatedAt)}</span>
                  {deck.accuracy !== null && (
                    <span className={deck.accuracy >= 70 ? 'text-green-600' : deck.accuracy >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                      {deck.accuracy}% accuracy
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{deck.cardCount} cards</span>
                <button
                  onClick={(e) => handleDelete(e, deck.id, deck.name)}
                  disabled={deletingId === deck.id}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
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
            </div>
          </Link>
        </div>
      ))}
    </div>
  )
}
