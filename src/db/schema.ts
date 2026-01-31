import { pgTable, serial, text, timestamp, integer, boolean, primaryKey } from 'drizzle-orm/pg-core'

// ============================================
// AUTH TABLES (Auth.js / NextAuth)
// ============================================

// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique().notNull(),
  password: text('password').notNull(), // bcrypt hashed
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Sessions table
export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

// Accounts table (for OAuth providers - future use)
export const accounts = pgTable('accounts', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (account) => ({
  compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
}))

// Verification tokens (for email verification - future use)
export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (vt) => ({
  compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
}))

// ============================================
// APPLICATION TABLES
// ============================================

// Folders table - organize decks into hierarchy (max 5 levels)
export const folders = pgTable('folders', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  parentId: integer('parent_id'),  // Self-reference, null for root folders
  depth: integer('depth').default(0).notNull(), // 0, 1, or 2 (enforced in API)
  sortOrder: integer('sort_order').default(0).notNull(), // For ordering folders
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }), // nullable for migration
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Decks table - groups of flashcards
export const decks = pgTable('decks', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  originalPrompt: text('original_prompt'), // User's instructions when creating deck
  sourceFileName: text('source_file_name'),
  analysis: text('analysis'), // JSON string with AI feedback
  folderId: integer('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  sortOrder: integer('sort_order').default(0).notNull(), // For ordering decks within a folder
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }), // nullable for migration
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Analysis type for AI feedback
export interface DeckAnalysis {
  contentType: 'notes' | 'questions' | 'textbook' | 'slides' | 'other'
  topics: string[]
  coverage: 'sparse' | 'moderate' | 'good' | 'comprehensive'
  suggestions: string[]
  specialAction?: {
    type: 'generate_answers' | 'generate_questions'
    description: string
  }
}

// Flashcards table
export const flashcards = pgTable('flashcards', {
  id: serial('id').primaryKey(),
  deckId: integer('deck_id').references(() => decks.id, { onDelete: 'cascade' }).notNull(),
  front: text('front').notNull(),  // Question
  back: text('back').notNull(),    // Answer
  // Spaced repetition fields
  easeFactor: integer('ease_factor').default(250).notNull(), // 2.5 * 100 for integer storage
  interval: integer('interval').default(0).notNull(),        // Days until next review
  repetitions: integer('repetitions').default(0).notNull(),  // Number of successful reviews
  nextReviewAt: timestamp('next_review_at').defaultNow().notNull(),
  // Stats
  timesCorrect: integer('times_correct').default(0).notNull(),
  timesIncorrect: integer('times_incorrect').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Study sessions table - for tracking study history
export const studySessions = pgTable('study_sessions', {
  id: serial('id').primaryKey(),
  deckId: integer('deck_id').references(() => decks.id, { onDelete: 'cascade' }).notNull(),
  cardsStudied: integer('cards_studied').default(0).notNull(),
  cardsCorrect: integer('cards_correct').default(0).notNull(),
  duration: integer('duration').default(0).notNull(), // seconds
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Reference files table - uploaded files for studying
export const referenceFiles = pgTable('reference_files', {
  id: serial('id').primaryKey(),
  deckId: integer('deck_id').references(() => decks.id, { onDelete: 'cascade' }).notNull(),
  fileName: text('file_name').notNull(),
  blobUrl: text('blob_url').notNull(),
  fileType: text('file_type').notNull(), // 'pdf' | 'txt' | 'md'
  fileSize: integer('file_size'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Saved quizzes table - for retaking quizzes
export const savedQuizzes = pgTable('saved_quizzes', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  sourceType: text('source_type').notNull(), // 'deck' | 'decks' | 'content'
  sourceName: text('source_name'),
  deckIds: text('deck_ids'), // JSON array of deck IDs if from decks
  questions: text('questions').notNull(), // JSON string of questions
  customInstructions: text('custom_instructions'),
  lastScore: integer('last_score'), // Last score percentage
  timesTaken: integer('times_taken').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastTakenAt: timestamp('last_taken_at'),
})

// Types for TypeScript
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type Account = typeof accounts.$inferSelect
export type Folder = typeof folders.$inferSelect
export type NewFolder = typeof folders.$inferInsert
export type Deck = typeof decks.$inferSelect
export type NewDeck = typeof decks.$inferInsert
export type Flashcard = typeof flashcards.$inferSelect
export type NewFlashcard = typeof flashcards.$inferInsert
export type StudySession = typeof studySessions.$inferSelect
export type NewStudySession = typeof studySessions.$inferInsert
export type ReferenceFile = typeof referenceFiles.$inferSelect
export type NewReferenceFile = typeof referenceFiles.$inferInsert
export type SavedQuiz = typeof savedQuizzes.$inferSelect
export type NewSavedQuiz = typeof savedQuizzes.$inferInsert
