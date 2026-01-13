# Project Todos

## Components

> Define components at project start. **One Claude session = One component. No overlap.**

- **Core** - Database, API routes, AI integration → `Free`
- **UI** - Frontend pages and components → `Free`

*Status: `Free` | `Locked` | `Blocked:M#`*

---

## Master Milestone List

- **M0** [Core] Project Setup → `DONE`
- **M1** [Core, UI] File Upload & AI Generation → `ACTIVE`
- **M2** [UI] Study Mode Polish → `READY`
- **M3** [UI] Statistics & Organization → `READY`

*Status: `READY` | `ACTIVE` | `BLOCKED:M#` | `DONE`*

---

## Session Context

> **Rule: Each Claude session updates ONLY its own component's context.**

### Core
**Last Session:** 2026-01-13 10:45

**Milestone:** M1 - File Upload & AI Generation (In Progress)

**What happened:**
Significant implementation work on M1. Enhanced the upload flow with AI-powered content analysis. Claude now analyzes uploaded files, identifies content type (notes/questions/textbook/slides), extracts topics, assesses coverage, and provides suggestions.

**Changes made (UNCOMMITTED):**
- `src/lib/anthropic.ts` - Added `analyzeAndGenerateFlashcards()` function with:
  - Content type detection
  - Topic extraction
  - Coverage assessment (sparse/moderate/good/comprehensive)
  - Suggestions for additional materials
  - Special action prompts (e.g., detect question sheets → offer to generate answers)
  - Context-aware generation to avoid duplicate cards when adding to existing deck
- `src/app/api/upload/route.ts` - Enhanced to:
  - Support adding cards to existing decks (deckId param)
  - Generate answers for question sheets (generateAnswers param)
  - Return analysis with flashcards
  - Removed Vercel Blob dependency (direct parsing)
- `src/db/schema.ts` - Added `DeckAnalysis` interface and `analysis` column to decks table
- `src/components/UploadResult.tsx` - **NEW** component showing:
  - Success header with card count
  - AI analysis panel (content type, coverage, topics, suggestions)
  - Special action prompts (e.g., "Generate answers?" for question sheets)
  - Add-more drop zone for expanding decks
- `src/components/FileUpload.tsx` - Enhanced with:
  - Upload result state management
  - Support for adding more files to same deck
  - Answer generation flow
- `src/components/DeckList.tsx` - Minor updates
- `src/app/study/page.tsx` - Minor updates

**Next up:**
1. **COMMIT THE CHANGES** - All code is uncommitted!
2. **Test the upload flow** - Verify M1 test criteria:
   - [ ] Upload PDF → extract text → generate cards
   - [ ] Upload TXT/MD files
   - [ ] Claude generates 10-20 relevant flashcards
   - [ ] Flashcards saved to database
   - [ ] Deck created with file name
3. **DB Migration** - The schema added an `analysis` column - may need migration

**Important context:**
- Schema was modified (added `analysis` text column) - production DB may need migration
- The enhanced AI flow uses more tokens (analysis + generation in one call)
- Question sheet detection is a nice-to-have feature, but may not be critical for M1

### UI
**Last Session:** 2024-12-24
Created all base UI components: FileUpload (drag-and-drop), Flashcard (flip animation), StudySession (progress tracking), DeckList. Pages created for home, upload, and study.

---

## Milestone Details

### M0 [Core] - Project Setup

**What:** Base project with all infrastructure ready

**Test Criteria:**
- [x] Next.js 14 project structure created
- [x] Vercel Postgres schema defined (decks, flashcards, study_sessions)
- [x] Drizzle ORM configured
- [x] Anthropic API integration ready
- [x] File parsing for PDF/text/markdown
- [x] All API routes created
- [x] Base UI components created
- [x] Vercel deployment working
- [x] Database connected on Vercel

**Status:** DONE

**Production URL:** https://j-study-tossww.vercel.app

---

### M1 [Core, UI] - File Upload & AI Generation

**What:** Upload a file and get flashcards generated

**Test Criteria:**
- [ ] Can upload PDF and extract text
- [ ] Can upload TXT/MD files
- [ ] Claude generates 10-20 relevant flashcards
- [ ] Flashcards saved to database
- [ ] Deck created with file name

**Status:** READY

---

### M2 [UI] - Study Mode Polish

**What:** Make studying smooth and enjoyable

**Test Criteria:**
- [ ] Card flip animation works smoothly
- [ ] Progress bar shows position in deck
- [ ] Know/Don't Know buttons update SRS
- [ ] Session summary shows at end
- [ ] Can restart session

**Status:** READY

---

### M3 [UI] - Statistics & Organization

**What:** Track progress and organize decks

**Test Criteria:**
- [ ] Can see all decks with card counts
- [ ] Can delete a deck
- [ ] Study streak tracking
- [ ] Accuracy statistics per deck

**Status:** READY

---

## Completed Milestones

### M0 [Core] - Project Setup
**Completed:** 2026-01-13
**Commit:** a9bbd4f
Base infrastructure set up with Next.js, Neon Postgres, Anthropic integration. Deployed to https://j-study-tossww.vercel.app

---

## Rules

**Components:**
- One Claude session works on one component at a time
- Multi-component milestones lock ALL affected components
- If you notice component overlap, alert Boss immediately

**Milestones:**
- Work in order (M0 → M1 → M2 → M3)
- Each milestone has clear test criteria
- Milestone is DONE only when all test criteria pass

**Status Flow:**
```
READY → ACTIVE → DONE
         ↓
      BLOCKED (if dependency not met)
```
