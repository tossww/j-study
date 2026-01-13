import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface GeneratedFlashcard {
  front: string  // Question
  back: string   // Answer
}

export async function generateFlashcards(content: string, maxCards: number = 20): Promise<GeneratedFlashcard[]> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a study assistant that creates high-quality flashcards from educational content.

Analyze the following content and create ${maxCards} flashcards. Each flashcard should:
1. Have a clear, specific question on the front
2. Have a concise but complete answer on the back
3. Focus on key concepts, definitions, and important facts
4. Be suitable for spaced repetition learning

Return your response as a JSON array with objects containing "front" and "back" fields.
Return ONLY the JSON array, no other text.

Content to analyze:
${content}

Example format:
[
  {"front": "What is photosynthesis?", "back": "The process by which plants convert sunlight, water, and CO2 into glucose and oxygen."},
  {"front": "What are the products of photosynthesis?", "back": "Glucose (C6H12O6) and oxygen (O2)"}
]`
      }
    ],
  })

  // Extract the text content from the response
  const textContent = message.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in response')
  }

  // Parse the JSON response
  try {
    const flashcards = JSON.parse(textContent.text) as GeneratedFlashcard[]
    return flashcards
  } catch {
    throw new Error('Failed to parse flashcards from AI response')
  }
}
