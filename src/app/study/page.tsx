import Link from 'next/link'
import { Suspense } from 'react'
import DeckList from '@/components/DeckList'
import StudySessionWrapper from './StudySessionWrapper'

export default function StudyPage({
  searchParams,
}: {
  searchParams: { deck?: string }
}) {
  const deckId = searchParams.deck ? parseInt(searchParams.deck) : null

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            &larr; Back
          </Link>
          <Link
            href="/upload"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            + Add Deck
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {deckId ? 'Study Session' : 'Your Decks'}
        </h1>

        <Suspense fallback={<div className="text-center">Loading...</div>}>
          {deckId ? (
            <StudySessionWrapper deckId={deckId} />
          ) : (
            <DeckList />
          )}
        </Suspense>
      </div>
    </div>
  )
}
