import Anthropic from '@anthropic-ai/sdk'
import type { DeckAnalysis } from '@/db/schema'
import { DEFAULT_PROMPT } from './prompt-config'

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
  maxCards: number = 20,
  additionalInstructions?: string,
  customPrompt?: string
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

  const userInstructions = additionalInstructions
    ? `
USER INSTRUCTIONS (follow these carefully):
${additionalInstructions}
`
    : ''

  // Use custom prompt if provided, otherwise use default
  const basePrompt = customPrompt || DEFAULT_PROMPT

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `${basePrompt}

PARAMETERS:
- Maximum cards to generate: ${maxCards}
${existingCards ? '- IMPORTANT: Avoid creating cards that duplicate existing topics' : ''}
${generateAnswersInstruction}
${userInstructions}
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

export interface SimpleGenerationResult {
  flashcards: GeneratedFlashcard[]
}

export async function generateFromInstructions(
  instructions: string,
  existingCards?: ExistingCardSummary,
  maxCards: number = 10,
  customPrompt?: string
): Promise<SimpleGenerationResult> {
  const existingCardsContext = existingCards
    ? `
EXISTING CARDS IN DECK (avoid duplicating these topics):
- Total cards: ${existingCards.totalCount}
- Topics already covered: ${existingCards.topics.join(', ')}
- Sample existing cards:
${existingCards.sampleCards.slice(0, 3).map(c => `  Q: ${c.front}\n  A: ${c.back}`).join('\n')}
`
    : ''

  const basePrompt = customPrompt || `You are a study assistant that creates high-quality flashcards based on user instructions.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `${basePrompt}

USER INSTRUCTIONS:
${instructions}

PARAMETERS:
- Generate up to ${maxCards} flashcards based on the instructions above
- Each card should have a clear question (front) and concise answer (back)
- Focus on the specific topic or style the user requested
${existingCards ? '- IMPORTANT: Avoid creating cards that duplicate existing topics' : ''}
${existingCardsContext}

Return your response as a JSON object with this structure:
{
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
    let jsonText = textContent.text.trim()

    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7)
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3)
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3)
    }
    jsonText = jsonText.trim()

    const result = JSON.parse(jsonText) as SimpleGenerationResult
    return result
  } catch (e) {
    console.error('Failed to parse AI response:', textContent.text.slice(0, 500))
    throw new Error('Failed to parse generation from AI response')
  }
}
