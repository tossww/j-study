# Project Initialization Guide

**This file guides Friday through bootstrapping a new project from scratch.**

Friday should follow this workflow when `AI/PRD.md` does not exist (first session in new project).

---

## Step 1: Opening Question

```
Hey Boss. Friday here. New project detected.

What are we building?
```

**Listen for:**
- Project type (web app, CLI tool, API, library, etc.)
- Core purpose (what problem does it solve?)
- Key features (what must it do?)

## Step 2: Deep Dive Questions

Ask clarifying questions to understand:

**Scope & Requirements:**
- Who is the target user?
- What are the must-have features vs nice-to-haves?
- Are there any existing solutions we're replacing or integrating with?
- What's the success criteria? (How do we know it's done?)

**Technical Context:**
- Any preferred tech stack or constraints?
- Performance requirements? (users, scale, speed)
- Integration needs? (APIs, databases, services)
- Deployment target? (local, cloud, serverless, etc.)

**Timeline & Resources:**
- Is this a rapid prototype or production system?
- Solo project or team collaboration?

**DO NOT assume answers.** Ask Boss for every unclear point.

---

## Step 3: Background Research

Based on Boss's answers, get a subagent to research:

1. **Similar solutions** - What exists? What can we learn? Any Github repos?
2. **Technical patterns** - Best practices for this type of project
3. **Common pitfalls** - What typically goes wrong?
4. **Tech stack options** - Evaluate tools/frameworks

Use WebSearch and WebFetch tools for research. 

**Present findings to Boss:**
```
Based on my research, here's what I found:

**Similar Projects:**
- [Project A] does X well, but lacks Y
- [Project B] has Z pattern we should consider

**Tech Stack Recommendation:**
- Framework: [X] because [reasons]
- Database: [Y] because [reasons]
- Deployment: [Z] because [reasons]

**Key Considerations:**
- [Important architectural decision 1]
- [Important architectural decision 2]

Does this align with your vision?
```

Get Boss approval before proceeding.

---

## Step 4: Define Components

> **CRITICAL:** Components must be defined before any work begins. Each component = one Claude session. No overlap allowed.

**Ask Boss to define components:**
```
Before we design the architecture, let's define the project components.

Components determine how work is parallelized - each Claude session works on ONE component at a time. No two sessions can work on the same component.

For this project, I suggest these components:
- [Component A] - [Responsibility]
- [Component B] - [Responsibility]
- [Component C] - [Responsibility]

Does this breakdown work? Should we split or merge any?
```

**Component Guidelines:**
- Components should be independent enough to work on separately
- Too few = no parallelization benefit
- Too many = overhead and fragmentation
- Typical: 3-6 components for medium projects

**Get Boss approval on components before proceeding.**

---

## Step 5: Design System Architecture

Get a subagent to create high-level architecture based on requirements:

**Architecture Elements:**
- How do components interact?
- What are the data flows between components?
- What are the interfaces/contracts between components?

**Data Models:**
- What entities exist?
- What are the relationships?
- Where is data stored?

**APIs/Interfaces:**
- Public APIs?
- Internal interfaces between components?

**Present architecture to Boss:**
```
Here's the proposed architecture:

**Components (confirmed):**
1. [Component A] - Handles [responsibility]
2. [Component B] - Handles [responsibility]

**Component Interactions:**
[Component A] ←→ [Component B] via [interface]

**Data Flow:**
[User] → [Component A] → [Component B] → [Database]

**Key Design Decisions:**
- [Decision 1]: [Rationale]
- [Decision 2]: [Rationale]

Should I proceed with this design?
```

Get Boss approval before proceeding.

---

## Step 6: Create PRD

Use `AI/PRD.template.md` as starting point.

Fill in:
- **Executive Summary** - Vision and goals
- **Requirements** - Functional and non-functional requirements
- **Architecture** - System design from Step 4
- **Tech Stack** - Frameworks, libraries, tools
- **Data Models** - Entities and schemas
- **Success Metrics** - How we measure success
- **Milestones** - Break work into 3-5 milestones with clear deliverables

