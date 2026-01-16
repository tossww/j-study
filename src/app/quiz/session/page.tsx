'use client'

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type QuizMode = 'multiple-choice' | 'fill-blank' | 'typed'

interface QuizQuestion {
  id: number
  type: QuizMode
  question: string
  correctAnswer: string
  options?: string[]
  blankedAnswer?: string
  blankWord?: string
}

interface Answer {
  questionId: number
  userAnswer: string
  correct: boolean
  correctAnswer: string
}

function QuizSessionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const deckId = searchParams.get('deck')
  const modesParam = searchParams.get('modes') || 'multiple-choice'
  const count = parseInt(searchParams.get('count') || '10')

  // Memoize modes to prevent infinite re-renders
  const modes = useMemo(() => modesParam.split(','), [modesParam])

  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userInput, setUserInput] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [quizComplete, setQuizComplete] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    if (!deckId || hasFetched) {
      if (!deckId) router.push('/quiz')
      return
    }

    async function fetchQuestions() {
      try {
        setHasFetched(true)
        const res = await fetch('/api/quiz/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deckId: parseInt(deckId), modes, count }),
        })

        if (!res.ok) throw new Error('Failed to generate quiz')

        const data = await res.json()
        setQuestions(data.questions)
      } catch {
        setError('Failed to load quiz questions')
      } finally {
        setLoading(false)
      }
    }

    fetchQuestions()
  }, [deckId, modes, count, router, hasFetched])

  const currentQuestion = questions[currentIndex]

  const checkAnswer = useCallback((userAnswer: string) => {
    if (!currentQuestion || showFeedback) return

    let correct = false
    const normalizedUser = userAnswer.trim().toLowerCase()
    const normalizedCorrect = currentQuestion.type === 'fill-blank'
      ? currentQuestion.blankWord?.toLowerCase() || ''
      : currentQuestion.correctAnswer.toLowerCase()

    // For typed and fill-blank, be more lenient with matching
    if (currentQuestion.type === 'multiple-choice') {
      correct = normalizedUser === currentQuestion.correctAnswer.toLowerCase()
    } else {
      // Allow for partial matches on typed answers
      correct = normalizedUser === normalizedCorrect ||
        normalizedCorrect.includes(normalizedUser) ||
        normalizedUser.includes(normalizedCorrect)
    }

    setIsCorrect(correct)
    setShowFeedback(true)

    const answer: Answer = {
      questionId: currentQuestion.id,
      userAnswer,
      correct,
      correctAnswer: currentQuestion.type === 'fill-blank'
        ? currentQuestion.blankWord || currentQuestion.correctAnswer
        : currentQuestion.correctAnswer,
    }

    setAnswers(prev => [...prev, answer])
  }, [currentQuestion, showFeedback])

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setUserInput('')
      setShowFeedback(false)
    } else {
      setQuizComplete(true)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="text-gray-500">Generating quiz questions...</p>
        </div>
      </div>
    )
  }

  if (error || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center p-12 bg-white rounded-2xl">
          <p className="text-red-600 mb-4">{error || 'No questions available'}</p>
          <Link href="/quiz" className="text-primary-600 hover:text-primary-700">
            Back to Quiz Setup
          </Link>
        </div>
      </div>
    )
  }

  // Quiz complete - show results
  if (quizComplete) {
    const correctCount = answers.filter(a => a.correct).length
    const percentage = Math.round((correctCount / answers.length) * 100)

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-soft border border-gray-50">
          <div className="text-center mb-8">
            <div className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center ${
              percentage >= 70 ? 'bg-green-100' : percentage >= 50 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <span className={`text-4xl font-bold ${
                percentage >= 70 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {percentage}%
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Complete!</h2>
            <p className="text-gray-500">
              You got {correctCount} out of {answers.length} questions correct
            </p>
          </div>

          {/* Results breakdown */}
          <div className="space-y-3 mb-8">
            {answers.map((answer, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border-2 ${
                  answer.correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`text-lg ${answer.correct ? 'text-green-600' : 'text-red-600'}`}>
                    {answer.correct ? '✓' : '✗'}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">
                      {questions[index]?.question}
                    </p>
                    {!answer.correct && (
                      <p className="text-sm mt-1">
                        <span className="text-red-600">Your answer: {answer.userAnswer}</span>
                        <br />
                        <span className="text-green-600">Correct: {answer.correctAnswer}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <Link
              href="/quiz"
              className="flex-1 py-3 text-center bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              New Quiz
            </Link>
            <Link
              href="/study"
              className="flex-1 py-3 text-center bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium"
            >
              Study Decks
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Active quiz
  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span className="capitalize">{currentQuestion.type.replace('-', ' ')}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-50">
        {/* Question */}
        <div className="mb-6">
          <p className="text-lg font-medium text-gray-900">{currentQuestion.question}</p>
          {currentQuestion.type === 'fill-blank' && currentQuestion.blankedAnswer && (
            <p className="mt-3 text-gray-600 bg-gray-50 p-4 rounded-xl">
              {currentQuestion.blankedAnswer}
            </p>
          )}
        </div>

        {/* Answer input based on type */}
        {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
          <div className="space-y-3">
            {currentQuestion.options.map((option, i) => {
              const isSelected = showFeedback && userInput === option
              const isCorrectOption = option === currentQuestion.correctAnswer

              return (
                <button
                  key={i}
                  onClick={() => {
                    if (!showFeedback) {
                      setUserInput(option)
                      checkAnswer(option)
                    }
                  }}
                  disabled={showFeedback}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    showFeedback
                      ? isCorrectOption
                        ? 'border-green-500 bg-green-50'
                        : isSelected
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-100'
                      : 'border-gray-100 hover:border-primary-200'
                  }`}
                >
                  <span className="font-medium">{option}</span>
                </button>
              )
            })}
          </div>
        )}

        {(currentQuestion.type === 'fill-blank' || currentQuestion.type === 'typed') && (
          <div>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !showFeedback && userInput.trim()) {
                  checkAnswer(userInput)
                }
              }}
              disabled={showFeedback}
              placeholder={currentQuestion.type === 'fill-blank' ? 'Type the missing word...' : 'Type your answer...'}
              className="w-full p-4 border-2 border-gray-100 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
            />
            {!showFeedback && (
              <button
                onClick={() => userInput.trim() && checkAnswer(userInput)}
                disabled={!userInput.trim()}
                className="mt-4 w-full py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium disabled:bg-gray-200 disabled:text-gray-400"
              >
                Submit Answer
              </button>
            )}
          </div>
        )}

        {/* Feedback */}
        {showFeedback && (
          <div className={`mt-6 p-4 rounded-xl ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center gap-3">
              <span className={`text-2xl ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {isCorrect ? '✓' : '✗'}
              </span>
              <div>
                <p className={`font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                  {isCorrect ? 'Correct!' : 'Incorrect'}
                </p>
                {!isCorrect && (
                  <p className="text-sm text-gray-600 mt-1">
                    Correct answer: <span className="font-medium">
                      {currentQuestion.type === 'fill-blank' ? currentQuestion.blankWord : currentQuestion.correctAnswer}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Next button */}
        {showFeedback && (
          <button
            onClick={nextQuestion}
            className="mt-4 w-full py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium"
          >
            {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
          </button>
        )}
      </div>

      {/* Exit button */}
      <Link
        href="/quiz"
        className="block mt-4 text-center text-gray-500 hover:text-gray-700 text-sm"
      >
        Exit Quiz
      </Link>
    </div>
  )
}

export default function QuizSessionPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    }>
      <QuizSessionContent />
    </Suspense>
  )
}
