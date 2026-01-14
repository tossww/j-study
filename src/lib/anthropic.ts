import type { DeckAnalysis } from '@/db/schema'
import { DEFAULT_PROMPT } from './prompt-config'

// Model to use - using Haiku for faster responses on serverless
const MODEL = 'claude-3-5-haiku-20241022'
const API_URL = 'https://api.anthropic.com/v1/messages'

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>
}

async function callAnthropic(prompt: string, maxTokens: number = 4096): Promise<string> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${error}`)
  }

  const data: AnthropicResponse = await response.json()
  const textContent = data.content.find(block => block.type === 'text')

  if (!textContent?.text) {
    throw new Error('No text content in response')
  }

  return textContent.text
}

function parseJsonResponse(text: string): unknown {
  let jsonText = text.trim()

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

  return JSON.parse(jsonText)
}

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
  const prompt = `You are a study assistant that creates high-quality flashcards from educational content.

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

  const responseText = await callAnthropic(prompt)

  try {
    return parseJsonResponse(responseText) as GeneratedFlashcard[]
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

  const prompt = `${basePrompt}

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

  const responseText = await callAnthropic(prompt)

  try {
    return parseJsonResponse(responseText) as AnalysisResult
  } catch (e) {
    console.error('Failed to parse AI response:', responseText.slice(0, 500))
    throw new Error('Failed to parse analysis from AI response')
  }
}

export interface SimpleGenerationResult {
  flashcards: GeneratedFlashcard[]
  deckName?: string
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

  const needsDeckName = !existingCards

  const prompt = `${basePrompt}

USER INSTRUCTIONS:
${instructions}

PARAMETERS:
- Generate up to ${maxCards} flashcards based on the instructions above
- Each card should have a clear question (front) and concise answer (back)
- Focus on the specific topic or style the user requested
${existingCards ? '- IMPORTANT: Avoid creating cards that duplicate existing topics' : ''}
${needsDeckName ? '- Generate a short, descriptive deck name (2-5 words) based on the topic' : ''}
${existingCardsContext}

Return your response as a JSON object with this structure:
{
  ${needsDeckName ? '"deckName": "Short Deck Name Here",' : ''}
  "flashcards": [
    {"front": "Question here", "back": "Answer here"},
    ...
  ]
}

Return ONLY the JSON object, no other text.`

  const responseText = await callAnthropic(prompt)

  try {
    return parseJsonResponse(responseText) as SimpleGenerationResult
  } catch (e) {
    console.error('Failed to parse AI response:', responseText.slice(0, 500))
    throw new Error('Failed to parse generation from AI response')
  }
}
