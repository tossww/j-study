import Anthropic from '@anthropic-ai/sdk'
import type { DeckAnalysis } from '@/db/schema'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface GeneratedFlashcard {
  front: string  // Question
  back: string   // Answer
}

export interface ExistingCardSummary {
  topics: string[]
  sampleCards: { front: string; back: string }[]
  totalCount: number
}

export interface AnalysisResult {
  flashcards: GeneratedFlashcard[]
  analysis: DeckAnalysis
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

export async function analyzeAndGenerateFlashcards(
  content: string,
  existingCards?: ExistingCardSummary,
  generateAnswers: boolean = false,
  maxCards: number = 20
): Promise<AnalysisResult> {
  const existingCardsContext = existingCards
    ? `
EXISTING CARDS IN DECK (avoid duplicating these topics):
- Total cards: ${existingCards.totalCount}
- Topics already covered: ${existingCards.topics.join(', ')}
- Sample existing cards:
${existingCards.sampleCards.slice(0, 3).map(c => `  Q: ${c.front}\n  A: ${c.back}`).join('\n')}
`
    : ''

  const generateAnswersInstruction = generateAnswers
    ? `
SPECIAL INSTRUCTION: This content contains questions. Generate comprehensive answers for each question as flashcard backs. The front should be the original question, the back should be a detailed answer.
`
    : ''

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a study assistant that analyzes educational content and creates flashcards.

STEP 1 - ANALYZE THE CONTENT:
1. Identify the content type (notes, questions, textbook, slides, or other)
2. List the main topics covered
3. Assess coverage level (sparse, moderate, good, comprehensive)
4. Suggest what additional materials would help (be specific and helpful)
5. If this appears to be a question sheet without answers, flag it for answer generation

STEP 2 - GENERATE FLASHCARDS:
- Create up to ${maxCards} high-quality Q&A flashcards
- Focus on key concepts, definitions, and important facts
- Each card should have a clear question and concise answer
${existingCards ? '- IMPORTANT: Avoid creating cards that duplicate existing topics' : ''}
${generateAnswersInstruction}
${existingCardsContext}

CONTENT TO ANALYZE:
${content}

Return your response as valid JSON with this exact structure:
{
  "analysis": {
    "contentType": "notes" | "questions" | "textbook" | "slides" | "other",
    "topics": ["topic1", "topic2", ...],
    "coverage": "sparse" | "moderate" | "good" | "comprehensive",
    "suggestions": ["suggestion1", "suggestion2", ...],
    "specialAction": null or {"type": "generate_answers", "description": "This appears to be a question sheet. Would you like me to generate answers?"}
  },
  "flashcards": [
    {"front": "Question here", "back": "Answer here"},
    ...
  ]
}

Return ONLY the JSON object, no other text.`
      }
    ],
  })

  const textContent = message.content.find(block => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in response')
  }

  try {
    // Try to extract JSON from the response (Claude sometimes wraps in markdown)
    let jsonText = textContent.text.trim()

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7)
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3)
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3)
    }
    jsonText = jsonText.trim()

    const result = JSON.parse(jsonText) as AnalysisResult
    return result
  } catch (e) {
    console.error('Failed to parse AI response:', textContent.text.slice(0, 500))
    throw new Error('Failed to parse analysis from AI response')
  }
}
