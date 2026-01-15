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
- **M2** [UI] Study Mode Polish → `DONE`
- **M3** [UI] Statistics & Organization → `DONE`
- **M4** [UI] Deck Editing → `DONE`
- **M5** [Core, UI] Upload Enhancements & Prompt Config → `DONE`
- **M6** [UI] Unified Deck Creation + UX Fixes → `DONE`
- **M7** [Core] Smart AI Card Operations → `ACTIVE`
- **M8** [UI] Layout Redesign → `READY`
- **M9** [Core, UI] Quiz Modes → `READY`
- **M10** [UI] SRS Visibility & Practice Mode → `READY`
- **M11** [Core, UI] Reference Sheets → `READY`
- **M12** [Core, UI] Nested Folders → `READY`
- **M13** [Core, UI] User Accounts → `READY`

*Status: `READY` | `ACTIVE` | `BLOCKED:M#` | `DONE`*

---

## Session Context

> **Rule: Each Claude session updates ONLY its own component's context.**

### Core
**Last Session:** 2026-01-14 17:30

**Milestone:** M7 - Smart AI Card Operations (In Progress)

**What happened:**
Implemented full AI card CRUD operations. AI now understands it can add, update, and delete cards through natural language. Added `smartCardOperations()` function that passes all existing cards with IDs to the AI so it can reference specific cards to fix/delete.

**Key changes:**
- `src/lib/anthropic.ts` - New `smartCardOperations()` with add/update/delete support
- `src/app/api/generate/route.ts` - Processes operations and returns detailed breakdown
- `src/app/edit/[deckId]/page.tsx` - Summary popup shows added/updated/deleted cards

**Bug fix:** Added "ACCURACY IS NON-NEGOTIABLE" prompt instruction to fix issue where AI would show correct reasoning (e.g., "20-12+3=11") but output wrong answer (14). AI now required to derive answers fresh and verify output matches reasoning.

**Next up:**
- Test all operations: add, update, delete, invalid request
- Check off M7 test criteria
- Changes need to be committed

### UI
**Last Session:** 2026-01-14 17:16

Post-M6 enhancements:
- Edit button on flashcards during study mode (inline editing without leaving session)
- Summary popup modal after AI generation (shows stats: +X cards added, Y total)
- Suggested deck name UI integrated into popup with Apply/Skip buttons

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
- [x] Card flip animation works smoothly
- [x] Progress bar shows position in deck
- [x] Know/Don't Know buttons update SRS
- [x] Session summary shows at end
- [x] Can restart session

**Status:** DONE

---

### M3 [UI] - Statistics & Organization

**What:** Track progress and organize decks

**Test Criteria:**
- [x] Can see all decks with card counts
- [x] Can delete a deck
- [x] Study streak tracking
- [x] Accuracy statistics per deck

**Status:** DONE

---

### M4 [UI] - Deck Editing

**What:** Edit and manage existing decks

**Test Criteria:**
- [x] Can rename a deck
- [x] Can edit individual flashcard front/back
- [x] Can delete individual flashcards
- [x] Can add new cards to existing deck manually

**Status:** DONE

---

### M5 [Core, UI] - Upload Enhancements & Prompt Config

**What:** Enhanced upload flow with additional instructions and configurable AI prompts

**Test Criteria:**
- [x] Can upload new material when editing an existing deck (adds cards to deck)
- [x] Textbox for additional instructions appears when uploading (new or existing deck)
- [x] AI uses additional instructions when generating flashcards
- [x] Options page shows current AI prompt (readable)
- [x] Can edit the AI prompt in options
- [x] Can restore AI prompt to default after editing

**Status:** DONE

---

### M6 [UI] - Unified Deck Creation + UX Fixes

**What:** Redesign "Create New Deck" to match edit deck UX (instructions-first, file optional) + fix critical UX issues from audit

**Test Criteria:**
- [x] Create deck page: Instructions textarea always visible (not hidden until file selected)
- [x] Create deck page: File upload is optional (can generate from instructions only)
- [x] Create deck page: Can still create from file-only (backwards compatible)
- [x] Edit deck page: Success toast/feedback after AI generation completes
- [x] Study mode: Exit button visible to leave session early
- [x] Home page: Button text updated ("Create New Deck" instead of "Upload Study Material")

**Status:** DONE

---

### M7 [Core] - Smart AI Card Operations

**What:** Upgrade AI to understand its full capabilities and perform add/update/delete operations on cards through natural language. Single textbox UX remains - AI determines intent and acts accordingly.

**Test Criteria:**
- [ ] AI can add new cards (existing behavior)
- [ ] AI can update existing cards by identifying which ones need fixing
- [ ] AI can delete cards when asked (e.g., "remove the wrong cards")
- [ ] AI responds gracefully when asked to do something it can't do
- [ ] Summary popup shows detailed breakdown (cards added, updated, deleted with specifics)
- [ ] Existing cards are passed to AI with IDs so it can reference them

