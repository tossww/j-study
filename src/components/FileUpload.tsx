'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
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
  const [files, setFiles] = useState<File[]>([])
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

  // Handle paste from clipboard (images and files)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const newFiles: File[] = []

      for (const item of items) {
        // Handle image paste
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const blob = item.getAsFile()
          if (blob) {
            // Create a file with a proper name
            const extension = item.type.split('/')[1] || 'png'
            const fileName = `pasted-image-${Date.now()}-${newFiles.length}.${extension}`
            const file = new File([blob], fileName, { type: item.type })
            newFiles.push(file)
          }
        }
        // Handle file paste (some browsers support this)
        else if (item.kind === 'file') {
          e.preventDefault()
          const pastedFile = item.getAsFile()
          if (pastedFile) {
            newFiles.push(pastedFile)
          }
        }
      }

      if (newFiles.length > 0) {
        setFiles(prev => [...prev, ...newFiles])
        setError(null)
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files)
      setFiles(prev => [...prev, ...droppedFiles])
      setError(null)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files)
      setFiles(prev => [...prev, ...selectedFiles])
      setError(null)
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const generateDeck = async () => {
    if (!instructions.trim() && files.length === 0) return

    setUploading(true)
    setError(null)

    try {
      let data: UploadResponse
      let currentDeckId = uploadResult?.deck.id

      if (files.length > 0) {
        // Process files one by one
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const formData = new FormData()
          formData.append('file', file)

          if (currentDeckId) {
            formData.append('deckId', currentDeckId.toString())
          } else if (deckName) {
            formData.append('deckName', deckName)
          }

          // Only add instructions to the first file
          if (i === 0 && instructions.trim()) {
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
            throw new Error(result.error || `Upload failed for ${file.name}`)
          }

          // Use the deck ID from first upload for subsequent files
          if (!currentDeckId) {
            currentDeckId = result.deck.id
          }
          data = result
        }
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
      setUploadResult(data!)
      setShowUploader(false)
      setFiles([])
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
    setFiles([])
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

  const canSubmit = instructions.trim() || files.length > 0

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
              : files.length > 0
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            type="file"
            onChange={handleChange}
            accept=".pdf,.txt,.md,.markdown,.png,.jpg,.jpeg,.gif,.webp,.heic,.heif"
            multiple
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          {files.length > 0 ? (
            <div className="space-y-2 w-full">
              {/* File list */}
              <div className="flex flex-wrap gap-2 justify-center">
                {files.map((file, index) => {
                  const isImage = file.type.startsWith('image/') ||
                    /\.(png|jpg|jpeg|gif|webp)$/i.test(file.name)
                  return (
                    <div key={index} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1">
                      {/* Image thumbnail */}
                      {isImage && (
                        <img
                          src={URL.createObjectURL(file)}
                          alt="Preview"
                          className="h-8 w-8 object-cover rounded"
                        />
                      )}
                      {/* File icon for non-images */}
                      {!isImage && (
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      <span className="text-xs text-gray-600 max-w-[100px] truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(index)
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 text-center">
                {files.length} file{files.length !== 1 ? 's' : ''} selected - drop or paste more
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500">
                <span className="font-medium text-primary-600">Drop, click, or paste</span> files (PDF, TXT, images, HEIC)
              </p>
              <p className="text-xs text-gray-400 mt-1">Multiple files supported</p>
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
