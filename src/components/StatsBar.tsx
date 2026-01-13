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
    <div className="flex items-center justify-center gap-6 mb-8 py-4 px-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="text-center">
        <div className="flex items-center gap-1">
          <span className="text-2xl">🔥</span>
          <span className="text-2xl font-bold text-orange-500">{stats.streak}</span>
        </div>
        <p className="text-xs text-gray-500">Day Streak</p>
      </div>

      <div className="h-8 w-px bg-gray-200" />

      <div className="text-center">
        <p className="text-xl font-semibold text-gray-900">{stats.cardsStudied}</p>
        <p className="text-xs text-gray-500">Cards Studied</p>
      </div>

      <div className="h-8 w-px bg-gray-200" />

      <div className="text-center">
        <p className="text-xl font-semibold text-primary-600">
          {stats.overallAccuracy !== null ? `${stats.overallAccuracy}%` : '-'}
        </p>
        <p className="text-xs text-gray-500">Accuracy</p>
      </div>
    </div>
  )
}
