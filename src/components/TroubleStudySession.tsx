'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Flashcard, { SRSGrade } from './Flashcard'

interface TroubleCard {
  id: number
  deckId: number
  front: string
  back: string
  timesCorrect: number
  timesIncorrect: number
  deckName: string | null
  errorRate: number
  totalAttempts: number
  // SRS fields for display
  repetitions: number
  interval: number
  easeFactor: number
  learningStep: number
}

export default function TroubleStudySession() {
  const [cards, setCards] = useState<TroubleCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ correct: 0, incorrect: 0 })
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    async function fetchTroubleCards() {
      try {
        const response = await fetch('/api/stats/trouble-cards?limit=20')
        if (!response.ok) throw new Error('Failed to fetch trouble cards')
        const data = await response.json()
        if (data.success) {
          setCards(data.cards)
        } else {
          throw new Error(data.error || 'Failed to fetch trouble cards')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trouble cards')
      } finally {
        setLoading(false)
      }
    }

    fetchTroubleCards()
  }, [])

  const handleResult = useCallback(async (grade: SRSGrade) => {
    const card = cards[currentIndex]
    const isCorrect = grade !== 'again'

    // Update stats
    setStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
    }))

    // Send result to server
    try {
      await fetch('/api/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, grade }),
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
  }, [cards, currentIndex])

  // Keyboard shortcuts for grading
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!cards.length || completed) return

      const gradeMap: Record<string, SRSGrade> = {
        '1': 'again',
        '2': 'hard',
        '3': 'good',
        '4': 'easy'
      }

      const grade = gradeMap[e.key]
      if (grade) {
        e.preventDefault()
        handleResult(grade)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cards.length, completed, handleResult])

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
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-gray-600 mb-4">No trouble cards! You haven't missed any cards yet.</p>
        <Link
          href="/study"
          className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Study Your Decks
        </Link>
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

        <div className="flex gap-4 justify-center">
          <button
            onClick={restartSession}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Study Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const currentCard = cards[currentIndex]

  return (
    <div>
      {/* Exit button and Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
              title="Exit session"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Exit</span>
            </Link>
            <span className="text-gray-300">|</span>
            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">
              Trouble Cards
            </span>
            <span className="text-xs text-gray-500">
              from {currentCard.deckName || 'Unknown deck'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-red-600">
              {currentCard.errorRate}% missed
            </span>
            <span>{currentIndex + 1} / {cards.length}</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-red-500 h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current flashcard */}
      <Flashcard
        front={currentCard.front}
        back={currentCard.back}
        onResult={handleResult}
        srsData={{
          repetitions: currentCard.repetitions || 0,
          interval: currentCard.interval || 0,
          easeFactor: currentCard.easeFactor || 250,
          learningStep: currentCard.learningStep || 0,
        }}
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
