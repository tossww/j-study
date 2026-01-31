'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Deck {
  id: number
  name: string
  cardCount: number
}

interface FolderDeckActionsProps {
  folderId: number
}

export default function FolderDeckActions({ folderId }: FolderDeckActionsProps) {
  const router = useRouter()
  const [selectMode, setSelectMode] = useState(false)
  const [selectedDecks, setSelectedDecks] = useState<number[]>([])
  const [decks, setDecks] = useState<Deck[]>([])

  // Fetch decks for this folder
  useEffect(() => {
    async function fetchDecks() {
      try {
        const res = await fetch(`/api/decks?folderId=${folderId}`)
        if (res.ok) {
          const data = await res.json()
          setDecks(data)
        }
      } catch {
        // ignore
      }
    }
    fetchDecks()
  }, [folderId])

  const handleStartQuiz = () => {
    if (selectedDecks.length === 0) return
    const deckParams = selectedDecks.map(id => `deck=${id}`).join('&')
    router.push(`/quiz?${deckParams}`)
  }

  const handleCancel = () => {
    setSelectMode(false)
    setSelectedDecks([])
  }

  const toggleDeck = (deckId: number) => {
    setSelectedDecks(prev =>
      prev.includes(deckId)
        ? prev.filter(id => id !== deckId)
        : [...prev, deckId]
    )
  }

  const selectAll = () => {
    setSelectedDecks(decks.map(d => d.id))
  }

  if (!selectMode) {
    return (
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setSelectMode(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Select for Quiz
        </button>
      </div>
    )
  }

  return (
    <div className="mb-4">
      {/* Selection controls */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-600">
          {selectedDecks.length} of {decks.length} selected
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStartQuiz}
            disabled={selectedDecks.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Create Quiz ({selectedDecks.length})
          </button>
        </div>
      </div>

      {/* Deck selection grid */}
      <div className="grid gap-2 mb-4">
        {decks.map(deck => (
          <button
            key={deck.id}
            onClick={() => toggleDeck(deck.id)}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
              selectedDecks.includes(deck.id)
                ? 'border-purple-400 bg-purple-50'
                : 'border-gray-100 hover:border-purple-200'
            }`}
          >
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
              selectedDecks.includes(deck.id)
                ? 'bg-purple-500'
                : 'bg-gray-100 border border-gray-200'
            }`}>
              {selectedDecks.includes(deck.id) && (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="font-medium text-gray-900">{deck.name}</span>
            <span className="text-sm text-gray-400 ml-auto">{deck.cardCount} cards</span>
          </button>
        ))}
      </div>
    </div>
  )
}
