'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import FolderContents from './FolderContents'
import DeckList from './DeckList'

interface FolderViewProps {
  folderId: number
}

export default function FolderView({ folderId }: FolderViewProps) {
  const router = useRouter()
  const [selectMode, setSelectMode] = useState(false)
  const [selectedDecks, setSelectedDecks] = useState<number[]>([])

  const handleStartQuiz = () => {
    if (selectedDecks.length === 0) return
    // Pass multiple deck IDs to quiz page
    const deckParams = selectedDecks.map(id => `deck=${id}`).join('&')
    router.push(`/quiz?${deckParams}`)
  }

  const handleCancelSelect = () => {
    setSelectMode(false)
    setSelectedDecks([])
  }

  return (
    <div>
      <FolderContents folderId={folderId} />

      {/* Selection toolbar */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          {selectMode ? `${selectedDecks.length} selected` : 'Decks in this folder'}
        </h2>
        <div className="flex items-center gap-2">
          {!selectMode ? (
            <>
              <button
                onClick={() => setSelectMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Select for Quiz
              </button>
              <Link
                href={`/upload?folderId=${folderId}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Deck
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={handleCancelSelect}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartQuiz}
                disabled={selectedDecks.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Create Quiz ({selectedDecks.length})
              </button>
            </>
          )}
        </div>
      </div>

      {selectMode ? (
        <DeckList
          folderId={folderId}
          selectMode={true}
          selectedDecks={selectedDecks}
          onSelectionChange={setSelectedDecks}
        />
      ) : (
        <DeckList folderId={folderId} />
      )}
    </div>
  )
}
