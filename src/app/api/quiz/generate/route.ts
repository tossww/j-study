import { NextRequest, NextResponse } from 'next/server'
import { db, decks, flashcards } from '@/db'
import { eq, and, or, isNull } from 'drizzle-orm'
import { auth } from '@/auth'

const MODEL = 'claude-opus-4-5-20251101'
const API_URL = 'https://api.anthropic.com/v1/messages'

interface QuizQuestion {
  id: number
  type: 'multiple_choice' | 'written'
  question: string
  options?: string[]
  correctAnswer: string
  explanation?: string
}

interface GenerateQuizRequest {
  content?: string
  deckId?: number
  deckIds?: number[]
  questionCount?: number
  mixRatio?: number
  customInstructions?: string
}

async function callAnthropic(prompt: string): Promise<string> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const textContent = data.content.find((block: { type: string }) => block.type === 'text')
  return textContent?.text || ''
}

function parseJsonResponse(text: string): unknown {
  let jsonText = text.trim()
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.slice(7)
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.slice(3)
  }
  if (jsonText.endsWith('```')) {
    jsonText = jsonText.slice(0, -3)
  }
  return JSON.parse(jsonText.trim())
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateQuizRequest = await request.json()
    const { content, deckId, deckIds, questionCount = 10, mixRatio = 0.5, customInstructions } = body

    // Support both single deckId and multiple deckIds
    const allDeckIds = deckIds || (deckId ? [deckId] : [])

    if (!content && allDeckIds.length === 0) {
      return NextResponse.json(
        { error: 'Either content or deckId(s) is required' },
        { status: 400 }
      )
    }

    let sourceContent = content || ''
    let deckName = 'Custom Quiz'

    if (allDeckIds.length > 0) {
      const deckNames: string[] = []
      const allCards: { front: string; back: string }[] = []

      for (const id of allDeckIds) {
        const [deck] = await db.select().from(decks).where(and(
          eq(decks.id, id),
          or(eq(decks.userId, session.user.id), isNull(decks.userId))
        ))

        if (!deck) {
          return NextResponse.json({ error: `Deck ${id} not found` }, { status: 404 })
        }

        deckNames.push(deck.name)

        const cards = await db
          .select({ front: flashcards.front, back: flashcards.back })
          .from(flashcards)
          .where(eq(flashcards.deckId, id))

        allCards.push(...cards)
      }

      if (allCards.length === 0) {
        return NextResponse.json({ error: 'Selected decks have no cards' }, { status: 400 })
      }

      deckName = allDeckIds.length === 1 ? deckNames[0] : `${deckNames.length} Decks Combined`
      sourceContent = allCards.map(c => `Q: ${c.front}\nA: ${c.back}`).join('\n\n')
    }

    const mcCount = Math.round(questionCount * mixRatio)
    const writtenCount = questionCount - mcCount

    const customSection = customInstructions
      ? `\nCUSTOM INSTRUCTIONS FROM USER:\n${customInstructions}\n`
      : ''

    const prompt = `You are a test generator. Create a quiz from the following content.

CONTENT:
${sourceContent}
${customSection}
REQUIREMENTS:
- Generate exactly ${mcCount} multiple choice questions
- Generate exactly ${writtenCount} written/short answer questions
- Multiple choice: 4 options (A, B, C, D) with one correct answer
- Written: clear, concise expected answers
- Test understanding, not just memorization
- Vary difficulty: easy, medium, hard
- Include brief explanations
${customInstructions ? '- IMPORTANT: Follow the custom instructions provided above' : ''}

Return JSON:
{
  "title": "Quiz title",
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "What is...?",
      "options": ["A) First", "B) Second", "C) Third", "D) Fourth"],
      "correctAnswer": "A",
      "explanation": "Why A is correct"
    },
    {
      "id": 2,
      "type": "written",
      "question": "Explain...",
      "correctAnswer": "Expected answer",
      "explanation": "What good answer includes"
    }
  ]
}

Return ONLY JSON, no other text.`

    const responseText = await callAnthropic(prompt)
    const result = parseJsonResponse(responseText) as { title: string; questions: QuizQuestion[] }

    return NextResponse.json({
      success: true,
      quiz: {
        title: result.title || deckName,
        sourceType: deckId ? 'deck' : 'content',
        sourceName: deckId ? deckName : 'Pasted content',
        questions: result.questions,
        questionCount: result.questions.length,
      }
    })
  } catch (error) {
    console.error('Quiz generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate quiz' },
      { status: 500 }
    )
  }
}
