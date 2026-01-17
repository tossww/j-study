'use client'

import { useState, useEffect } from 'react'
import StudySession from '@/components/StudySession'

interface StudySessionWrapperProps {
  deckId: number
  weakOnly?: boolean
}

interface Deck {
  id: number
  name: string
}

export default function StudySessionWrapper({ deckId, weakOnly = false }: StudySessionWrapperProps) {
  const [deck, setDeck] = useState<Deck | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDeck() {
      try {
        const response = await fetch('/api/decks')
        if (!response.ok) throw new Error('Failed to fetch deck')
        const decks = await response.json()
        const found = decks.find((d: Deck) => d.id === deckId)
        if (!found) throw new Error('Deck not found')
        setDeck(found)
      } catch {
        setError('Failed to load deck')
      } finally {
        setLoading(false)
      }
    }

    fetchDeck()
  }, [deckId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !deck) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">{error || 'Deck not found'}</p>
      </div>
    )
  }

  return <StudySession deckId={deckId} deckName={deck.name} weakOnly={weakOnly} />
}
