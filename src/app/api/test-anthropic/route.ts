import { NextResponse } from 'next/server'

export async function GET() {
  const hasKey = !!process.env.ANTHROPIC_API_KEY
  const keyPrefix = process.env.ANTHROPIC_API_KEY?.substring(0, 10) || 'none'

  if (!hasKey) {
    return NextResponse.json({ error: 'No API key', hasKey, keyPrefix })
  }

  try {
    // Use raw fetch instead of SDK
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Say hello' }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({
        error: 'API error',
        status: response.status,
        data,
        hasKey,
        keyPrefix
      })
    }

    return NextResponse.json({
      success: true,
      response: data.content?.[0]?.text || 'no text',
      hasKey,
      keyPrefix
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error?.constructor?.name,
      hasKey,
      keyPrefix
    })
  }
}
