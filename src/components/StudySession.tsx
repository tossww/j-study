'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Flashcard from './Flashcard'
import ReferencePanel, { ReferenceFile } from './ReferencePanel'
import type { Flashcard as FlashcardType } from '@/db/schema'

interface StudySessionProps {
  deckId: number
  deckName: string
  weakOnly?: boolean
  troubleOnly?: boolean
}

// Check if a card is "weak" (New or Learning)
function isWeakCard(card: FlashcardType): boolean {
  const { repetitions, interval } = card
  // New or Learning cards
  return repetitions === 0 || repetitions <= 2 || interval <= 3
}

// Check if a card is a "trouble" card (high error rate)
function isTroubleCard(card: FlashcardType): boolean {
  const total = card.timesCorrect + card.timesIncorrect
  // Must have at least one error to be a trouble card
  return card.timesIncorrect > 0 && total > 0
}

export default function StudySession({ deckId, deckName, weakOnly = false, troubleOnly = false }: StudySessionProps) {
  const [cards, setCards] = useState<FlashcardType[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ correct: 0, incorrect: 0 })
  const [completed, setCompleted] = useState(false)

  // Edit modal state
  const [editing, setEditing] = useState(false)
  const [editFront, setEditFront] = useState('')
  const [editBack, setEditBack] = useState('')
  const [saving, setSaving] = useState(false)

  // Reference panel state
  const [referenceFiles, setReferenceFiles] = useState<ReferenceFile[]>([])
  const [showReferencePanel, setShowReferencePanel] = useState(false)

  useEffect(() => {
    async function fetchCards() {
      try {
        const response = await fetch(`/api/flashcards/${deckId}`)
        if (!response.ok) throw new Error('Failed to fetch cards')
        const data = await response.json()

        let filteredCards = data

        // Filter for weak cards (low SRS level)
        if (weakOnly) {
          filteredCards = data.filter(isWeakCard)
        }

        // Filter for trouble cards (high error rate), sorted by error rate
        if (troubleOnly) {
          filteredCards = data
            .filter(isTroubleCard)
            .sort((a: FlashcardType, b: FlashcardType) => {
              const aTotal = a.timesCorrect + a.timesIncorrect
              const bTotal = b.timesCorrect + b.timesIncorrect
              const aRate = aTotal > 0 ? a.timesIncorrect / aTotal : 0
              const bRate = bTotal > 0 ? b.timesIncorrect / bTotal : 0
              return bRate - aRate // Higher error rate first
            })
        }

        setCards(filteredCards)
      } catch {
        setError('Failed to load flashcards')
      } finally {
        setLoading(false)
      }
    }

    fetchCards()
  }, [deckId, weakOnly, troubleOnly])

  // Fetch reference files for this deck
  useEffect(() => {
    async function fetchReferenceFiles() {
      try {
        const response = await fetch(`/api/decks/${deckId}/files`)
        if (response.ok) {
          const files = await response.json()
          setReferenceFiles(files)
        }
      } catch (error) {
        console.error('Failed to fetch reference files:', error)
      }
    }

    fetchReferenceFiles()
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

  const handleEditClick = () => {
    const card = cards[currentIndex]
    setEditFront(card.front)
    setEditBack(card.back)
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    const card = cards[currentIndex]
    setSaving(true)

    try {
      const response = await fetch(`/api/flashcards/card/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ front: editFront, back: editBack }),
      })

      if (!response.ok) throw new Error('Failed to save')

      // Update local state
      setCards(prev => prev.map((c, i) =>
        i === currentIndex ? { ...c, front: editFront, back: editBack } : c
      ))
      setEditing(false)
    } catch {
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
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
    const getMessage = () => {
      if (troubleOnly) return 'No trouble cards! You haven\'t missed any cards yet.'
      if (weakOnly) return 'No weak cards to practice! All cards are well-learned.'
      return 'No flashcards in this deck'
    }

    return (
      <div className="text-center p-8">
        <p className="text-gray-600">{getMessage()}</p>
        {(weakOnly || troubleOnly) && (
          <Link
            href={`/study?deck=${deckId}`}
            className="inline-block mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Study All Cards
          </Link>
        )}
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
            href="/study"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Back to Decks
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Exit button and Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
          <div className="flex items-center gap-3">
            <Link
              href="/study"
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
              title="Exit session"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Exit</span>
            </Link>
            <span className="text-gray-300">|</span>
            <span>{deckName}</span>
            {weakOnly && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full font-medium">
                Weak Cards
              </span>
            )}
            {troubleOnly && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                Trouble Cards
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {referenceFiles.length > 0 && (
              <button
                onClick={() => setShowReferencePanel(!showReferencePanel)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${
                  showReferencePanel
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="View reference materials"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Ref</span>
              </button>
            )}
            <span>{currentIndex + 1} / {cards.length}</span>
          </div>
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
        onEdit={handleEditClick}
        srsData={{
          repetitions: cards[currentIndex].repetitions,
          interval: cards[currentIndex].interval,
          easeFactor: cards[currentIndex].easeFactor,
        }}
      />

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Card</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Front (Question)</label>
                <textarea
                  value={editFront}
                  onChange={(e) => setEditFront(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Back (Answer)</label>
                <textarea
                  value={editBack}
                  onChange={(e) => setEditBack(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editFront.trim() || !editBack.trim()}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Reference Panel */}
      <ReferencePanel
        files={referenceFiles}
        isOpen={showReferencePanel}
        onClose={() => setShowReferencePanel(false)}
      />
    </div>
  )
}