Save to `AI/PRD.md`

## Step 7: Create Initial Todos

Use `AI/TODO.template.md` - keep entire structure, fill in:
- Current Session Context (date, status, what's next)
- Milestone 1 name, goal, success criteria
- Tasks in structured format (Requirement/Test plan/Files)
- Future Milestones from PRD
- Keep Usage Guide section intact

Save to `AI/TODO.md`

## Step 8: Initialize Logs

Create `AI/Logs.md`:
```markdown
# Project Logs

## [DATE] [TIME] - Project Initialized

**Project:** [Name]
**Vision:** [One-line description]

**Initial Setup:**
- Created PRD with [X] milestones
- Defined [Y] core requirements
- Selected tech stack: [Stack]

**Next Steps:**
- Create GitHub repository
- Set up project structure
- Begin Milestone 1

---
```

---

## Step 9: GitHub Repository

Ask Boss if they want a GitHub repository created:
- Propose name based on folder name
- Ask for public/private preference

**If approved:**
- Use `gh repo create` to create repo
- Initialize git, add files, commit with summary of setup
- Push to remote with `-u origin main`

## Step 10: Folder Structure

**First, clean up template-specific files:**
```bash
# Remove template development files (not needed for new projects)
rm -rf template-work/
```

Create standard project structure:

```
/
├── src/              # Source code
├── tests/            # Test files
├── docs/             # Additional documentation
├── AI/              # Already exists with PRD, todos, Logs
│   ├── PRD.md
│   ├── TODO.md
│   ├── Logs.md
│   └── Archive/      # For future archives
├── .gitignore        # Standard ignores
├── README.md         # Project README
├── package.json      # If Node.js project
└── CLAUDE.md         # Already exists
```

Adjust based on tech stack (e.g., Python → `requirements.txt`, Rust → `Cargo.toml`).

---

## Step 11: Create Milestone Docs Folder

Create the `milestones/` folder for milestone documentation:

```bash
mkdir -p milestones
```

Create initial milestone doc using `AI/Archive/Templates/MILESTONE.template.md`:
- Copy template to `milestones/M1.md`
- Fill in the HOW details for first milestone
- Each milestone gets its own doc as work begins

---

## Step 12: Summary & Next Steps

```
Project initialized successfully!

**Created:**
- ✅ PRD with [X] milestones
- ✅ Initial todos for Milestone 1
- ✅ GitHub repository: [URL]
- ✅ Project structure

**Next Steps:**
Milestone 1: [Name]
See AI/TODO.md for full task breakdown.

Ready to start building. What should we tackle first?
```

---

## Bootstrap Checklist

Use this to ensure nothing is missed:

- [ ] Asked "What are we building?"
- [ ] Gathered all requirements through questions
- [ ] Conducted background research
- [ ] Presented findings to Boss
- [ ] **Defined components** (CRITICAL - must do before architecture)
- [ ] Got Boss approval on components
- [ ] Designed system architecture
- [ ] Got Boss approval on design
- [ ] Created `AI/PRD.md` from template (includes component list)
- [ ] Created `AI/TODO.md` from template (includes component table)
- [ ] Created `AI/Logs.md` with initialization entry
- [ ] Asked about GitHub repository
- [ ] Created repo (if approved)
- [ ] Set up folder structure
- [ ] Created `milestones/` folder
- [ ] Created `milestones/M1.md` from template
- [ ] Presented summary and next steps

---

## Tips for Friday

**Do:**
- ✅ Ask questions when unclear
- ✅ Present options with rationale
- ✅ Get Boss approval before major decisions
- ✅ Break work into clear milestones
- ✅ Keep PRD focused on WHAT, not HOW
- ✅ Use TODO.template.md structure as-is

**Don't:**
- ❌ Assume requirements
- ❌ Skip research phase
- ❌ Start coding before PRD is created
- ❌ Create overly complex initial plans
- ❌ Forget to create GitHub repo

---

**After completing this guide, delete or archive PROJECT_START.md - it's only needed once.**
