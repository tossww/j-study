import { pgTable, serial, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core'

// Decks table - groups of flashcards
export const decks = pgTable('decks', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  sourceFileName: text('source_file_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

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

// Types for TypeScript
export type Deck = typeof decks.$inferSelect
export type NewDeck = typeof decks.$inferInsert
export type Flashcard = typeof flashcards.$inferSelect
export type NewFlashcard = typeof flashcards.$inferInsert
export type StudySession = typeof studySessions.$inferSelect
export type NewStudySession = typeof studySessions.$inferInsert
