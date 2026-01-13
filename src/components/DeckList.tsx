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
        <Link
          key={deck.id}
          href={`/study?deck=${deck.id}`}
          className="block p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900">{deck.name}</h3>
              {deck.description && (
                <p className="text-sm text-gray-500 mt-1">{deck.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Updated {formatRelativeTime(deck.updatedAt)}
              </p>
            </div>
            <span className="text-sm text-gray-400">{deck.cardCount} cards</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
