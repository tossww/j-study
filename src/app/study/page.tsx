import { Suspense } from 'react'
import DeckList from '@/components/DeckList'
import StatsBar from '@/components/StatsBar'
import StudySessionWrapper from './StudySessionWrapper'
import TroubleStudySession from '@/components/TroubleStudySession'

export default async function StudyPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string; weak?: string; trouble?: string }>
}) {
  const params = await searchParams
  const deckId = params.deck ? parseInt(params.deck) : null
  const weakOnly = params.weak === 'true'
  const troubleOnly = params.trouble === 'true'

  // Study trouble cards across all decks
  if (troubleOnly && !deckId) {
    return (
      <div className="max-w-4xl mx-auto">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        }>
          <TroubleStudySession />
        </Suspense>
      </div>
    )
  }

  if (deckId) {
    return (
      <div className="max-w-4xl mx-auto">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        }>
          <StudySessionWrapper deckId={deckId} weakOnly={weakOnly} troubleOnly={troubleOnly} />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Decks</h1>
        <p className="text-gray-500 mt-1">Select a deck to start studying</p>
      </div>

      <Suspense fallback={<div className="h-24 bg-white rounded-2xl animate-pulse" />}>
        <StatsBar />
      </Suspense>

      <div className="mt-8">
        <Suspense fallback={<div className="h-48 bg-white rounded-2xl animate-pulse" />}>
          <DeckList />
        </Suspense>
      </div>
    </div>
  )
}
