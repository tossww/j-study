'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Flashcard, { SRSGrade } from './Flashcard'
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
  const { repetitions, interval, learningStep } = card
  // New, Learning, or Young cards
  return learningStep < 3 || repetitions <= 2 || interval <= 3
}

// Check if a card is a "trouble" card (high error rate)
function isTroubleCard(card: FlashcardType): boolean {
  const total = card.timesCorrect + card.timesIncorrect
  // Must have at least one error to be a trouble card
  return card.timesIncorrect > 0 && total > 0
}

export default function StudySession({ deckId, deckName, weakOnly = false, troubleOnly = false }: StudySessionProps) {
  const router = useRouter()
  const [cards, setCards] = useState<FlashcardType[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answeredUpTo, setAnsweredUpTo] = useState(-1) // Track furthest answered card
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ correct: 0, incorrect: 0, again: 0, hard: 0, good: 0, easy: 0 })
  const [completed, setCompleted] = useState(false)
  const [reverseMode, setReverseMode] = useState(false) // Show answer first, guess question
  const [shuffled, setShuffled] = useState(false)
  const [startTime] = useState(() => Date.now())

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

  const handleResult = useCallback(async (grade: SRSGrade) => {
    const card = cards[currentIndex]
    const isCorrect = grade !== 'again'

    // Update stats
    setStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
      again: prev.again + (grade === 'again' ? 1 : 0),
      hard: prev.hard + (grade === 'hard' ? 1 : 0),
      good: prev.good + (grade === 'good' ? 1 : 0),
      easy: prev.easy + (grade === 'easy' ? 1 : 0),
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

    // Mark this card as answered
    setAnsweredUpTo(currentIndex)

    // Move to next card or complete
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setCompleted(true)
    }
  }, [cards, currentIndex])

  const goToPreviousCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  const goToNextCard = () => {
    if (currentIndex <= answeredUpTo) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  // Check if we're viewing a previous card (view-only mode)
  const isViewingPrevious = currentIndex < answeredUpTo + 1 && currentIndex <= answeredUpTo

  // Keyboard shortcuts for grading (1=Again, 2=Hard, 3=Good, 4=Easy)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not editing and not viewing previous card
      if (editing || isViewingPrevious || !cards.length) return

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
  }, [editing, isViewingPrevious, cards.length, handleResult])

  // Keyboard shortcuts for navigation (Escape, Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editing) return

      // Escape to exit
      if (e.key === 'Escape') {
        e.preventDefault()
        router.push('/study')
        return
      }

      // Arrow keys for navigation
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault()
        goToPreviousCard()
      }
      if (e.key === 'ArrowRight' && isViewingPrevious) {
        e.preventDefault()
        goToNextCard()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editing, currentIndex, isViewingPrevious, router])

  const restartSession = () => {
    setCurrentIndex(0)
    setAnsweredUpTo(-1)
    setStats({ correct: 0, incorrect: 0, again: 0, hard: 0, good: 0, easy: 0 })
    setCompleted(false)
  }

  const shuffleCards = () => {
    if (currentIndex > 0) {
      // Don't shuffle mid-session - restart first
      if (!confirm('Shuffling will restart your session. Continue?')) return
      setCurrentIndex(0)
      setAnsweredUpTo(-1)
      setStats({ correct: 0, incorrect: 0, again: 0, hard: 0, good: 0, easy: 0 })
    }
    setCards(prev => [...prev].sort(() => Math.random() - 0.5))
    setShuffled(true)
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
    const total = stats.correct + stats.incorrect
    const accuracy = total > 0 ? Math.round((stats.correct / total) * 100) : 0
    const timeSpent = Math.round((Date.now() - startTime) / 1000)
    const minutes = Math.floor(timeSpent / 60)
    const seconds = timeSpent % 60
    const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
    const avgTimePerCard = total > 0 ? Math.round(timeSpent / total) : 0

    return (
      <div className="max-w-md mx-auto p-8">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Session Complete!</h2>
        <p className="text-gray-500 text-center mb-6">{deckName}</p>

        {/* Main Stats */}
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-gray-900">{total}</p>
              <p className="text-sm text-gray-500">Cards</p>
            </div>
            <div>
              <p className={`text-3xl font-bold ${accuracy >= 70 ? 'text-green-600' : accuracy >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {accuracy}%
              </p>
              <p className="text-sm text-gray-500">Accuracy</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{timeString}</p>
              <p className="text-sm text-gray-500">Time</p>
            </div>
          </div>
        </div>

        {/* Grade Breakdown */}
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Grade Breakdown</p>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-red-50 rounded-lg">
              <p className="text-lg font-bold text-red-600">{stats.again}</p>
              <p className="text-xs text-red-600">Again</p>
            </div>
            <div className="text-center p-2 bg-orange-50 rounded-lg">
              <p className="text-lg font-bold text-orange-600">{stats.hard}</p>
              <p className="text-xs text-orange-600">Hard</p>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <p className="text-lg font-bold text-green-600">{stats.good}</p>
              <p className="text-xs text-green-600">Good</p>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-lg font-bold text-blue-600">{stats.easy}</p>
              <p className="text-xs text-blue-600">Easy</p>
            </div>
          </div>
          {avgTimePerCard > 0 && (
            <p className="text-xs text-gray-400 text-center mt-3">
              ~{avgTimePerCard}s per card
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={restartSession}
            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            Study Again
          </button>
          <Link
            href="/study"
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors text-center"
          >
            Done
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
            {/* Shuffle Toggle */}
            <button
              onClick={shuffleCards}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${
                shuffled
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title="Shuffle cards randomly"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Shuffle</span>
            </button>
            {/* Reverse Mode Toggle */}
            <button
              onClick={() => setReverseMode(!reverseMode)}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${
                reverseMode
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title={reverseMode ? 'Reverse mode: Answer → Question' : 'Normal mode: Question → Answer'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span>{reverseMode ? 'A→Q' : 'Q→A'}</span>
            </button>
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

      {/* Flashcard with side navigation */}
      <div className="flex items-center justify-center gap-4">
        {/* Left arrow - Previous */}
        <button
          onClick={goToPreviousCard}
          disabled={currentIndex === 0}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-0 disabled:cursor-default"
          title="Previous card"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Current flashcard */}
        <Flashcard
          front={reverseMode ? cards[currentIndex].back : cards[currentIndex].front}
          back={reverseMode ? cards[currentIndex].front : cards[currentIndex].back}
          onResult={handleResult}
          onEdit={handleEditClick}
          srsData={{
            repetitions: cards[currentIndex].repetitions,
            interval: cards[currentIndex].interval,
            easeFactor: cards[currentIndex].easeFactor,
            learningStep: cards[currentIndex].learningStep,
          }}
          viewOnly={isViewingPrevious}
          reverseMode={reverseMode}
        />

        {/* Right arrow - Next (only when viewing previous) */}
        <button
          onClick={goToNextCard}
          disabled={!isViewingPrevious}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-0 disabled:cursor-default"
          title="Next card"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

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
