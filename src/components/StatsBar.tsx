'use client'

import { useState, useEffect } from 'react'

interface Stats {
  streak: number
  totalCards: number
  cardsStudied: number
  overallAccuracy: number | null
}

export default function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch {
        // Silently fail - stats are nice-to-have
      }
    }

    fetchStats()
  }, [])

  if (!stats) return null

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="p-4 bg-white rounded-2xl shadow-soft border border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-accent-peach flex items-center justify-center">
            <span className="text-lg">🔥</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.streak}</p>
            <p className="text-xs text-gray-500">Day Streak</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-2xl shadow-soft border border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-accent-sky flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.cardsStudied}</p>
            <p className="text-xs text-gray-500">Cards Studied</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-2xl shadow-soft border border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-accent-mint flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.overallAccuracy !== null ? `${stats.overallAccuracy}%` : '-'}
            </p>
            <p className="text-xs text-gray-500">Accuracy</p>
          </div>
        </div>
      </div>
    </div>
  )
}
