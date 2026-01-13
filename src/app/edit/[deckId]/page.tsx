'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { PROMPT_STORAGE_KEY } from '@/lib/prompt-config'

interface Deck {
  id: number
  name: string
  description: string | null
}

interface Flashcard {
  id: number
  deckId: number
  front: string
  back: string
}

export default function EditDeckPage({
  params,
}: {
  params: Promise<{ deckId: string }>
}) {
  const { deckId: deckIdStr } = use(params)
  const deckId = parseInt(deckIdStr)

  const [deck, setDeck] = useState<Deck | null>(null)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Deck editing state
  const [editingDeck, setEditingDeck] = useState(false)
  const [deckName, setDeckName] = useState('')
  const [deckDescription, setDeckDescription] = useState('')
  const [savingDeck, setSavingDeck] = useState(false)

  // Card editing state
  const [editingCardId, setEditingCardId] = useState<number | null>(null)
  const [editFront, setEditFront] = useState('')
  const [editBack, setEditBack] = useState('')
  const [savingCard, setSavingCard] = useState(false)

  // New card state
  const [showAddCard, setShowAddCard] = useState(false)
  const [newFront, setNewFront] = useState('')
  const [newBack, setNewBack] = useState('')
  const [addingCard, setAddingCard] = useState(false)

  // AI generation state
  const [aiInstructions, setAiInstructions] = useState('')
  const [aiFile, setAiFile] = useState<File | null>(null)
  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiSuccess, setAiSuccess] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [deckRes, cardsRes] = await Promise.all([
          fetch(`/api/decks/${deckId}`),
          fetch(`/api/flashcards/${deckId}`),
        ])

        if (!deckRes.ok) throw new Error('Deck not found')
        if (!cardsRes.ok) throw new Error('Failed to load cards')

        const deckData = await deckRes.json()
        const cardsData = await cardsRes.json()

        setDeck(deckData)
        setDeckName(deckData.name)
        setDeckDescription(deckData.description || '')
        setCards(cardsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load deck')
      } finally {
        setLoading(false)
      }
    }

    if (!isNaN(deckId)) {
      fetchData()
    } else {
      setError('Invalid deck ID')
      setLoading(false)
    }
  }, [deckId])

  const handleSaveDeck = async () => {
    if (!deckName.trim()) return

    setSavingDeck(true)
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: deckName.trim(),
          description: deckDescription.trim() || null,
        }),
      })

      if (!res.ok) throw new Error('Failed to save')

      const updated = await res.json()
      setDeck(updated)
      setEditingDeck(false)
    } catch {
      alert('Failed to save deck')
    } finally {
      setSavingDeck(false)
    }
  }

  const handleEditCard = (card: Flashcard) => {
    setEditingCardId(card.id)
    setEditFront(card.front)
    setEditBack(card.back)
  }

  const handleSaveCard = async () => {
    if (!editFront.trim() || !editBack.trim() || !editingCardId) return

    setSavingCard(true)
    try {
      const res = await fetch(`/api/flashcards/card/${editingCardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front: editFront.trim(),
          back: editBack.trim(),
        }),
      })

      if (!res.ok) throw new Error('Failed to save')

      const updated = await res.json()
      setCards(cards.map(c => (c.id === updated.id ? updated : c)))
      setEditingCardId(null)
    } catch {
      alert('Failed to save card')
    } finally {
      setSavingCard(false)
    }
  }

  const handleDeleteCard = async (cardId: number) => {
    if (!confirm('Delete this flashcard?')) return

    try {
      const res = await fetch(`/api/flashcards/card/${cardId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete')

      setCards(cards.filter(c => c.id !== cardId))
    } catch {
      alert('Failed to delete card')
    }
  }

  const handleAddCard = async () => {
    if (!newFront.trim() || !newBack.trim()) return

    setAddingCard(true)
    try {
      const res = await fetch(`/api/flashcards/${deckId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front: newFront.trim(),
          back: newBack.trim(),
        }),
      })

      if (!res.ok) throw new Error('Failed to add')

      const newCard = await res.json()
      setCards([...cards, newCard])
      setNewFront('')
      setNewBack('')
      setShowAddCard(false)
    } catch {
      alert('Failed to add card')
    } finally {
      setAddingCard(false)
    }
  }

  const handleAiGenerate = async () => {
    if (!aiInstructions.trim() && !aiFile) return

    setGenerating(true)
    setAiError(null)
    setAiSuccess(null)

    try {
      const customPrompt = localStorage.getItem(PROMPT_STORAGE_KEY)
      let cardsCreated = 0

      if (aiFile) {
        // File-based generation
        const formData = new FormData()
        formData.append('file', aiFile)
        formData.append('deckId', deckId.toString())

        if (aiInstructions.trim()) {
          formData.append('additionalInstructions', aiInstructions.trim())
        }

        if (customPrompt) {
          formData.append('customPrompt', customPrompt)
        }

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Generation failed')
        }
        cardsCreated = data.cardsCreated
      } else {
        // Instructions-only generation
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deckId,
            instructions: aiInstructions.trim(),
            customPrompt: customPrompt || undefined,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Generation failed')
        }
        cardsCreated = data.cardsCreated
      }

      // Refresh cards list
      const cardsRes = await fetch(`/api/flashcards/${deckId}`)
      if (cardsRes.ok) {
        const cardsData = await cardsRes.json()
        setCards(cardsData)
      }

      // Reset state and show success
      setAiFile(null)
      setAiInstructions('')
      setAiSuccess(`${cardsCreated} new card${cardsCreated !== 1 ? 's' : ''} added!`)

      // Clear success message after 4 seconds
      setTimeout(() => setAiSuccess(null), 4000)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !deck) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/study" className="text-gray-600 hover:text-gray-900">
            &larr; Back
          </Link>
          <div className="mt-8 text-center text-red-600">{error || 'Deck not found'}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link href="/study" className="text-gray-600 hover:text-gray-900">
            &larr; Back to Decks
          </Link>
          <Link
            href={`/study?deck=${deckId}`}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            Study This Deck
          </Link>
        </div>

        {/* Deck Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          {editingDeck ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deck Name
                </label>
                <input
                  type="text"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Deck name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={deckDescription}
                  onChange={(e) => setDeckDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={2}
                  placeholder="Deck description"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveDeck}
                  disabled={savingDeck || !deckName.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {savingDeck ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditingDeck(false)
                    setDeckName(deck.name)
                    setDeckDescription(deck.description || '')
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{deck.name}</h1>
                {deck.description && (
                  <p className="text-gray-600 mt-1">{deck.description}</p>
                )}
                <p className="text-sm text-gray-400 mt-2">{cards.length} cards</p>
              </div>
              <button
                onClick={() => setEditingDeck(true)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit deck info"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* AI Generate Section - Always visible */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="font-medium text-gray-800">AI Generate Cards</h3>
          </div>

          <div className="space-y-3">
            {/* Instructions textarea - always visible */}
            <div>
              <textarea
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                placeholder="Tell the AI what cards to create... e.g., 'Generate 5 cards about Japanese verb conjugation' or 'Create vocabulary cards for JLPT N3 grammar'"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Optional file upload */}
            <div className="flex items-center gap-3">
              <div
                className={`relative flex-1 border-2 border-dashed rounded-lg p-3 text-center transition-colors cursor-pointer ${
                  aiFile
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-blue-400 bg-white'
                }`}
              >
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setAiFile(e.target.files[0])
                      setAiError(null)
                    }
                  }}
                  accept=".pdf,.txt,.md,.markdown"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {aiFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-600">{aiFile.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setAiFile(null)
                      }}
                      className="ml-2 text-gray-400 hover:text-red-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">+ Add file (optional)</p>
                )}
              </div>
            </div>

            {/* Success message */}
            {aiSuccess && (
              <div className="p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-600">{aiSuccess}</p>
              </div>
            )}

            {/* Error message */}
            {aiError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{aiError}</p>
              </div>
            )}

            <button
              onClick={handleAiGenerate}
              disabled={generating || (!aiInstructions.trim() && !aiFile)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating...
                </span>
              ) : (
                'Generate Cards'
              )}
            </button>
          </div>
        </div>

        {/* Flashcards Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Flashcards</h2>
          <button
            onClick={() => setShowAddCard(true)}
            className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
          >
            + Add Card Manually
          </button>
        </div>

        {/* Add Card Form */}
        {showAddCard && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <h3 className="font-medium text-green-800 mb-3">New Flashcard</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Front (Question)
                </label>
                <textarea
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={2}
                  placeholder="Enter the question"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Back (Answer)
                </label>
                <textarea
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={2}
                  placeholder="Enter the answer"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddCard}
                  disabled={addingCard || !newFront.trim() || !newBack.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {addingCard ? 'Adding...' : 'Add Card'}
                </button>
                <button
                  onClick={() => {
                    setShowAddCard(false)
                    setNewFront('')
                    setNewBack('')
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cards List */}
        <div className="space-y-3">
          {cards.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No flashcards yet. Add your first card above.
            </div>
          ) : (
            cards.map((card, index) => (
              <div
                key={card.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                {editingCardId === card.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Front (Question)
                      </label>
                      <textarea
                        value={editFront}
                        onChange={(e) => setEditFront(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Back (Answer)
                      </label>
                      <textarea
                        value={editBack}
                        onChange={(e) => setEditBack(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveCard}
                        disabled={savingCard || !editFront.trim() || !editBack.trim()}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {savingCard ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingCardId(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-400">#{index + 1}</span>
                      </div>
                      <div className="mb-2">
                        <span className="text-xs font-medium text-gray-500 uppercase">Front</span>
                        <p className="text-gray-900">{card.front}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">Back</span>
                        <p className="text-gray-700">{card.back}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditCard(card)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit card"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete card"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
