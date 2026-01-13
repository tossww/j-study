'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import UploadResult from './UploadResult'
import type { DeckAnalysis } from '@/db/schema'

interface UploadResponse {
  success: boolean
  deck: { id: number; name: string }
  cardsCreated: number
  totalCards: number
  analysis: DeckAnalysis
}

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [deckName, setDeckName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null)
  const [showUploader, setShowUploader] = useState(true)
  const router = useRouter()

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

  const uploadFile = async (generateAnswers: boolean = false) => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // If we have an existing deck, add to it
      if (uploadResult?.deck.id) {
        formData.append('deckId', uploadResult.deck.id.toString())
      } else if (deckName) {
        formData.append('deckName', deckName)
      }

      if (generateAnswers) {
        formData.append('generateAnswers', 'true')
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      // Show results instead of redirecting
      setUploadResult(data)
      setShowUploader(false)
      setFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await uploadFile(false)
  }

  const handleAddMore = () => {
    setShowUploader(true)
    setFile(null)
  }

  const handleStudy = () => {
    if (uploadResult?.deck.id) {
      router.push(`/study?deck=${uploadResult.deck.id}`)
    }
  }

  const handleGenerateAnswers = async () => {
    // Re-upload with generateAnswers flag
    // We need to re-select a file or use the same content
    // For simplicity, we'll just redirect to study for now
    // In a full implementation, we'd re-process with the flag
    if (uploadResult?.deck.id) {
      setUploading(true)
      try {
        const formData = new FormData()
        // Create a placeholder to trigger answer generation
        formData.append('deckId', uploadResult.deck.id.toString())
        formData.append('generateAnswers', 'true')
        // Note: This would need the original content or file
        // For now, just redirect to study
        router.push(`/study?deck=${uploadResult.deck.id}`)
      } finally {
        setUploading(false)
      }
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
        onGenerateAnswers={uploadResult.analysis.specialAction ? handleGenerateAnswers : undefined}
      />
    )
  }

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
            placeholder="e.g., Biology Chapter 5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      )}

      {/* File drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
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
          <div>
            <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-sm text-gray-600">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-semibold text-primary-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PDF, TXT, or Markdown files</p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={!file || uploading}
        className={`mt-4 w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          !file || uploading
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
            Analyzing & generating flashcards...
          </span>
        ) : uploadResult ? (
          'Add to Deck'
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
