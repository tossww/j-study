'use client'

import { useState, useEffect } from 'react'
import Flashcard from './Flashcard'
import type { Flashcard as FlashcardType } from '@/db/schema'

interface StudySessionProps {
  deckId: number
  deckName: string
}

export default function StudySession({ deckId, deckName }: StudySessionProps) {
  const [cards, setCards] = useState<FlashcardType[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ correct: 0, incorrect: 0 })
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    async function fetchCards() {
      try {
        const response = await fetch(`/api/flashcards/${deckId}`)
        if (!response.ok) throw new Error('Failed to fetch cards')
        const data = await response.json()
        setCards(data)
      } catch {
        setError('Failed to load flashcards')
      } finally {
        setLoading(false)
      }
    }

    fetchCards()
  }, [deckId])

  const handleResult = async (correct: boolean) => {
    const card = cards[currentIndex]

    // Update stats
    setStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1),
    }))

    // Send result to server
    try {
      await fetch('/api/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, correct }),
      })
    } catch {
      console.error('Failed to save progress')
    }

    // Move to next card or complete
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setCompleted(true)
    }
  }

  const restartSession = () => {
    setCurrentIndex(0)
    setStats({ correct: 0, incorrect: 0 })
    setCompleted(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">No flashcards in this deck</p>
      </div>
    )
  }

  if (completed) {
    const accuracy = Math.round((stats.correct / (stats.correct + stats.incorrect)) * 100)

    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Session Complete!</h2>

        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-green-600">{stats.correct}</p>
            <p className="text-gray-600">Correct</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-red-600">{stats.incorrect}</p>
            <p className="text-gray-600">Incorrect</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-primary-600">{accuracy}%</p>
            <p className="text-gray-600">Accuracy</p>
          </div>
        </div>

        <button
          onClick={restartSession}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Study Again
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{deckName}</span>
          <span>{currentIndex + 1} / {cards.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current flashcard */}
      <Flashcard
        front={cards[currentIndex].front}
        back={cards[currentIndex].back}
        onResult={handleResult}
      />

      {/* Session stats */}
      <div className="flex justify-center gap-8 mt-8 text-sm">
        <div className="text-center">
          <span className="text-green-600 font-medium">{stats.correct}</span>
          <span className="text-gray-500"> correct</span>
        </div>
        <div className="text-center">
          <span className="text-red-600 font-medium">{stats.incorrect}</span>
          <span className="text-gray-500"> incorrect</span>
        </div>
      </div>
    </div>
  )
}
