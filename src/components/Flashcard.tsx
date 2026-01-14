'use client'

import { useState } from 'react'

interface FlashcardProps {
  front: string
  back: string
  onResult: (correct: boolean) => void
  onEdit?: () => void
}

export default function Flashcard({ front, back, onResult, onEdit }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false)

  const handleFlip = () => {
    setFlipped(!flipped)
  }

  const handleResult = (correct: boolean) => {
    setFlipped(false)
    onResult(correct)
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Flashcard */}
      <div
        className="flip-card h-64 cursor-pointer"
        onClick={handleFlip}
      >
        <div className={`flip-card-inner relative w-full h-full ${flipped ? 'flipped' : ''}`}>
          {/* Front of card */}
          <div className="flip-card-front absolute w-full h-full bg-white rounded-xl shadow-lg p-6 flex items-center justify-center">
            <p className="text-xl text-center text-gray-800">{front}</p>
          </div>

          {/* Back of card */}
          <div className="flip-card-back absolute w-full h-full bg-primary-50 rounded-xl shadow-lg p-6 flex items-center justify-center">
            <p className="text-xl text-center text-gray-800">{back}</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-center text-gray-500 text-sm mt-4 mb-4">
        {flipped ? 'How did you do?' : 'Click card to reveal answer'}
      </p>

      {/* Result buttons - only show when flipped */}
      {flipped && (
        <div className="flex gap-4 justify-center items-center">
          <button
            onClick={() => handleResult(false)}
            className="px-8 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
          >
            Don't Know
          </button>
          <button
            onClick={() => handleResult(true)}
            className="px-8 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
          >
            Got It!
          </button>
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit card"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
