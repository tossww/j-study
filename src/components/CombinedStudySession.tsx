'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Flashcard from './Flashcard'
import type { Flashcard as FlashcardType } from '@/db/schema'

interface Deck {
  id: number
  name: string
}

interface CardWithDeck extends FlashcardType {
  deckName: string
}

interface CombinedStudySessionProps {
  deckIds: number[]
  weakOnly?: boolean
  troubleOnly?: boolean
}

// Check if a card is "weak" (New or Learning)
function isWeakCard(card: FlashcardType): boolean {
  const { repetitions, interval } = card
  return repetitions === 0 || repetitions <= 2 || interval <= 3
}

// Check if a card is a "trouble" card (high error rate)
function isTroubleCard(card: FlashcardType): boolean {
  const total = card.timesCorrect + card.timesIncorrect
  return card.timesIncorrect > 0 && total > 0
}

export default function CombinedStudySession({ deckIds, weakOnly = false, troubleOnly = false }: CombinedStudySessionProps) {
  const [cards, setCards] = useState<CardWithDeck[]>([])
  const [decks, setDecks] = useState<Deck[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answeredUpTo, setAnsweredUpTo] = useState(-1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ correct: 0, incorrect: 0 })
  const [completed, setCompleted] = useState(false)
  const [shuffled, setShuffled] = useState(!troubleOnly) // Already shuffled by default (unless trouble mode)

  useEffect(() => {
    async function fetchCards() {
      try {
        // Fetch all decks info and cards in parallel
        const deckPromises = deckIds.map(async (deckId) => {
          const [deckRes, cardsRes] = await Promise.all([
            fetch(`/api/decks/${deckId}`),
            fetch(`/api/flashcards/${deckId}`)
          ])

          if (!deckRes.ok || !cardsRes.ok) {
            throw new Error(`Failed to fetch deck ${deckId}`)
          }

          const deck = await deckRes.json()
          const deckCards = await cardsRes.json()

          return {
            deck: { id: deck.id, name: deck.name },
            cards: deckCards.map((card: FlashcardType) => ({
              ...card,
              deckName: deck.name
            }))
          }
        })

        const results = await Promise.all(deckPromises)

        // Collect decks and combine all cards
        const allDecks = results.map(r => r.deck)
        let allCards = results.flatMap(r => r.cards)

        // Filter based on mode
        if (weakOnly) {
          allCards = allCards.filter(isWeakCard)
        }
        if (troubleOnly) {
          allCards = allCards
            .filter(isTroubleCard)
            .sort((a, b) => {
              const aTotal = a.timesCorrect + a.timesIncorrect
              const bTotal = b.timesCorrect + b.timesIncorrect
              const aRate = aTotal > 0 ? a.timesIncorrect / aTotal : 0
              const bRate = bTotal > 0 ? b.timesIncorrect / bTotal : 0
              return bRate - aRate // Higher error rate first
            })
        }

        // Shuffle combined cards (unless trouble mode which is sorted by error rate)
        const finalCards = troubleOnly ? allCards : allCards.sort(() => Math.random() - 0.5)

        setDecks(allDecks)
        setCards(finalCards)
      } catch {
        setError('Failed to load flashcards')
      } finally {
        setLoading(false)
      }
    }

    fetchCards()
  }, [deckIds, weakOnly, troubleOnly])

  const handleResult = async (correct: boolean) => {
    const card = cards[currentIndex]

    setStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1),
    }))

    try {
      await fetch('/api/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, correct }),
      })
    } catch {
      console.error('Failed to save progress')
    }

    setAnsweredUpTo(currentIndex)

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      setCompleted(true)
    }
  }

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

  const isViewingPrevious = currentIndex < answeredUpTo + 1 && currentIndex <= answeredUpTo

  const restartSession = () => {
    setCurrentIndex(0)
    setAnsweredUpTo(-1)
    setStats({ correct: 0, incorrect: 0 })
    setCompleted(false)
    // Re-shuffle cards
    setCards(prev => [...prev].sort(() => Math.random() - 0.5))
    setShuffled(true)
  }

  const shuffleCards = () => {
    if (currentIndex > 0) {
      if (!confirm('Shuffling will restart your session. Continue?')) return
      setCurrentIndex(0)
      setAnsweredUpTo(-1)
      setStats({ correct: 0, incorrect: 0 })
    }
    setCards(prev => [...prev].sort(() => Math.random() - 0.5))
    setShuffled(true)
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
      if (troubleOnly) return 'No trouble cards! You haven\'t missed any cards in these decks yet.'
      if (weakOnly) return 'No weak cards to practice! All cards in these decks are well-learned.'
      return 'No flashcards in selected decks'
    }

    return (
      <div className="text-center p-8">
        <p className="text-gray-600">{getMessage()}</p>
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

  const currentCard = cards[currentIndex]

  return (
    <div>
      {/* Header */}
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
            <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs rounded-full font-medium">
              Combined: {decks.map(d => d.name).join(' + ')}
            </span>
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

      {/* Deck indicator for current card */}
      <div className="text-center mb-2">
        <span className="text-xs text-gray-400">
          From: {currentCard.deckName}
        </span>
      </div>

      {/* Flashcard with side navigation */}
      <div className="flex items-center justify-center gap-4">
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

        <Flashcard
          front={currentCard.front}
          back={currentCard.back}
          onResult={handleResult}
          srsData={{
            repetitions: currentCard.repetitions,
            interval: currentCard.interval,
            easeFactor: currentCard.easeFactor,
          }}
          viewOnly={isViewingPrevious}
        />

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
