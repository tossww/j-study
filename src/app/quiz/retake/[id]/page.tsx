'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface QuizQuestion {
  id: number
  type: 'multiple_choice' | 'written'
  question: string
  options?: string[]
  correctAnswer: string
  explanation?: string
}

interface SavedQuiz {
  id: number
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

function WrittenAnswerInput({ onSubmit, initialValue = '' }: { onSubmit: (answer: string) => void, initialValue?: string }) {
  const [answer, setAnswer] = useState(initialValue)

  useEffect(() => {
    setAnswer(initialValue)
  }, [initialValue])

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
      <p className="text-xs text-gray-400 text-center">Press Cmd + Enter to submit</p>
    </div>
  )
}

export default function RetakeQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [quiz, setQuiz] = useState<SavedQuiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [appState, setAppState] = useState<'taking' | 'grading' | 'results'>('taking')
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<UserAnswer[]>([])

  useEffect(() => {
    async function fetchQuiz() {
      try {
        const res = await fetch(`/api/quizzes/${id}`)
        if (res.ok) {
          const data = await res.json()
          setQuiz(data)
        } else {
          router.push('/quiz/history')
        }
      } catch (e) {
        console.error('Failed to fetch quiz:', e)
        router.push('/quiz/history')
      } finally {
        setLoading(false)
      }
    }
    fetchQuiz()
  }, [id, router])

  const handleSubmitOrUpdate = (answer: string) => {
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

    const existingIdx = answers.findIndex(a => a.questionId === question.id)
    if (existingIdx >= 0) {
      const updatedAnswers = [...answers]
      updatedAnswers[existingIdx] = newAnswer
      setAnswers(updatedAnswers)
    } else {
      setAnswers([...answers, newAnswer])
    }

    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const finishQuiz = async () => {
    if (!quiz) return

    const unanswered = quiz.questions.filter(q => !answers.find(a => a.questionId === q.id))
    if (unanswered.length > 0) {
      if (!confirm(`You have ${unanswered.length} unanswered question(s). Finish anyway?`)) {
        return
      }
    }

    // Grade written answers
    setAppState('grading')
    const gradedAnswers = [...answers]

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

    // Update the saved quiz with new score
    const totalScore = gradedAnswers.length > 0
      ? gradedAnswers.reduce((sum, a) => sum + (a.score || 0), 0) / gradedAnswers.length
      : 0

    try {
      await fetch(`/api/quizzes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: Math.round(totalScore) }),
      })
    } catch (e) {
      console.error('Failed to update quiz score:', e)
    }

    setAppState('results')
  }

  if (loading || !quiz) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  const totalScore = answers.length > 0
    ? answers.reduce((sum, a) => sum + (a.score || 0), 0) / answers.length
    : 0

  // Taking quiz
  if (appState === 'taking') {
    const question = quiz.questions[currentQuestion]
    const progress = (currentQuestion / quiz.questions.length) * 100
    const existingAnswer = answers.find(a => a.questionId === question.id)
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
            {existingAnswer && <span className="text-xs text-green-600 font-medium">Answered</span>}
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
            />
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => currentQuestion > 0 && setCurrentQuestion(currentQuestion - 1)}
            disabled={currentQuestion === 0}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <Link href="/quiz/history" className="text-gray-400 hover:text-gray-600 text-sm">
            Cancel
          </Link>

          {currentQuestion < quiz.questions.length - 1 ? (
            <button
              onClick={() => setCurrentQuestion(currentQuestion + 1)}
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
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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

  // Grading
  if (appState === 'grading') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Grading Your Answers...</h2>
      </div>
    )
  }

  // Results
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
          const answer = answers.find(a => a.questionId === question.id)
          const getUserAnswerText = () => {
            if (question.type === 'multiple_choice' && question.options && answer?.answer) {
              return question.options.find(opt => opt.startsWith(answer.answer)) || answer.answer
            }
            return answer?.answer || '(No answer)'
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

      <div className="flex gap-4">
        <button
          onClick={() => {
            setAnswers([])
            setCurrentQuestion(0)
            setAppState('taking')
          }}
          className="flex-1 py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors"
        >
          Retake Again
        </button>
        <Link href="/quiz/history" className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors text-center">
          Back to History
        </Link>
      </div>
    </div>
  )
}
