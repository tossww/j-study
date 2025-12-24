# Project Todos

## Components

> Define components at project start. **One Claude session = One component. No overlap.**

- **Auth** - Authentication and session management → `Free`
- **API** - Backend endpoints and data layer → `Free`
- **UI** - Frontend components and pages → `Free`

*Status: `Free` | `Locked` | `Blocked:M#`*

---

## Master Milestone List

- **M1** [Auth] User Authentication → `READY`
- **M2** [API] Core API Endpoints → `READY`
- **M3** [UI] Dashboard Layout → `BLOCKED:M1`
- **M4** [Auth, API] OAuth Integration → `READY` (depends: M1)

*Status: `READY` | `ACTIVE` | `BLOCKED:M#` | `DONE`*

---

## Session Context

> **Rule: Each Claude session updates ONLY its own component's context.**

### Auth
*(No sessions yet)*

### API
*(No sessions yet)*

### UI
*(No sessions yet)*

---

## Milestone Details

### M1 [Auth] - User Authentication

**What:** Users can register and log in with email/password

**Files to create:**
- `src/auth/login.py`
- `src/auth/register.py`
- `tests/test_auth.py`

**Test Criteria:**
- [ ] User can create account
- [ ] User can log in
- [ ] Invalid credentials rejected
- [ ] Session persists on refresh

**Milestone Doc:** `milestones/M1.md`
**Status:** READY

---

### M2 [API] - Core API Endpoints

**What:** CRUD operations for main data entities
**Test Criteria:**
- [ ] Create entity returns 201
- [ ] Read entity returns correct data
- [ ] Update entity persists changes
- [ ] Delete entity removes from DB

**Milestone Doc:** `milestones/M2.md`
**Status:** READY

---

### M3 [UI] - Dashboard Layout

**What:** Main dashboard with navigation and data display
**Test Criteria:**
- [ ] Dashboard loads without errors
- [ ] Navigation works between sections
- [ ] Data displays correctly from API

**Milestone Doc:** `milestones/M3.md`
**Status:** BLOCKED:M1
**Depends:** M1 (needs auth to protect routes)

---

### M4 [Auth, API] - OAuth Integration

**What:** Users can log in via Google/GitHub OAuth
**Test Criteria:**
- [ ] OAuth redirect flow works
- [ ] User created/linked on first OAuth login
- [ ] Session created after OAuth success

**Milestone Doc:** `milestones/M4.md`
**Status:** READY
**Note:** Multi-component milestone. Locks both Auth and API.

---

## Completed Milestones

*(None yet)*

---

## Rules

**Components:**
- One Claude session works on one component at a time
- Multi-component milestones lock ALL affected components
- If you notice component overlap, alert Boss immediately

**Milestones:**
- Work in order (M1 before M2)
- Each milestone has a doc in `milestones/M#.md` defining HOW
- TODO.md defines WHAT and TEST CRITERIA only

**Testing:**
- Milestone is DONE only when all test criteria pass
- Unit tests for logic, integration tests for flows
- Manual testing when needed

**Status Flow:**
```
READY → ACTIVE → DONE
         ↓
      BLOCKED (if dependency not met)
```
