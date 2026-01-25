'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DeckList from './DeckList'

type StudyMode = 'all' | 'weak' | 'trouble'

export default function DeckSelector() {
  const router = useRouter()
  const [selectMode, setSelectMode] = useState(false)
  const [selectedDecks, setSelectedDecks] = useState<number[]>([])
  const [showModeMenu, setShowModeMenu] = useState(false)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergeTarget, setMergeTarget] = useState<'new' | 'existing'>('new')
  const [newDeckName, setNewDeckName] = useState('')
  const [merging, setMerging] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleStudyCombined = (mode: StudyMode = 'all') => {
    if (selectedDecks.length < 2) return
    let url = `/study?decks=${selectedDecks.join(',')}`
    if (mode === 'weak') url += '&weak=true'
    if (mode === 'trouble') url += '&trouble=true'
    router.push(url)
  }

  const handleMerge = async () => {
    if (selectedDecks.length < 2) return
    if (mergeTarget === 'new' && !newDeckName.trim()) return

    setMerging(true)
    try {
      const response = await fetch('/api/decks/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceDeckIds: selectedDecks,
          ...(mergeTarget === 'new'
            ? { newDeckName: newDeckName.trim() }
            : { targetDeckId: selectedDecks[0] }
          ),
        }),
      })

      if (!response.ok) throw new Error('Failed to merge')

      const result = await response.json()

      // Reset state and refresh
      setShowMergeModal(false)
      setSelectMode(false)
      setSelectedDecks([])
      setNewDeckName('')

      // Navigate to the merged deck
      router.push(`/edit/${result.deck.id}`)
    } catch {
      alert('Failed to merge decks')
    } finally {
      setMerging(false)
    }
  }

  const handleDelete = async () => {
    if (selectedDecks.length === 0) return
    if (!confirm(`Delete ${selectedDecks.length} deck${selectedDecks.length !== 1 ? 's' : ''}? This cannot be undone.`)) return

    setDeleting(true)
    try {
      await Promise.all(
        selectedDecks.map(deckId =>
          fetch(`/api/decks/${deckId}`, { method: 'DELETE' })
        )
      )
      setSelectMode(false)
      setSelectedDecks([])
      setRefreshKey(prev => prev + 1) // Trigger DeckList refresh
    } catch {
      alert('Failed to delete some decks')
    } finally {
      setDeleting(false)
    }
  }

  const handleCancel = () => {
    setSelectMode(false)
    setSelectedDecks([])
    setShowModeMenu(false)
    setShowMergeModal(false)
  }

  return (
    <div>
      {/* Combine mode toggle */}
      <div className="flex items-center justify-between mb-4">
        {selectMode ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {selectedDecks.length} deck{selectedDecks.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div />
        )}

        {selectMode ? (
          <div className="relative">
            <div className="flex items-center gap-2">
              {/* Delete button */}
              <button
                onClick={handleDelete}
                disabled={selectedDecks.length === 0 || deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              {/* Merge button */}
              <button
                onClick={() => setShowMergeModal(true)}
                disabled={selectedDecks.length < 2}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Merge
              </button>
              {/* Main study button */}
              <button
                onClick={() => handleStudyCombined('all')}
                disabled={selectedDecks.length < 2}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-l-xl hover:bg-primary-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Study ({selectedDecks.length})
              </button>
              {/* Dropdown toggle */}
              <button
                onClick={() => setShowModeMenu(!showModeMenu)}
                disabled={selectedDecks.length < 2}
                className="px-2 py-2 bg-primary-500 text-white rounded-r-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-l border-primary-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Mode dropdown */}
            {showModeMenu && selectedDecks.length >= 2 && (
              <div className="absolute right-0 top-12 z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-2 min-w-[180px]">
                <button
                  onClick={() => { handleStudyCombined('all'); setShowModeMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  All Cards
                </button>
                <button
                  onClick={() => { handleStudyCombined('weak'); setShowModeMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Weak Cards Only
                </button>
                <button
                  onClick={() => { handleStudyCombined('trouble'); setShowModeMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Trouble Cards Only
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setSelectMode(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Combine Decks
          </button>
        )}
      </div>

      <DeckList
        key={refreshKey}
        selectMode={selectMode}
        selectedDecks={selectedDecks}
        onSelectionChange={setSelectedDecks}
      />

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Merge {selectedDecks.length} Decks</h2>

            <div className="space-y-4">
              {/* Merge target options */}
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="mergeTarget"
                    checked={mergeTarget === 'new'}
                    onChange={() => setMergeTarget('new')}
                    className="w-4 h-4 text-primary-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Create new deck</p>
                    <p className="text-sm text-gray-500">Combine all cards into a new deck</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="mergeTarget"
                    checked={mergeTarget === 'existing'}
                    onChange={() => setMergeTarget('existing')}
                    className="w-4 h-4 text-primary-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Merge into first selected</p>
                    <p className="text-sm text-gray-500">Add all cards to the first deck you selected</p>
                  </div>
                </label>
              </div>

              {/* New deck name input */}
              {mergeTarget === 'new' && (
                <input
                  type="text"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="New deck name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus
                />
              )}

              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-xl">
                This will permanently merge the selected decks. The source decks will be deleted.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowMergeModal(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMerge}
                disabled={merging || (mergeTarget === 'new' && !newDeckName.trim())}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {merging ? 'Merging...' : 'Merge Decks'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