**Status:** ACTIVE - Ready for testing

---

### M8 [UI] - Layout Redesign

**What:** Major UI overhaul with collapsible sidebar navigation, top header with search, and organized main content area. Inspired by modern dashboard layouts.

**Test Criteria:**
- [ ] Collapsible left sidebar with navigation (Home, Folders, Stats, Quiz, Settings)
- [ ] User profile section in sidebar (placeholder until M13)
- [ ] Top header with search bar and "Create Deck" button
- [ ] Main content area with "Continue Studying" section
- [ ] Recent decks displayed as cards
- [ ] Soft, rounded design with pastel color palette
- [ ] Responsive: sidebar collapses to icons on smaller screens
- [ ] All existing functionality still works (study, edit, create, etc.)

**Status:** READY

---

### M9 [Core, UI] - Quiz Modes

**What:** Add quiz functionality with multiple question types. Users can choose specific types or combine for mixed quizzes.

**Test Criteria:**
- [ ] Multiple choice questions generated from flashcards (AI generates wrong options)
- [ ] Fill-in-the-blank questions generated (AI identifies key terms to blank out)
- [ ] Typed answer questions (user types, AI grades correctness)
- [ ] Mode selector before quiz: pick one type or combine multiple
- [ ] Scoring system with results at end
- [ ] Can quiz on specific deck or all cards

**Status:** READY

---

### M10 [UI] - SRS Visibility & Practice Mode

**What:** Show SRS grading on flashcards and add ability to practice weak cards specifically.

**Test Criteria:**
- [ ] SRS level visible on each card (visual indicator: color, number, or label)
- [ ] Keep existing 2-button system (Know / Don't Know)
- [ ] "Practice Weak Cards" filter mode (only shows low-SRS cards)
- [ ] Can see SRS stats per card in deck edit view

**Status:** READY

---

### M11 [Core, UI] - Reference Sheets

**What:** Store uploaded files and allow viewing them while studying as reference material.

**Test Criteria:**
- [ ] Uploaded files stored (not just text extracted)
- [ ] Can view original file from deck page
- [ ] Side panel or toggle to view file while studying
- [ ] Supports PDF, TXT, MD viewing
- [ ] File associated with deck (one file per deck, or multiple?)

**Status:** READY

---

### M12 [Core, UI] - Nested Folders

**What:** Organize decks into a nested folder structure.

**Test Criteria:**
- [ ] Can create folders
- [ ] Can create folders inside folders (nested)
- [ ] Can move decks into folders
- [ ] Can move decks between folders
- [ ] Can rename/delete folders
- [ ] Folder navigation UI (breadcrumbs or tree view)
- [ ] Home shows top-level folders and unfiled decks

**Status:** READY

---

### M13 [Core, UI] - User Accounts

**What:** Add authentication so multiple users can have their own data.

**Test Criteria:**
- [ ] Email/password registration and login
- [ ] Magic link login (email link, no password)
- [ ] User-specific decks (each user sees only their decks)
- [ ] Existing data migration strategy (assign to first user or admin)
- [ ] Logout functionality
- [ ] Protected routes (redirect to login if not authenticated)

**Status:** READY

---

## Completed Milestones

### M6 [UI] - Unified Deck Creation + UX Fixes
**Completed:** 2026-01-13
**Commit:** e035315
Redesigned "Create New Deck" page with instructions-first UX (file optional). API updated to create new decks from instructions only. Added success toast to edit deck AI generation, exit button to study mode, and "Back to Decks" button on session complete.

### M5 [Core, UI] - Upload Enhancements & Prompt Config
**Completed:** 2026-01-13
**Commit:** e72a469
Enhanced upload with additional instructions and customizable AI prompts. Options page at /options for viewing/editing AI prompt with reset to default. Settings accessible via gear icon on home page. Post-M5 enhancement: Always-visible AI generation section on edit page with instructions-only generation support (file optional). New `/api/generate` endpoint.

### M4 [UI] - Deck Editing
**Completed:** 2026-01-13
**Commit:** 9c9ccfd
Full deck editing UI at /edit/[deckId]. Rename deck, edit card front/back, delete cards, add new cards manually. Edit button added to DeckList. API endpoints: GET/PATCH deck, POST/PATCH/DELETE flashcards.

### M3 [UI] - Statistics & Organization
**Completed:** 2026-01-13
**Commit:** a32394e
Stats bar with streak/cards studied/accuracy. Deck list with card counts and per-deck accuracy. Delete deck with confirmation. Study streak calculation based on daily activity.

### M2 [UI] - Study Mode Polish
**Completed:** 2026-01-13
**Commit:** (pre-existing)
Study mode with smooth card flip animation, progress bar, SRS updates (SM-2), session summary, and restart functionality.

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
