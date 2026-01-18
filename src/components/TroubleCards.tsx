'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
}

export default function TroubleCards() {
  const [cards, setCards] = useState<TroubleCard[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [expandedCard, setExpandedCard] = useState<number | null>(null)

  useEffect(() => {
    async function fetchTroubleCards() {
      try {
        const response = await fetch('/api/stats/trouble-cards?limit=5')
        const data = await response.json()
        if (data.success) {
          setCards(data.cards)
        }
      } catch (error) {
        console.error('Failed to fetch trouble cards:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTroubleCards()
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div className="h-5 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (cards.length === 0) {
    return null // Don't show section if no trouble cards
  }

  // Collapsed view - compact single line
  if (!expanded) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-left">
              <span className="font-medium text-gray-900">{cards.length} Trouble Card{cards.length !== 1 ? 's' : ''}</span>
              <span className="text-gray-500 text-sm ml-2">Cards you miss often</span>
            </div>
            <svg className="w-4 h-4 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <Link
            href="/study?trouble=true"
            className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            Practice
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    )
  }

  // Expanded view - full card list
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setExpanded(false)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900">Trouble Cards</h3>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <Link
          href="/study?trouble=true"
          className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
        >
          Practice All
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Card list */}
      <div className="space-y-2">
        {cards.map((card) => (
          <div
            key={card.id}
            className="group relative bg-gray-50 hover:bg-red-50 rounded-xl p-3 transition-colors cursor-pointer"
            onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate pr-6">
                  {card.front}
                </p>
                {expandedCard === card.id && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-600">{card.back}</p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {card.deckName || 'Unknown deck'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {card.errorRate}%
                </span>
                {expandedCard !== card.id && (
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
