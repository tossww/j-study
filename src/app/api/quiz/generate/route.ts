import { NextResponse } from 'next/server'
import { db } from '@/db'
import { flashcards, decks } from '@/db/schema'
import { eq, and, or, isNull } from 'drizzle-orm'
import { auth } from '@/auth'

export type QuizMode = 'multiple-choice' | 'fill-blank' | 'typed'

export interface QuizQuestion {
  id: number
  type: QuizMode
  question: string
  correctAnswer: string
  options?: string[] // for multiple choice
  blankedAnswer?: string // for fill-in-blank (answer with ___ for blanks)
  blankWord?: string // the word that was blanked out
}

// Use AI to generate plausible wrong answers
async function generateWrongOptionsWithAI(
  questions: { question: string; correctAnswer: string }[]
): Promise<Map<string, string[]>> {
  const results = new Map<string, string[]>()

  if (questions.length === 0) return results

  try {
    const prompt = `Generate 3 plausible but INCORRECT answers for each question below. The wrong answers should:
- Be related to the topic/subject matter
- Sound believable but be factually wrong
- Be similar in length and style to the correct answer
- NOT be obviously wrong or silly

Return ONLY a JSON object with questions as keys and arrays of 3 wrong answers as values.

Questions:
${questions.map((q, i) => `${i + 1}. Question: "${q.question}"\n   Correct Answer: "${q.correctAnswer}"`).join('\n\n')}

Return format:
{
  "question text here": ["wrong1", "wrong2", "wrong3"],
  ...
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      console.error('AI distractor generation failed:', await response.text())
      return results
    }

    const data = await response.json()
    const content = data.content[0]?.text || ''

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      for (const [question, wrongAnswers] of Object.entries(parsed)) {
        if (Array.isArray(wrongAnswers) && wrongAnswers.length >= 3) {
          results.set(question, wrongAnswers.slice(0, 3) as string[])
        }
      }
    }
  } catch (error) {
    console.error('Error generating distractors:', error)
  }

  return results
}

// Fallback: generate simple wrong options without AI
function generateFallbackOptions(correctAnswer: string): string[] {
  // Create variations that are clearly wrong but not placeholder text
  const fallbacks = [
    `Not ${correctAnswer}`,
    'None of the above',
    'All of the above',
  ]
  return fallbacks
}

// Create fill-in-the-blank by blanking out a key word
function createFillInBlank(answer: string): { blankedAnswer: string; blankWord: string } | null {
  // Split into words and find a good word to blank (longer than 3 chars)
  const words = answer.split(/\s+/)
  const candidates = words.filter(w => w.length > 3 && /^[a-zA-Z]+$/.test(w))

  if (candidates.length === 0) {
    // Just blank the last word if no good candidates
    if (words.length > 0) {
      const lastWord = words[words.length - 1].replace(/[^a-zA-Z]/g, '')
      if (lastWord.length > 0) {
        const blankedAnswer = answer.replace(new RegExp(lastWord, 'i'), '_____')
        return { blankedAnswer, blankWord: lastWord }
      }
    }
    return null
  }

  // Pick a random candidate
  const blankWord = candidates[Math.floor(Math.random() * candidates.length)]
  const blankedAnswer = answer.replace(new RegExp(`\\b${blankWord}\\b`, 'i'), '_____')

  return { blankedAnswer, blankWord }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deckId, modes, count } = await request.json()

    if (!deckId || !modes || !Array.isArray(modes) || modes.length === 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Verify deck belongs to user
    const [deck] = await db
      .select()
      .from(decks)
      .where(and(
        eq(decks.id, deckId),
        or(eq(decks.userId, session.user.id), isNull(decks.userId))
      ))

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
    }

    // Fetch flashcards for the deck
    const cards = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.deckId, deckId))

    if (cards.length === 0) {
      return NextResponse.json({ error: 'No flashcards found' }, { status: 404 })
    }

    // Shuffle cards and take the requested count
    const shuffledCards = [...cards].sort(() => Math.random() - 0.5)
    const selectedCards = shuffledCards.slice(0, Math.min(count || 10, cards.length))

    // Determine which cards need multiple choice options
    const mcCards = selectedCards.filter((_, i) => {
      const mode = modes[i % modes.length] as QuizMode
      return mode === 'multiple-choice'
    })

    // Generate AI distractors for multiple choice questions
    let distractorMap = new Map<string, string[]>()
    if (mcCards.length > 0 && modes.includes('multiple-choice')) {
      distractorMap = await generateWrongOptionsWithAI(
        mcCards.map(c => ({ question: c.front, correctAnswer: c.back }))
      )
    }

    // Generate questions
    const questions: QuizQuestion[] = []

    for (let i = 0; i < selectedCards.length; i++) {
      const card = selectedCards[i]

      // Pick a mode based on index to ensure even distribution
      const mode = modes[i % modes.length] as QuizMode

      const baseQuestion: QuizQuestion = {
        id: card.id,
        type: mode,
        question: card.front,
        correctAnswer: card.back,
      }

      if (mode === 'multiple-choice') {
        // Try to get AI-generated distractors, fall back if not available
        let wrongOptions = distractorMap.get(card.front)
        if (!wrongOptions || wrongOptions.length < 3) {
          wrongOptions = generateFallbackOptions(card.back)
        }
        const allOptions = [card.back, ...wrongOptions].sort(() => Math.random() - 0.5)
        baseQuestion.options = allOptions
      } else if (mode === 'fill-blank') {
        const fillBlank = createFillInBlank(card.back)
        if (fillBlank) {
          baseQuestion.blankedAnswer = fillBlank.blankedAnswer
          baseQuestion.blankWord = fillBlank.blankWord
        } else {
          // Fall back to typed if can't create fill-in-blank
          baseQuestion.type = 'typed'
        }
      }
      // typed questions don't need extra processing

      questions.push(baseQuestion)
    }

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Quiz generation error:', error)
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 })
  }
}
