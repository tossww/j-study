'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Deck {
  id: number
  name: string
  cardCount: number
}

interface QuizQuestion {
  id: number
  type: 'multiple_choice' | 'written'
  question: string
  options?: string[]
  correctAnswer: string
  explanation?: string
}

interface Quiz {
  title: string
  questions: QuizQuestion[]
}

interface UserAnswer {
  questionId: number
  answer: string
  isCorrect?: boolean
  score?: number
  feedback?: string
}

type QuizMode = 'multiple-choice' | 'written'
type SourceType = 'deck' | 'content'
type AppState = 'source' | 'settings' | 'generating' | 'taking' | 'grading' | 'results'

function WrittenAnswerInput({ onSubmit, initialValue = '', questionId }: { onSubmit: (answer: string) => void, initialValue?: string, questionId?: number }) {
  const [answer, setAnswer] = useState(initialValue)

  // Update answer when question changes (navigating between questions)
  useEffect(() => {
    setAnswer(initialValue)
  }, [initialValue, questionId])

  const handleSubmit = () => {
    if (answer.trim()) {
      onSubmit(answer.trim())
    }
  }

  return (
    <div className="space-y-4">
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer here..."
        className="w-full h-32 p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-200"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.metaKey) {
            handleSubmit()
          }
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={!answer.trim()}
        className="w-full py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {initialValue ? 'Update Answer' : 'Submit Answer'}
      </button>
      <p className="text-xs text-gray-400 text-center">Press ⌘ + Enter to submit</p>
    </div>
  )
}

