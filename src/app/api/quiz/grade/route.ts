import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const MODEL = 'claude-opus-4-5-20251101'
const API_URL = 'https://api.anthropic.com/v1/messages'

interface GradeRequest {
  question: string
  correctAnswer: string
  userAnswer: string
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
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    throw new Error('Anthropic API error')
  }

  const data = await response.json()
  const textContent = data.content.find((block: { type: string }) => block.type === 'text')
  return textContent?.text || ''
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GradeRequest = await request.json()
    const { question, correctAnswer, userAnswer } = body

    if (!question || !correctAnswer || !userAnswer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const prompt = `Grade this answer. Be fair but accurate.

Question: ${question}
Expected Answer: ${correctAnswer}
Student's Answer: ${userAnswer}

Return JSON only:
{
  "score": 0-100,
  "feedback": "Brief feedback on the answer",
  "isCorrect": true/false (true if score >= 70)
}

Return ONLY JSON.`

    const responseText = await callAnthropic(prompt)
    let jsonText = responseText.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```$/g, '')
    }
    
    const result = JSON.parse(jsonText.trim())

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('Grading error:', error)
    return NextResponse.json(
      { error: 'Failed to grade answer' },
      { status: 500 }
    )
  }
}
