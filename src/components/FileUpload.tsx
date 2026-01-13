'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import UploadResult from './UploadResult'
import type { DeckAnalysis } from '@/db/schema'
import { PROMPT_STORAGE_KEY } from '@/lib/prompt-config'

interface UploadResponse {
  success: boolean
  deck: { id: number; name: string }
  cardsCreated: number
  totalCards: number
  analysis?: DeckAnalysis
  isNewDeck?: boolean
}

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [deckName, setDeckName] = useState('')
  const [instructions, setInstructions] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null)
  const [showUploader, setShowUploader] = useState(true)
  const [customPrompt, setCustomPrompt] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem(PROMPT_STORAGE_KEY)
    if (stored) {
      setCustomPrompt(stored)
    }
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
      setError(null)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const generateDeck = async () => {
    if (!instructions.trim() && !file) return

    setUploading(true)
    setError(null)

    try {
      let data: UploadResponse

      if (file) {
        // File-based generation (uses /api/upload)
        const formData = new FormData()
        formData.append('file', file)

        if (uploadResult?.deck.id) {
          formData.append('deckId', uploadResult.deck.id.toString())
        } else if (deckName) {
          formData.append('deckName', deckName)
        }

        if (instructions.trim()) {
          formData.append('additionalInstructions', instructions.trim())
        }

        if (customPrompt) {
          formData.append('customPrompt', customPrompt)
        }

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Upload failed')
        }
        data = result
      } else {
        // Instructions-only generation (uses /api/generate)
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deckId: uploadResult?.deck.id,
            deckName: deckName || undefined,
            instructions: instructions.trim(),
            customPrompt: customPrompt || undefined,
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Generation failed')
        }
        data = result
      }

      // Show results
      setUploadResult(data)
      setShowUploader(false)
      setFile(null)
      setInstructions('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await generateDeck()
  }

  const handleAddMore = () => {
    setShowUploader(true)
    setFile(null)
    setInstructions('')
  }

  const handleStudy = () => {
    if (uploadResult?.deck.id) {
      router.push(`/study?deck=${uploadResult.deck.id}`)
    }
  }

  const handleGenerateAnswers = async () => {
    if (uploadResult?.deck.id) {
      router.push(`/study?deck=${uploadResult.deck.id}`)
    }
  }

  // Show upload result if we have one and not showing uploader
  if (uploadResult && !showUploader) {
    return (
      <UploadResult
        deckName={uploadResult.deck.name}
        deckId={uploadResult.deck.id}
        cardsCreated={uploadResult.cardsCreated}
        totalCards={uploadResult.totalCards}
        analysis={uploadResult.analysis}
        onAddMore={handleAddMore}
        onStudy={handleStudy}
        onGenerateAnswers={uploadResult.analysis?.specialAction ? handleGenerateAnswers : undefined}
      />
    )
  }

  const canSubmit = instructions.trim() || file

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      {/* Show existing deck context if adding more */}
      {uploadResult && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            Adding to: <span className="font-medium">{uploadResult.deck.name}</span> ({uploadResult.totalCards} cards)
          </p>
        </div>
      )}

      {/* Deck name input - only show for new decks */}
      {!uploadResult && (
        <div className="mb-4">
          <label htmlFor="deckName" className="block text-sm font-medium text-gray-700 mb-1">
            Deck Name (optional)
          </label>
          <input
            type="text"
            id="deckName"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="e.g., Japanese Vocabulary, Biology Chapter 5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Instructions textarea - ALWAYS visible */}
      <div className="mb-4">
        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
          What do you want to learn?
        </label>
        <textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Describe what flashcards you want... e.g., '20 JLPT N3 vocabulary cards', 'Key concepts from photosynthesis', 'Spanish verb conjugations for beginners'"
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
        <p className="mt-1 text-xs text-gray-500">
          AI will generate flashcards based on your description
        </p>
      </div>

      {/* Optional file upload section */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Supporting Document (optional)
        </label>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
            dragActive
              ? 'border-primary-500 bg-primary-50'
              : file
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            type="file"
            onChange={handleChange}
            accept=".pdf,.txt,.md,.markdown"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          {file ? (
            <div className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-gray-600">{file.name}</span>
              <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setFile(null)
                }}
                className="ml-2 text-gray-400 hover:text-red-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500">
                <span className="font-medium text-primary-600">+ Add file</span> to provide context (PDF, TXT, MD)
              </p>
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Upload study material for AI to reference when creating cards
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={!canSubmit || uploading}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          !canSubmit || uploading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-primary-600 text-white hover:bg-primary-700'
        }`}
      >
        {uploading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating flashcards...
          </span>
        ) : uploadResult ? (
          'Add More Cards'
        ) : (
          'Generate Flashcards'
        )}
      </button>

      {/* Cancel button when adding more */}
      {uploadResult && (
        <button
          type="button"
          onClick={() => setShowUploader(false)}
          className="mt-2 w-full py-2 px-4 text-gray-600 text-sm hover:text-gray-900 transition-colors"
        >
          Cancel
        </button>
      )}
    </form>
  )
}
