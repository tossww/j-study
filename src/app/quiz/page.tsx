'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Deck {
  id: number
  name: string
  cardCount: number
}

type QuizMode = 'multiple-choice' | 'fill-blank' | 'typed'

export default function QuizPage() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDeck, setSelectedDeck] = useState<number | null>(null)
  const [selectedModes, setSelectedModes] = useState<QuizMode[]>(['multiple-choice'])
  const [questionCount, setQuestionCount] = useState(10)
  const [step, setStep] = useState<'deck' | 'settings'>('deck')

  useEffect(() => {
    async function fetchDecks() {
      try {
        const res = await fetch('/api/decks')
        if (res.ok) {
          const data = await res.json()
          setDecks(data.filter((d: Deck) => d.cardCount > 0))
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchDecks()
  }, [])

  const selectDeck = (deckId: number) => {
    setSelectedDeck(deckId)
    setStep('settings')
  }

  const toggleMode = (mode: QuizMode) => {
    setSelectedModes(prev => {
      if (prev.includes(mode)) {
        if (prev.length === 1) return prev
        return prev.filter(m => m !== mode)
      }
      return [...prev, mode]
    })
  }

  const startQuiz = () => {
    if (!selectedDeck || selectedModes.length === 0) return
    const params = new URLSearchParams({
      deck: selectedDeck.toString(),
      modes: selectedModes.join(','),
      count: questionCount.toString(),
    })
    window.location.href = `/quiz/session?${params.toString()}`
  }

  const selectedDeckData = decks.find(d => d.id === selectedDeck)

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  if (decks.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center p-12 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-lavender flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p className="text-gray-600 mb-2">No decks available</p>
          <p className="text-sm text-gray-400 mb-4">Create a deck with flashcards first</p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors text-sm font-medium"
          >
            Create Deck
          </Link>
        </div>
      </div>
    )
  }

  // Step 1: Deck Selection
  if (step === 'deck') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Quiz Mode</h1>
          <p className="text-gray-500 mt-1">Select a deck to quiz yourself on</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-50">
          <div className="grid gap-2">
            {decks.map(deck => (
              <button
                key={deck.id}
                onClick={() => selectDeck(deck.id)}
                className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-100 hover:border-primary-300 hover:bg-primary-50 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-primary-500 text-gray-500 group-hover:text-white flex items-center justify-center transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <span className="font-medium text-gray-900">{deck.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">{deck.cardCount} cards</span>
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Quiz Settings
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => setStep('deck')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Change deck
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Quiz Settings</h1>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span className="text-gray-600">{selectedDeckData?.name}</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-400 text-sm">{selectedDeckData?.cardCount} cards</span>
        </div>
      </div>

      {/* Quiz mode selection */}
      <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-50 mb-6">
        <h2 className="font-semibold text-gray-900 mb-2">Question Types</h2>
        <p className="text-sm text-gray-500 mb-4">Select one or more for a mixed quiz</p>
        <div className="grid gap-3">
          <button
            onClick={() => toggleMode('multiple-choice')}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
              selectedModes.includes('multiple-choice')
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              selectedModes.includes('multiple-choice')
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-500'
            }`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Multiple Choice</p>
              <p className="text-sm text-gray-500">Pick the correct answer from 4 options</p>
            </div>
          </button>

          <button
            onClick={() => toggleMode('fill-blank')}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
              selectedModes.includes('fill-blank')
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              selectedModes.includes('fill-blank')
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-500'
            }`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Fill in the Blank</p>
              <p className="text-sm text-gray-500">Complete the answer with the missing word</p>
            </div>
          </button>

          <button
            onClick={() => toggleMode('typed')}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
              selectedModes.includes('typed')
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              selectedModes.includes('typed')
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-500'
            }`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Typed Answer</p>
              <p className="text-sm text-gray-500">Type the full answer yourself</p>
            </div>
          </button>
        </div>
      </div>

      {/* Question count */}
      <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-50 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Number of Questions</h2>
        <div className="flex items-center gap-3">
          {[5, 10, 15, 20].map(count => (
            <button
              key={count}
              onClick={() => setQuestionCount(count)}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                questionCount === count
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={startQuiz}
        className="w-full py-4 rounded-2xl font-semibold text-lg bg-primary-500 text-white hover:bg-primary-600 shadow-soft transition-all"
      >
        Start Quiz
      </button>
    </div>
  )
}
