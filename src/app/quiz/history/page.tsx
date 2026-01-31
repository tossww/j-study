'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SavedQuiz {
  id: number
  title: string
  sourceType: string
  sourceName: string | null
  questions: Array<{
    id: number
    type: string
    question: string
    options?: string[]
    correctAnswer: string
  }>
  lastScore: number | null
  timesTaken: number
  createdAt: string
  lastTakenAt: string | null
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  })
}

export default function QuizHistoryPage() {
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<SavedQuiz[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    async function fetchQuizzes() {
      try {
        const res = await fetch('/api/quizzes')
        if (res.ok) {
          const data = await res.json()
          setQuizzes(data)
        }
      } catch (e) {
        console.error('Failed to fetch quizzes:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchQuizzes()
  }, [])

  const handleRetake = (quiz: SavedQuiz) => {
    // Store quiz in sessionStorage and navigate to quiz page
    sessionStorage.setItem('retakeQuiz', JSON.stringify(quiz))
    router.push(`/quiz/retake/${quiz.id}`)
  }

  const handleDelete = async (quizId: number) => {
    if (!confirm('Delete this quiz from your history?')) return

    setDeletingId(quizId)
    try {
      const res = await fetch(`/api/quizzes/${quizId}`, { method: 'DELETE' })
      if (res.ok) {
        setQuizzes(quizzes.filter(q => q.id !== quizId))
      }
    } catch (e) {
      console.error('Failed to delete quiz:', e)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quiz History</h1>
          <p className="text-gray-500 mt-1">Retake your saved quizzes</p>
        </div>
        <Link
          href="/quiz"
          className="px-4 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
        >
          New Quiz
        </Link>
      </div>

      {quizzes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-2">No saved quizzes yet</p>
          <p className="text-sm text-gray-400 mb-4">Take a quiz and save it to see it here</p>
          <Link
            href="/quiz"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors text-sm font-medium"
          >
            Take a Quiz
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map(quiz => (
            <div
              key={quiz.id}
              className="bg-white rounded-xl p-4 border border-gray-100 hover:border-purple-200 hover:shadow-soft transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span>{quiz.questions.length} questions</span>
                    <span>•</span>
                    <span>Taken {quiz.timesTaken}x</span>
                    {quiz.lastTakenAt && (
                      <>
                        <span>•</span>
                        <span>Last: {formatDate(quiz.lastTakenAt)}</span>
                      </>
                    )}
                  </div>
                  {quiz.sourceName && (
                    <p className="text-xs text-gray-400 mt-1">From: {quiz.sourceName}</p>
                  )}
                </div>

                {quiz.lastScore !== null && (
                  <div className={`text-2xl font-bold ${
                    quiz.lastScore >= 70 ? 'text-green-500' :
                    quiz.lastScore >= 50 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {quiz.lastScore}%
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleRetake(quiz)}
                  className="flex-1 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors text-sm"
                >
                  Retake Quiz
                </button>
                <button
                  onClick={() => handleDelete(quiz.id)}
                  disabled={deletingId === quiz.id}
                  className="px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete quiz"
                >
                  {deletingId === quiz.id ? (
                    <span className="block w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
