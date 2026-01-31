'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface BasicStats {
  streak: number
  totalCards: number
  cardsStudied: number
  totalAttempts: number
  overallAccuracy: number | null
  studyDaysCount: number
}

interface DetailedStats {
  mastery: {
    new: number
    learning: number
    young: number
    mature: number
  }
  dailyActivity: {
    date: string
    cardsStudied: number
    correct: number
  }[]
  deckPerformance: {
    id: number
    name: string
    cardCount: number
    studied: number
    correct: number
    incorrect: number
    accuracy: number | null
    needsWork: boolean
    avgInterval: number
  }[]
  cardsDueToday: number
  upcomingReviews: {
    date: string
    count: number
  }[]
}

export default function StatsPage() {
  const [basicStats, setBasicStats] = useState<BasicStats | null>(null)
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [basicRes, detailedRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/stats/detailed')
        ])

        if (basicRes.ok) {
          setBasicStats(await basicRes.json())
        }
        if (detailedRes.ok) {
          setDetailedStats(await detailedRes.json())
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    )
  }

  const mastery = detailedStats?.mastery || { new: 0, learning: 0, young: 0, mature: 0 }
  const totalMastery = mastery.new + mastery.learning + mastery.young + mastery.mature

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your Stats</h1>
        <p className="text-gray-500 mt-1">Track your learning progress</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{basicStats?.streak || 0}</p>
              <p className="text-sm text-gray-500">Day Streak</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{basicStats?.totalCards || 0}</p>
              <p className="text-sm text-gray-500">Total Cards</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{basicStats?.overallAccuracy ?? '--'}%</p>
              <p className="text-sm text-gray-500">Accuracy</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{detailedStats?.cardsDueToday || 0}</p>
              <p className="text-sm text-gray-500">Due Today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card Mastery Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Card Mastery</h2>

        {totalMastery === 0 ? (
          <p className="text-gray-500 text-center py-8">No cards yet. Create a deck to get started!</p>
        ) : (
          <>
            {/* Progress bar */}
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden flex mb-4">
              {mastery.mature > 0 && (
                <div
                  className="bg-green-500 h-full"
                  style={{ width: `${(mastery.mature / totalMastery) * 100}%` }}
                  title={`Mature: ${mastery.mature}`}
                />
              )}
              {mastery.young > 0 && (
                <div
                  className="bg-yellow-400 h-full"
                  style={{ width: `${(mastery.young / totalMastery) * 100}%` }}
                  title={`Young: ${mastery.young}`}
                />
              )}
              {mastery.learning > 0 && (
                <div
                  className="bg-orange-400 h-full"
                  style={{ width: `${(mastery.learning / totalMastery) * 100}%` }}
                  title={`Learning: ${mastery.learning}`}
                />
              )}
              {mastery.new > 0 && (
                <div
                  className="bg-blue-400 h-full"
                  style={{ width: `${(mastery.new / totalMastery) * 100}%` }}
                  title={`New: ${mastery.new}`}
                />
              )}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-400" />
                <span className="text-sm text-gray-600">New</span>
                <span className="text-sm font-medium text-gray-900 ml-auto">{mastery.new}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-400" />
                <span className="text-sm text-gray-600">Learning</span>
                <span className="text-sm font-medium text-gray-900 ml-auto">{mastery.learning}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="text-sm text-gray-600">Young</span>
                <span className="text-sm font-medium text-gray-900 ml-auto">{mastery.young}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-gray-600">Mature</span>
                <span className="text-sm font-medium text-gray-900 ml-auto">{mastery.mature}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Two column layout for activity and upcoming */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Study Activity (Last 30 Days) */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Study Activity</h2>

          {!detailedStats?.dailyActivity?.length ? (
            <p className="text-gray-500 text-center py-8">No study activity yet</p>
          ) : (
            <div className="space-y-2">
              {/* Activity heatmap - last 30 days */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 30 }, (_, i) => {
                  const date = new Date()
                  date.setDate(date.getDate() - (29 - i))
                  const dateStr = date.toISOString().split('T')[0]
                  const activity = detailedStats.dailyActivity.find(d => d.date === dateStr)
                  const count = activity?.cardsStudied || 0

                  let bgColor = 'bg-gray-100'
                  if (count > 0) bgColor = 'bg-green-200'
                  if (count >= 10) bgColor = 'bg-green-300'
                  if (count >= 25) bgColor = 'bg-green-400'
                  if (count >= 50) bgColor = 'bg-green-500'

                  return (
                    <div
                      key={dateStr}
                      className={`aspect-square rounded ${bgColor}`}
                      title={`${date.toLocaleDateString()}: ${count} cards`}
                    />
                  )
                })}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                <span>30 days ago</span>
                <div className="flex items-center gap-1">
                  <span>Less</span>
                  <div className="w-3 h-3 rounded bg-gray-100" />
                  <div className="w-3 h-3 rounded bg-green-200" />
                  <div className="w-3 h-3 rounded bg-green-300" />
                  <div className="w-3 h-3 rounded bg-green-400" />
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span>More</span>
                </div>
                <span>Today</span>
              </div>
            </div>
          )}
        </div>

        {/* Upcoming Reviews */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Reviews</h2>

          {!detailedStats?.upcomingReviews?.length && !detailedStats?.cardsDueToday ? (
            <p className="text-gray-500 text-center py-8">No upcoming reviews</p>
          ) : (
            <div className="space-y-3">
              {/* Today */}
              {detailedStats?.cardsDueToday > 0 && (
                <Link
                  href="/study"
                  className="flex items-center justify-between p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-red-600">!</span>
                    </div>
                    <span className="font-medium text-gray-900">Today</span>
                  </div>
                  <span className="text-sm font-medium text-red-600">{detailedStats.cardsDueToday} cards</span>
                </Link>
              )}

              {/* Future days */}
              {detailedStats?.upcomingReviews?.map(({ date, count }) => {
                const reviewDate = new Date(date)
                const today = new Date()
                const diffDays = Math.ceil((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                const dayLabel = diffDays === 1 ? 'Tomorrow' : reviewDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

                return (
                  <div key={date} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">{diffDays}d</span>
                      </div>
                      <span className="text-gray-700">{dayLabel}</span>
                    </div>
                    <span className="text-sm text-gray-500">{count} cards</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Deck Performance */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Deck Performance</h2>

        {!detailedStats?.deckPerformance?.length ? (
          <p className="text-gray-500 text-center py-8">No decks yet</p>
        ) : (
          <div className="space-y-3">
            {detailedStats.deckPerformance.map(deck => (
              <Link
                key={deck.id}
                href={`/study?deck=${deck.id}`}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    deck.needsWork ? 'bg-red-100' : deck.accuracy !== null ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {deck.accuracy !== null ? (
                      <span className={`text-sm font-bold ${deck.needsWork ? 'text-red-600' : 'text-green-600'}`}>
                        {deck.accuracy}%
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-gray-400">--</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{deck.name}</p>
                    <p className="text-sm text-gray-500">
                      {deck.studied} / {deck.cardCount} studied
                      {deck.avgInterval > 0 && ` • Avg ${deck.avgInterval}d interval`}
                    </p>
                  </div>
                </div>
                {deck.needsWork && (
                  <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full ml-4">
                    Needs Practice
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Study Days */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Study Consistency</h2>
            <p className="text-gray-500 text-sm mt-1">
              You've studied on {basicStats?.studyDaysCount || 0} different days
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">{basicStats?.totalAttempts || 0}</p>
            <p className="text-sm text-gray-500">Total Reviews</p>
          </div>
        </div>
      </div>
    </div>
  )
}
