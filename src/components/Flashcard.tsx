'use client'

import { useState } from 'react'

// SRS Grade types
export type SRSGrade = 'again' | 'hard' | 'good' | 'easy'

interface SRSData {
  repetitions: number
  interval: number
  easeFactor: number
  learningStep?: number
}

interface FlashcardProps {
  front: string
  back: string
  onResult: (grade: SRSGrade) => void
  onEdit?: () => void
  srsData?: SRSData
  viewOnly?: boolean
  reverseMode?: boolean
}

// Calculate SRS level based on learning step, repetitions, and interval
function getSRSLevel(srs?: SRSData): { label: string; color: string; bgColor: string } {
  if (!srs) return { label: 'New', color: 'text-gray-600', bgColor: 'bg-gray-100' }

  const { repetitions, interval, learningStep = 0 } = srs

  // New cards that haven't been seen
  if (learningStep === 0 && repetitions === 0) {
    return { label: 'New', color: 'text-blue-600', bgColor: 'bg-blue-100' }
  }
  // Learning phase (steps 1-2)
  if (learningStep < 3) {
    return { label: 'Learning', color: 'text-orange-600', bgColor: 'bg-orange-100' }
  }
  // Young cards (just graduated, short intervals)
  if (repetitions <= 4 || interval <= 14) {
    return { label: 'Young', color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
  }
  // Mature cards
  return { label: 'Mature', color: 'text-green-600', bgColor: 'bg-green-100' }
}

// Calculate interval preview for each grade
function getIntervalPreview(srs?: SRSData): { again: string; hard: string; good: string; easy: string } {
  if (!srs) {
    return { again: '1m', hard: '1m', good: '10m', easy: '4d' }
  }

  const { interval, easeFactor, learningStep = 0 } = srs
  const ef = easeFactor / 100

  // Learning phase - show step-based intervals
  if (learningStep < 3) {
    return {
      again: '1m',
      hard: '1m',
      good: learningStep === 0 ? '1m' : learningStep === 1 ? '10m' : '1d',
      easy: '4d'
    }
  }

  // Review phase - calculate based on current interval and ease factor
  const hardInterval = Math.max(1, Math.round(interval * 1.2))
  const goodInterval = Math.max(1, Math.round(interval * ef))
  const easyInterval = Math.max(1, Math.round(interval * ef * 1.3))

  return {
    again: '10m', // Back to learning
    hard: formatInterval(hardInterval),
    good: formatInterval(goodInterval),
    easy: formatInterval(easyInterval)
  }
}

function formatInterval(days: number): string {
  if (days === 0) return '<1d'
  if (days === 1) return '1d'
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.round(days / 7)}w`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${(days / 365).toFixed(1)}y`
}

export default function Flashcard({ front, back, onResult, onEdit, srsData, viewOnly = false, reverseMode = false }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false)
  const srsLevel = getSRSLevel(srsData)
  const intervals = getIntervalPreview(srsData)

  const handleFlip = () => {
    setFlipped(!flipped)
  }

  const handleGrade = (grade: SRSGrade) => {
    setFlipped(false)
    onResult(grade)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* SRS Level Badge */}
      <div className="flex justify-center mb-3">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${srsLevel.bgColor} ${srsLevel.color}`}>
          {srsLevel.label}
          {srsData && srsData.interval > 0 && (
            <span className="ml-1 opacity-75">• {srsData.interval}d interval</span>
          )}
        </span>
      </div>

      {/* Flashcard */}
      <div
        className="flip-card h-96 cursor-pointer"
        onClick={handleFlip}
      >
        <div className={`flip-card-inner relative w-full h-full ${flipped ? 'flipped' : ''}`}>
          {/* Front of card */}
          <div className="flip-card-front absolute w-full h-full bg-white rounded-xl shadow-lg p-6 flex items-center justify-center overflow-y-auto">
            <p className="text-xl text-center text-gray-800 whitespace-pre-wrap">{front}</p>
          </div>

          {/* Back of card */}
          <div className="flip-card-back absolute w-full h-full bg-primary-50 rounded-xl shadow-lg p-6 flex items-center justify-center overflow-y-auto">
            <p className="text-xl text-center text-gray-800 whitespace-pre-wrap">{back}</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-center text-gray-500 text-sm mt-4 mb-4">
        {viewOnly
          ? (flipped ? 'Reviewing previous card' : `Click card to reveal ${reverseMode ? 'question' : 'answer'}`)
          : (flipped ? 'How well did you know this?' : `Click card to reveal ${reverseMode ? 'question' : 'answer'}`)
        }
      </p>

      {/* 4-Button Grading - only show when flipped and not in view-only mode */}
      {flipped && !viewOnly && (
        <div className="space-y-3">
          {/* Grade buttons */}
          <div className="flex gap-2 justify-center items-stretch">
            <button
              onClick={() => handleGrade('again')}
              className="flex-1 max-w-[140px] px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium flex flex-col items-center"
            >
              <span>Again</span>
              <span className="text-xs opacity-75 mt-0.5">{intervals.again}</span>
            </button>
            <button
              onClick={() => handleGrade('hard')}
              className="flex-1 max-w-[140px] px-4 py-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors font-medium flex flex-col items-center"
            >
              <span>Hard</span>
              <span className="text-xs opacity-75 mt-0.5">{intervals.hard}</span>
            </button>
            <button
              onClick={() => handleGrade('good')}
              className="flex-1 max-w-[140px] px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium flex flex-col items-center"
            >
              <span>Good</span>
              <span className="text-xs opacity-75 mt-0.5">{intervals.good}</span>
            </button>
            <button
              onClick={() => handleGrade('easy')}
              className="flex-1 max-w-[140px] px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium flex flex-col items-center"
            >
              <span>Easy</span>
              <span className="text-xs opacity-75 mt-0.5">{intervals.easy}</span>
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
          {/* Keyboard hints */}
          <p className="text-xs text-gray-400 text-center">
            Keyboard: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
          </p>
        </div>
      )}
    </div>
  )
}
