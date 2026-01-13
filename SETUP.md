# J-Study Setup Guide

**Production URL:** https://j-study-tossww.vercel.app

Two setup paths depending on your role:
- **Admin (Steven)**: Full Vercel setup, manages database and deployments
- **Developer (Jasmine)**: Clone repo, receive env file, start coding

---

## Developer Setup (Jasmine)

> **For Claude:** Follow these steps to set up the project for Jasmine. She does NOT have a Vercel account - Steven manages deployment.

### Step 1: Clone and Install

```bash
git clone https://github.com/tossww/j-study.git
cd j-study
npm install
```

### Step 2: Environment File

**IMPORTANT:** The `.env.local` file is NOT in the repo (it contains secrets).

Check if `.env.local` exists in the project root:
- **If it exists:** Proceed to Step 3
- **If missing:** Tell Jasmine to ask Steven for the file. He will send it via iMessage/AirDrop (not GitHub).

The file should be placed at:
```
j-study/.env.local
```

### Step 3: Verify Setup

```bash
npm run dev
```

This starts the dev server at http://localhost:3000. Open it in a browser to verify.

### Database Operations

Jasmine has full database access via the shared credentials:

```bash
# After editing src/db/schema.ts, push changes:
npm run db:push

# View/edit data in browser UI:
npm run db:studio
```

### Git Workflow

Jasmine works on branches, Steven reviews and deploys:

```bash
git checkout -b feature-name
# make changes
git add .
git commit -m "Description of changes"
git push origin feature-name
```

Then create a Pull Request on GitHub. Steven will review and merge to trigger deployment.

---

## Admin Setup (Steven)

Full setup including Vercel, database, and environment management.

### Prerequisites

- Node.js v18+
- npm
- Git
- Vercel CLI (`npm install -g vercel`)

### Step 1: Clone and Install

```bash
git clone https://github.com/tossww/j-study.git
cd j-study
npm install
```

### Step 2: Link to Vercel

```bash
vercel link
```

### Step 3: Create Postgres Database

Go to https://vercel.com/tossww/j-study/stores and:
1. Click "Create Database"
2. Select "Postgres"
3. Name it `j-study-db`
4. Click "Create"

The env vars are automatically added to the project.

### Step 4: Add Anthropic API Key

```bash
vercel env add ANTHROPIC_API_KEY
# Select: Production, Preview, Development
# Paste your API key (starts with sk-ant-)
```

### Step 5: Pull Env Vars and Push Schema

```bash
# Pull all env vars to local file
vercel env pull .env.local

# Push database schema
npm run db:push
```

### Step 6: Deploy

```bash
vercel --prod
```

### Step 7: Share Env File with Jasmine

Send `.env.local` to Jasmine securely (iMessage, AirDrop, etc).

**Do NOT commit this file to git.**

---

## CLI Commands Reference

### Development
```bash
npm run dev          # Start local server (http://localhost:3000)
npm run build        # Build for production
npm run lint         # Check code issues
```

### Database
```bash
npm run db:push      # Push schema changes to database
npm run db:studio    # Open database viewer (browser)
```

### Deployment (Admin only)
```bash
vercel               # Preview deployment
vercel --prod        # Production deployment
vercel env pull      # Sync env vars to .env.local
vercel logs          # View deployment logs
```

---

## Project Structure

```
j-study/
├── src/
│   ├── app/                 # Pages and API routes
│   │   ├── api/             # Backend endpoints
│   │   │   ├── upload/      # File upload + AI generation
│   │   │   ├── decks/       # List all decks
│   │   │   ├── flashcards/  # Get cards for a deck
│   │   │   └── study/       # Update card progress
│   │   ├── upload/          # Upload page
│   │   ├── study/           # Study page
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Home page
│   ├── components/          # React components
│   │   ├── FileUpload.tsx   # Drag-and-drop upload
│   │   ├── Flashcard.tsx    # Flip card component
│   │   ├── StudySession.tsx # Study mode logic
│   │   └── DeckList.tsx     # List of decks
│   ├── db/                  # Database
│   │   ├── schema.ts        # Table definitions
│   │   └── index.ts         # Connection
│   └── lib/                 # Utilities
│       ├── anthropic.ts     # AI flashcard generation
│       └── file-parser.ts   # PDF/text parsing
├── PRD.md                   # Project requirements
├── TODO.md                  # Current tasks
├── SETUP.md                 # This file
└── CLAUDE.md                # AI assistant instructions
```

---

## Troubleshooting

### "Module not found" errors
```bash
npm install
```

### Database connection errors
```bash
# Make sure .env.local exists and has POSTGRES_URL
# Admin can regenerate with: vercel env pull .env.local
```

### Can't push schema changes
```bash
# Check that .env.local has valid database credentials
npm run db:push
```

### Need to see what's in the database
```bash
npm run db:studio
# Opens browser UI to view/edit data
```

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)

---

Happy studying!
