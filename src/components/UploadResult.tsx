'use client'

import type { DeckAnalysis } from '@/db/schema'

interface UploadResultProps {
  deckName: string
  deckId: number
  cardsCreated: number
  totalCards: number
  analysis: DeckAnalysis
  onAddMore: () => void
  onStudy: () => void
  onGenerateAnswers?: () => void
}

const contentTypeLabels: Record<string, string> = {
  notes: 'Lecture Notes',
  questions: 'Question Sheet',
  textbook: 'Textbook Content',
  slides: 'Presentation Slides',
  other: 'Study Material',
}

const coverageColors: Record<string, string> = {
  sparse: 'text-red-600 bg-red-50',
  moderate: 'text-yellow-600 bg-yellow-50',
  good: 'text-green-600 bg-green-50',
  comprehensive: 'text-blue-600 bg-blue-50',
}

export default function UploadResult({
  deckName,
  deckId,
  cardsCreated,
  totalCards,
  analysis,
  onAddMore,
  onStudy,
  onGenerateAnswers,
}: UploadResultProps) {
  return (
    <div className="w-full max-w-2xl">
      {/* Success header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{deckName}</h2>
        <p className="text-gray-600 mt-1">
          {cardsCreated} cards created • {totalCards} total in deck
        </p>
      </div>

      {/* Analysis panel */}
      <div className="bg-gray-50 rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          AI Analysis
        </h3>

        {/* Content type and coverage */}
        <div className="flex gap-3 mb-4">
          <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
            {contentTypeLabels[analysis.contentType] || analysis.contentType}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${coverageColors[analysis.coverage]}`}>
            {analysis.coverage.charAt(0).toUpperCase() + analysis.coverage.slice(1)} coverage
          </span>
        </div>

        {/* Topics */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Topics covered:</h4>
          <div className="flex flex-wrap gap-2">
            {analysis.topics.map((topic, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-600"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        {/* Suggestions */}
        {analysis.suggestions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Suggestions:</h4>
            <ul className="space-y-2">
              {analysis.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-yellow-500 mt-0.5">💡</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Special action prompt (e.g., question sheet detected) */}
        {analysis.specialAction && onGenerateAnswers && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📝</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  {analysis.specialAction.description}
                </p>
                <div className="mt-3 flex gap-3">
                  <button
                    onClick={onGenerateAnswers}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Yes, generate answers
                  </button>
                  <button
                    onClick={onStudy}
                    className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    No, keep as-is
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add more section */}
      <div
        onClick={onAddMore}
        className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors mb-6"
      >
        <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <p className="mt-2 text-sm font-medium text-gray-600">Add more to this deck</p>
        <p className="text-xs text-gray-500">Drop another file to expand your flashcards</p>
      </div>

      {/* Action buttons */}
      {!analysis.specialAction && (
        <div className="flex gap-4">
          <button
            onClick={onStudy}
            className="flex-1 py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Start Studying
          </button>
          <button
            onClick={onAddMore}
            className="py-3 px-4 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            Add More Files
          </button>
        </div>
      )}
    </div>
  )
}