export default function QuizPage() {
  const searchParams = useSearchParams()
  // Support multiple deck params: ?deck=1&deck=2&deck=3
  const deckIdParams = searchParams.getAll('deck')

  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  const [appState, setAppState] = useState<AppState>('source')
  const [sourceType, setSourceType] = useState<SourceType>('deck')
  const [pastedContent, setPastedContent] = useState('')
  const [selectedDeck, setSelectedDeck] = useState<number | null>(null)
  const [selectedDecks, setSelectedDecks] = useState<number[]>([])
  const [selectedModes, setSelectedModes] = useState<QuizMode[]>(['multiple-choice', 'written'])
  const [questionCount, setQuestionCount] = useState(10)
  const [customInstructions, setCustomInstructions] = useState('')
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<UserAnswer[]>([])
  const [error, setError] = useState<string | null>(null)
  const [savedQuizId, setSavedQuizId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function fetchDecks() {
      try {
        const res = await fetch('/api/decks')
        if (res.ok) {
          const data = await res.json()
          const filteredDecks = data.filter((d: Deck) => d.cardCount > 0)
          setDecks(filteredDecks)

          // If deck IDs passed in URL, auto-select and go to settings
          if (deckIdParams.length > 0) {
            const deckIds = deckIdParams.map(id => parseInt(id, 10))
            const validIds = deckIds.filter(id => filteredDecks.some((d: Deck) => d.id === id))
            if (validIds.length > 0) {
              setSelectedDecks(validIds)
              setSelectedDeck(validIds[0]) // Keep for backwards compat
              setSourceType('deck')
              setAppState('settings')
            }
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    fetchDecks()
  }, [deckIdParams.join(',')])

  const selectDeck = (deckId: number) => {
    setSelectedDeck(deckId)
    setAppState('settings')
  }

  const toggleMode = (mode: QuizMode) => {
    setSelectedModes(prev => {
      if (prev.includes(mode)) {
        if (prev.length === 1) return prev
        return prev.filter(m => m !== mode)
      }
      return [...prev, mode]
    })
  }

  const generateQuiz = async () => {
    setError(null)
    setAppState('generating')

    const mcRatio = selectedModes.includes('multiple-choice') && selectedModes.includes('written')
      ? 0.5
      : selectedModes.includes('multiple-choice') ? 1 : 0

    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: sourceType === 'content' ? pastedContent : undefined,
          deckIds: sourceType === 'deck' ? (selectedDecks.length > 0 ? selectedDecks : (selectedDeck ? [selectedDeck] : undefined)) : undefined,
          questionCount,
          mixRatio: mcRatio,
          customInstructions: customInstructions.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quiz')
      }

      setQuiz(data.quiz)
      setAnswers([])
      setCurrentQuestion(0)
      setAppState('taking')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz')
      setAppState('settings')
    }
  }

  const submitAnswer = (answer: string) => {
    if (!quiz) return

    const question = quiz.questions[currentQuestion]
    const newAnswer: UserAnswer = {
      questionId: question.id,
      answer,
    }

    if (question.type === 'multiple_choice') {
      newAnswer.isCorrect = answer === question.correctAnswer
      newAnswer.score = newAnswer.isCorrect ? 100 : 0
    }

    const updatedAnswers = [...answers, newAnswer]
    setAnswers(updatedAnswers)

    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      gradeWrittenAnswers(updatedAnswers)
    }
  }

  const gradeWrittenAnswers = async (allAnswers: UserAnswer[]) => {
    if (!quiz) return
    setAppState('grading')

    const gradedAnswers = [...allAnswers]

    for (let i = 0; i < gradedAnswers.length; i++) {
      const answer = gradedAnswers[i]
      const question = quiz.questions.find(q => q.id === answer.questionId)

      if (question?.type === 'written' && answer.score === undefined) {
        try {
          const response = await fetch('/api/quiz/grade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: question.question,
              correctAnswer: question.correctAnswer,
              userAnswer: answer.answer,
            }),
          })

          const data = await response.json()
          if (data.success) {
            gradedAnswers[i] = {
              ...answer,
              isCorrect: data.isCorrect,
              score: data.score,
              feedback: data.feedback,
            }
          }
        } catch {
          gradedAnswers[i] = { ...answer, score: 0, isCorrect: false }
        }
      }
    }

    setAnswers(gradedAnswers)
    setAppState('results')
  }

  const resetQuiz = () => {
    setQuiz(null)
    setAnswers([])
    setCurrentQuestion(0)
    setAppState('source')
    setPastedContent('')
    setSelectedDeck(null)
    setSelectedDecks([])
    setCustomInstructions('')
    setSavedQuizId(null)
    setSaving(false)
    setSaved(false)
  }

  const selectedDeckData = decks.find(d => d.id === selectedDeck)
  const selectedDecksData = decks.filter(d => selectedDecks.includes(d.id))
  const getSourceName = () => {
    if (sourceType === 'content') return 'Pasted content'
    if (selectedDecks.length > 1) return `${selectedDecks.length} decks selected`
    if (selectedDecksData.length === 1) return selectedDecksData[0].name
    return selectedDeckData?.name || 'Unknown'
  }
  const totalScore = answers.length > 0
    ? answers.reduce((sum, a) => sum + (a.score || 0), 0) / answers.length
    : 0

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  // Generating screen
  if (appState === 'generating') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Generating Quiz...</h2>
        <p className="text-gray-500 mt-2">Creating questions from your content</p>
      </div>
    )
  }

  // Taking quiz screen
  if (appState === 'taking' && quiz) {
    const question = quiz.questions[currentQuestion]
    const progress = ((currentQuestion) / quiz.questions.length) * 100
    const existingAnswer = answers.find(a => a.questionId === question.id)

    const goToPrevious = () => {
      if (currentQuestion > 0) {
        setCurrentQuestion(currentQuestion - 1)
      }
    }

    const goToNext = () => {
      if (currentQuestion < quiz.questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1)
      }
    }

    const handleSubmitOrUpdate = (answer: string) => {
      const newAnswer: UserAnswer = {
        questionId: question.id,
        answer,
      }

      if (question.type === 'multiple_choice') {
        newAnswer.isCorrect = answer === question.correctAnswer
        newAnswer.score = newAnswer.isCorrect ? 100 : 0
      }

      // Update or add answer
      const existingIdx = answers.findIndex(a => a.questionId === question.id)
      if (existingIdx >= 0) {
        const updatedAnswers = [...answers]
        updatedAnswers[existingIdx] = newAnswer
        setAnswers(updatedAnswers)
      } else {
        setAnswers([...answers, newAnswer])
      }

      // Auto-advance to next question
      if (currentQuestion < quiz.questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1)
      }
    }

    const finishQuiz = () => {
      // Check if all questions are answered
      const unanswered = quiz.questions.filter(q => !answers.find(a => a.questionId === q.id))
      if (unanswered.length > 0) {
        if (!confirm(`You have ${unanswered.length} unanswered question(s). Finish anyway?`)) {
          return
        }
      }
      gradeWrittenAnswers(answers)
    }

    const allAnswered = quiz.questions.every(q => answers.find(a => a.questionId === q.id))

    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>{quiz.title}</span>
            <span>Question {currentQuestion + 1} of {quiz.questions.length}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          {/* Question dots for quick navigation */}
          <div className="flex gap-1 mt-2 justify-center flex-wrap">
            {quiz.questions.map((q, idx) => {
              const answered = answers.find(a => a.questionId === q.id)
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestion(idx)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    idx === currentQuestion
                      ? 'bg-primary-500 scale-125'
                      : answered
                        ? 'bg-green-400 hover:bg-green-500'
                        : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  title={`Question ${idx + 1}${answered ? ' (answered)' : ''}`}
                />
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-soft">
          <div className="mb-2 flex items-center justify-between">
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              question.type === 'multiple_choice' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
            }`}>
              {question.type === 'multiple_choice' ? 'Multiple Choice' : 'Written Answer'}
            </span>
            {existingAnswer && (
              <span className="text-xs text-green-600 font-medium">Answered</span>
            )}
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">{question.question}</h2>

          {question.type === 'multiple_choice' && question.options ? (
            <div className="space-y-3">
              {question.options.map((option, idx) => {
                const optionLetter = option.charAt(0)
                const isSelected = existingAnswer?.answer === optionLetter
                return (
                  <button
                    key={idx}
                    onClick={() => handleSubmitOrUpdate(optionLetter)}
                    className={`w-full p-4 text-left border-2 rounded-xl transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          ) : (
            <WrittenAnswerInput
              onSubmit={handleSubmitOrUpdate}
              initialValue={existingAnswer?.answer || ''}
              questionId={question.id}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={goToPrevious}
            disabled={currentQuestion === 0}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <button onClick={resetQuiz} className="text-gray-400 hover:text-gray-600 text-sm">
            Cancel
          </button>

          {currentQuestion < quiz.questions.length - 1 ? (
            <button
              onClick={goToNext}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={finishQuiz}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                allAnswered
                  ? 'bg-primary-500 text-white hover:bg-primary-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Finish Quiz
            </button>
          )}
        </div>
      </div>
    )
  }

  // Grading screen
  if (appState === 'grading') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Grading Your Answers...</h2>
        <p className="text-gray-500 mt-2">Evaluating written responses</p>
      </div>
    )
  }

  // Results screen
  if (appState === 'results' && quiz) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-soft text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz Complete!</h1>
          <p className="text-gray-500 mb-6">{quiz.title}</p>

          <div className="text-6xl font-bold mb-2" style={{
            color: totalScore >= 70 ? '#10b981' : totalScore >= 50 ? '#f59e0b' : '#ef4444'
          }}>
            {Math.round(totalScore)}%
          </div>
          <p className="text-gray-500">
            {answers.filter(a => a.isCorrect).length} of {answers.length} correct
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {quiz.questions.map((question, idx) => {
            const answer = answers[idx]
            // For multiple choice, find the full option text
            const getUserAnswerText = () => {
              if (question.type === 'multiple_choice' && question.options && answer?.answer) {
                return question.options.find(opt => opt.startsWith(answer.answer)) || answer.answer
              }
              return answer?.answer
            }
            const getCorrectAnswerText = () => {
              if (question.type === 'multiple_choice' && question.options) {
                return question.options.find(opt => opt.startsWith(question.correctAnswer)) || question.correctAnswer
              }
              return question.correctAnswer
            }
            return (
              <div key={question.id} className={`bg-white rounded-xl p-4 border-l-4 ${
                answer?.isCorrect ? 'border-green-500' : 'border-red-500'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-gray-500">Question {idx + 1}</span>
                  <span className={`text-sm font-medium ${answer?.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {answer?.score !== undefined ? `${Math.round(answer.score)}%` : (answer?.isCorrect ? 'Correct' : 'Incorrect')}
                  </span>
                </div>
                <p className="font-medium text-gray-900 mb-2">{question.question}</p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Your answer:</span> {getUserAnswerText()}
                </p>
                {!answer?.isCorrect && (
                  <p className="text-sm text-green-600">
                    <span className="font-medium">Correct:</span> {getCorrectAnswerText()}
                  </p>
                )}
                {answer?.feedback && (
                  <p className="text-sm text-gray-500 mt-2 italic">{answer.feedback}</p>
                )}
              </div>
            )
          })}
        </div>

        {/* Save quiz option */}
        {!savedQuizId && !saved && (
          <div className="bg-purple-50 rounded-xl p-4 mb-6 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-purple-900">Save this quiz?</p>
                <p className="text-sm text-purple-600">You can retake it later from your quiz history</p>
              </div>
              <button
                onClick={async () => {
                  setSaving(true)
                  try {
                    const res = await fetch('/api/quizzes', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title: quiz.title,
                        sourceType: selectedDecks.length > 1 ? 'decks' : (selectedDeck ? 'deck' : 'content'),
                        sourceName: getSourceName(),
                        deckIds: selectedDecks.length > 0 ? selectedDecks : (selectedDeck ? [selectedDeck] : null),
                        questions: quiz.questions,
                        customInstructions: customInstructions || null,
                        score: Math.round(totalScore),
                      }),
                    })
                    if (res.ok) {
                      setSaved(true)
                    }
                  } catch (e) {
                    console.error('Failed to save quiz:', e)
                  } finally {
                    setSaving(false)
                  }
                }}
                disabled={saving}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Quiz'}
              </button>
            </div>
          </div>
        )}

        {saved && (
          <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-100">
            <p className="text-green-700 font-medium flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Quiz saved! Find it in your <Link href="/quiz/history" className="underline">quiz history</Link>
            </p>
          </div>
        )}

        {savedQuizId && (
          <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
            <p className="text-blue-700 text-sm">This quiz has been updated in your history.</p>
          </div>
        )}

        <div className="flex gap-4">
          <button onClick={resetQuiz} className="flex-1 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors">
            Take Another Quiz
          </button>
          <Link href="/quiz/history" className="flex-1 py-3 bg-purple-100 text-purple-700 rounded-xl font-medium hover:bg-purple-200 transition-colors text-center">
            Quiz History
          </Link>
          <Link href="/" className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors text-center">
            Home
          </Link>
        </div>
      </div>
    )
  }

  // Source selection screen
  if (appState === 'source') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create a Test</h1>
          <p className="text-gray-500 mt-1">Generate a quiz from your notes or existing decks</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-soft mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Quiz Source</h2>
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setSourceType('content')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                sourceType === 'content' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">Paste Content</div>
              <div className="text-sm text-gray-500">Enter notes or text</div>
            </button>
            <button
              onClick={() => setSourceType('deck')}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                sourceType === 'deck' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">From Deck</div>
              <div className="text-sm text-gray-500">Use existing flashcards</div>
            </button>
          </div>

          {sourceType === 'content' ? (
            <textarea
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              placeholder="Paste your notes, textbook content, or any information you want to be tested on..."
              className="w-full h-48 p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          ) : (
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {decks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No decks available. <Link href="/upload" className="text-primary-600 hover:underline">Create one</Link></p>
              ) : (
                decks.map(deck => (
                  <button
                    key={deck.id}
                    onClick={() => setSelectedDeck(deck.id)}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
                      selectedDeck === deck.id ? 'border-primary-500 bg-primary-50' : 'border-gray-100 hover:border-primary-300'
                    }`}
                  >
                    <span className="font-medium text-gray-900">{deck.name}</span>
                    <span className="text-sm text-gray-400">{deck.cardCount} cards</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setAppState('settings')}
          disabled={sourceType === 'content' ? !pastedContent.trim() : !selectedDeck}
          className="w-full py-4 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue to Settings
        </button>
      </div>
    )
  }

  // Settings screen
  if (appState === 'settings') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => setAppState('source')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Quiz Settings</h1>
          <p className="text-gray-500 mt-1">From: {getSourceName()}</p>
          {selectedDecks.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selectedDecksData.map(d => (
                <span key={d.id} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                  {d.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl">{error}</div>
        )}

        {/* Quiz mode selection */}
        <div className="bg-white rounded-2xl p-6 shadow-soft mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">Question Types</h2>
          <p className="text-sm text-gray-500 mb-4">Select one or more for a mixed quiz</p>
          <div className="grid gap-3">
            <button
              onClick={() => toggleMode('multiple-choice')}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                selectedModes.includes('multiple-choice')
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                selectedModes.includes('multiple-choice')
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Multiple Choice</p>
                <p className="text-sm text-gray-500">Pick the correct answer from 4 options</p>
              </div>
            </button>

            <button
              onClick={() => toggleMode('written')}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                selectedModes.includes('written')
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                selectedModes.includes('written')
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Written Answer</p>
                <p className="text-sm text-gray-500">Type your answer, AI will grade it</p>
              </div>
            </button>
          </div>
        </div>

        {/* Question count */}
        <div className="bg-white rounded-2xl p-6 shadow-soft mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Number of Questions</h2>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={50}
              value={questionCount}
              onChange={(e) => setQuestionCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              className="w-24 px-4 py-2.5 rounded-xl border border-gray-200 text-center font-medium focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            <span className="text-gray-500 text-sm">questions (1-50)</span>
          </div>
        </div>

        {/* Custom instructions */}
        <div className="bg-white rounded-2xl p-6 shadow-soft mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">Custom Instructions</h2>
          <p className="text-sm text-gray-500 mb-4">Tell the AI how to generate questions (optional)</p>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="e.g., Ask what happened and why it mattered for each event. Focus on cause and effect relationships..."
            className="w-full h-24 p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-200 text-sm"
          />
        </div>

        {/* Start button */}
        <button
          onClick={generateQuiz}
          className="w-full py-4 rounded-2xl font-semibold text-lg bg-primary-500 text-white hover:bg-primary-600 shadow-soft transition-all"
        >
          Start Quiz
        </button>
      </div>
    )
  }

  return null
}
