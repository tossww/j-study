# Project Todos

## Components

> Define components at project start. **One Claude session = One component. No overlap.**

- **Core** - Database, API routes, AI integration → `Free`
- **UI** - Frontend pages and components → `Free`

*Status: `Free` | `Locked` | `Blocked:M#`*

---

## Master Milestone List

- **M0** [Core] Project Setup → `DONE`
- **M1** [Core, UI] File Upload & AI Generation → `DONE`
- **M2** [UI] Study Mode Polish → `ACTIVE`
- **M3** [UI] Statistics & Organization → `READY`

*Status: `READY` | `ACTIVE` | `BLOCKED:M#` | `DONE`*

---

## Session Context

> **Rule: Each Claude session updates ONLY its own component's context.**

### Core
**Last Session:** 2026-01-13 16:00

**Milestone:** M2 - Study Mode Polish (Starting)

**What happened:**
Completed M1 testing. All upload flows verified working:
- PDF upload: text extraction via pdf-parse → AI generates flashcards
- TXT/MD upload: direct text processing → AI generates flashcards
- AI analysis: content type detection, topic extraction, coverage assessment, suggestions
- Database: decks and flashcards saved correctly with SRS metadata

**Key files for M1:**
- `src/lib/anthropic.ts` - AI flashcard generation with analysis
- `src/app/api/upload/route.ts` - Upload endpoint
- `src/lib/file-parser.ts` - PDF/text parsing
- `src/components/FileUpload.tsx` - Upload UI
- `src/components/UploadResult.tsx` - Result display with analysis

**Next up:** M2 - Study Mode Polish

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
- [x] Can upload PDF and extract text
- [x] Can upload TXT/MD files
- [x] Claude generates flashcards appropriate to content
- [x] Flashcards saved to database
- [x] Deck created with file name

**Status:** DONE

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

### M1 [Core, UI] - File Upload & AI Generation
**Completed:** 2026-01-13
**Commit:** e9b056e
Full upload flow with AI-powered flashcard generation. Supports PDF, TXT, MD files. Includes content analysis (type detection, topic extraction, coverage assessment, suggestions).

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
