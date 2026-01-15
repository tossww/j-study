# PRD - J-Study

**Last Updated:** 2024-12-24
**Status:** Milestone 0 of 3 (Setup)

---

## Vision

A personal flashcard study app inspired by Gizmo. Upload study materials (PDFs, text files, markdown) and use AI to automatically generate flashcards. Study with spaced repetition tracking.

**Target Users:** J (personal use only, no auth required)

---

## Features

### Core Features (Must Build)

- [x] **File Upload:** Upload PDF, text, or markdown files for processing
- [x] **AI Flashcard Generation:** Use Anthropic Claude to extract key concepts and generate Q&A flashcards
- [x] **Flashcard Study Mode:** Flip cards, mark as known/unknown, track progress
- [x] **Spaced Repetition:** Simple SRS to prioritize cards you don't know well

### Planned Features (Next Milestones)

- **Layout Redesign (M8):** Collapsible sidebar, top header with search, modern dashboard layout
- **Quiz Modes (M9):** Multiple choice, fill-in-the-blank, typed answers with mode selector
- **SRS Visibility (M10):** Show SRS grading on cards, practice weak cards mode
- **Reference Sheets (M11):** View uploaded files while studying as reference material
- **Nested Folders (M12):** Organize decks into nested folder structure
- **User Accounts (M13):** Email/password + magic link authentication

### Future Features (Nice-to-Have)

- **Export:** Export flashcards to CSV or Anki format
- **YouTube Import:** Generate flashcards from YouTube video transcripts
- **AI Tutor:** Chat interface to ask questions about deck content

### Not Building (Out of Scope)

- **Social Features:** No sharing, no friends, no leaderboards
- **Mobile App:** Web only (responsive design works on mobile browser)

---

## Tech Stack

**Frontend:**
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS for styling
- React components

**Backend:**
- Next.js API Routes (serverless functions)
- Vercel Blob for file storage

**Database:**
- Vercel Postgres (managed PostgreSQL)

**AI:**
- Anthropic Claude API (claude-sonnet-4-20250514 for flashcard generation)

**Deployment:**
- Vercel (auto-deploy from GitHub)
- All management via `vercel` CLI

**CLI Tools Required:**
- `vercel` - deployment, database, blob storage
- `npm` - package management
- `git` - version control

---

## Components

> **One Claude session = One component. No overlap allowed.**

- **Core** - Database schema, API routes, AI integration
- **UI** - Frontend pages and components

**Component Interactions:**
- UI uploads file → API processes → AI generates cards → DB stores
- UI fetches cards → displays study interface → updates progress in DB

---

## Milestones

### Milestone 0: Project Setup (CURRENT)

**Goal:** Base project ready for development

**Features:**
- Project structure with Next.js 14
- Vercel Postgres configured
- Vercel Blob configured
- Anthropic API integration ready
- Basic UI scaffolding

**Status:** In Progress

---

### Milestone 1: File Upload & AI Generation

**Goal:** Upload a file and get flashcards

**Features:**
- File upload UI
- PDF/text parsing
- Claude API call to generate flashcards
- Store flashcards in database

**Status:** Not Started

---

### Milestone 2: Study Mode

**Goal:** Study flashcards with basic tracking

**Features:**
- Flashcard flip interface
- Know/Don't Know buttons
- Progress tracking
- Simple spaced repetition

**Status:** Not Started

---

### Milestone 3: Polish

**Goal:** Make it nice to use

**Features:**
- Better UI/UX
- Deck organization
- Statistics view

**Status:** Not Started

---

## Success Criteria

**We're done when:**
- [x] Can upload a PDF or text file
- [x] AI generates relevant flashcards from content
- [x] Can study flashcards (flip, mark known/unknown)
- [x] Progress persists between sessions
- [x] Deploys to Vercel with `vercel --prod`

---

## Guidelines

**Important Constraints:**
- No authentication - single user app
- All config via CLI, no web dashboards required
- Keep dependencies minimal

**Patterns to Follow:**
- Use Server Components where possible
- API routes for mutations
- Tailwind for all styling (no CSS files)

**Things to Avoid:**
- Don't add auth libraries
- Don't add unnecessary dependencies
- Don't use external services beyond Vercel + Anthropic

---

## CLI Workflow

```bash
# Development
npm run dev          # Start local dev server

# Database
vercel env pull      # Pull environment variables
vercel postgres      # Manage database

# Deployment
vercel              # Preview deployment
vercel --prod       # Production deployment

# Environment
vercel env add      # Add new env variable
```

---

*This PRD is the source of truth. Code must match PRD.*
