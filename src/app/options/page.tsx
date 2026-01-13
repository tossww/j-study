'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DEFAULT_PROMPT, PROMPT_STORAGE_KEY } from '@/lib/prompt-config'

export default function OptionsPage() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [isCustom, setIsCustom] = useState(false)
  const [saved, setSaved] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(PROMPT_STORAGE_KEY)
    if (stored) {
      setPrompt(stored)
      setIsCustom(true)
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem(PROMPT_STORAGE_KEY, prompt)
    setIsCustom(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    if (confirm('Reset to default prompt? Your custom prompt will be deleted.')) {
      localStorage.removeItem(PROMPT_STORAGE_KEY)
      setPrompt(DEFAULT_PROMPT)
      setIsCustom(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            &larr; Back to Home
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Options</h1>
        <p className="text-gray-600 mb-8">Configure how the AI generates flashcards</p>

        {/* Prompt Editor */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Prompt</h2>
              <p className="text-sm text-gray-500">
                {isCustom ? (
                  <span className="text-amber-600">Using custom prompt</span>
                ) : (
                  'Using default prompt'
                )}
              </p>
            </div>
            {isCustom && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Reset to Default
              </button>
            )}
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-80 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
            placeholder="Enter your custom prompt..."
          />

          <div className="flex justify-between items-center mt-4">
            <p className="text-xs text-gray-400">
              The AI will use this prompt as the base instruction for generating flashcards.
            </p>
            <div className="flex items-center gap-3">
              {saved && (
                <span className="text-sm text-green-600">Saved!</span>
              )}
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Tips for custom prompts:</h3>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Keep the JSON structure requirement intact for proper parsing</li>
            <li>Customize the focus area (e.g., vocabulary, formulas, concepts)</li>
            <li>Add language-specific instructions if needed</li>
            <li>The additional instructions field during upload adds to this base prompt</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
