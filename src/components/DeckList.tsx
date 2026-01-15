'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
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

  return (
    <div className="grid gap-3">
      {decks.map((deck) => (
        <div
          key={deck.id}
          onClick={() => router.push(`/study?deck=${deck.id}`)}
          className="group relative p-4 bg-white rounded-2xl shadow-soft border border-gray-50 hover:shadow-soft-lg hover:border-primary-100 transition-all cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-4 flex-1 pr-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-accent-lavender flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
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
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
          </div>
        </div>
      ))}
    </div>
  )
}
