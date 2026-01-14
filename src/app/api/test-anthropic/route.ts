import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function GET() {
  const hasKey = !!process.env.ANTHROPIC_API_KEY
  const keyPrefix = process.env.ANTHROPIC_API_KEY?.substring(0, 10) || 'none'

  if (!hasKey) {
    return NextResponse.json({
      error: 'No API key',
      hasKey,
      keyPrefix
    })
  }

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say "hello" and nothing else.' }],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text : 'no text'

    return NextResponse.json({
      success: true,
      response: text,
      hasKey,
      keyPrefix
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      hasKey,
      keyPrefix
    })
  }
}
