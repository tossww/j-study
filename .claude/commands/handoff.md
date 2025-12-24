---
description: Hand off context to next agent after /clear
---

**PURPOSE:** Make TODO.md so detailed that after /clear, the next agent knows EXACTLY what to work on just by reading it.

**NOTE:** If running from Discord, context will be auto-cleared after handoff completes.

**ARGUMENTS:** `$ARGUMENTS`
- Free-form text hints (e.g., "option 3", "use the Redis approach", "continue M5")
- Agent interprets based on conversation context
- If unclear, ASK before proceeding

---

## Phase 1: Analyze Conversation Context

**Before touching any files, understand what happened this session:**

1. **Parse arguments (if provided):**
   - If argument mentions "option X" → Find the LAST numbered question you asked
     - If found → Use that option's context
     - If NOT found → Ask: "I don't see a recent numbered question. What did you mean by 'option X'?"
   - If free-form text → Use as context hint for TODO updates
   - If empty → Proceed to analyze conversation

2. **Review conversation history:**
   - What was discussed this session?
   - What decisions were made?
   - What was implemented (or attempted)?
   - What options were presented? Which was chosen?
   - Any blockers or open questions?
   - Which milestone(s) were we working on?
   - **Which component(s) were we working on?** (Critical for lock status)

3. **Identify milestone and component context:**
   - From conversation, determine which milestone (M1, M2, etc.) this work belongs to
   - Identify which component(s) were being worked on
   - If unclear, ASK: "I see work on [X]. Which milestone does this belong to?", or "This doesn't have a task yet, let me use the SOP to create this task as M12"

---

## Phase 2: Validate Current Session Context

**Before overwriting, check if previous context is complete:**

1. **Read `{PROJECT_PATH}/TODO.md`:**
   - Look at "📍 Current Session Context" section
   - Identify what was "Working On" previously
   - Check which milestone the previous context was for

2. **Completion check for previous context:**
   - Find the todo(s) mentioned in previous "Working On"
   - Check if those todos are now ✅ complete
   - Check if tests passed for that work

   **Confidence assessment:**
   - ✅ **HIGH confidence (can replace):** Todo marked ✅ AND tests passed
   - ⚠️ **LOW confidence (must ask):**
     - Todo still 🔄 or ⬜
     - Files changed but todo not updated
     - No test results visible
     - Different milestone than current work

3. **If LOW confidence, ASK:**
   ```
   Previous context was working on: [X] (Milestone [N])

   I see [file changes / no completion markers / etc.].

   Is this previous work complete? Should I:
   1. Replace the context (previous work is done)
   2. Keep previous context, add current as "Also discussed"
   3. Merge both into the same context section
   ```

4. **Multi-milestone handling:**
   - If previous context = M5 and current work = M6:
     - Keep M5 context in a "Previous Milestone" subsection
     - Add M6 as main "Working On"
   - If same milestone: Replace or merge based on completion check

---

## Phase 3: Generate New Session Context

**Create the updated context based on conversation analysis:**

1. **Detect current project path:**
   - Run `git branch --show-current` to get branch name
   - If in Friday repo: Set `PROJECT_PATH=projects/{branch}/`
   - If separate repo: Set `PROJECT_PATH=./`

2. **Collect session history:**
   - Get `{PROJECT_PATH}/TODO.md`'s last modified timestamp (if exists)
   - Get all git commits since that timestamp: `git log --since="<timestamp>" --format="%h %s" --reverse`
   - Review commit messages for work not yet documented

3. **Build new Session Context (under component heading):**

   **If milestone is COMPLETED this session:**
   ```markdown
   ### [Component Name]
   **Last Session:** [YYYY-MM-DD HH:MM]

   M[X] complete. [One-line summary]. See `milestones/M[X].md` LOG for details.
   ```
   *(Max 2 lines - detailed context goes to milestone doc's LOG section)*

   **If milestone is IN PROGRESS:**
   ```markdown
   ### [Component Name]
   **Last Session:** [YYYY-MM-DD HH:MM]

   **Milestone:** M[X] - [Milestone Name]

   **What happened:**
   [1-2 sentences summarizing work done this session]

   **Decisions made:**
   - [Key decision from conversation]
   - [Another decision]

   **Next up:**
   [What the next session should focus on]

   **Important context:**
   [Any gotchas, blockers, or things next agent needs to know]
   ```

4. **If multi-component work or keeping previous context:**
   ```markdown
   ## Session Context

   ### [Component A]
   **Last Session:** [YYYY-MM-DD HH:MM]

   M[X] complete. [One-line summary]. See `milestones/M[X].md` LOG for details.

   ### [Component B]
   **Last Session:** [YYYY-MM-DD HH:MM]

   **Milestone:** M[Y] - [Milestone Name] (In Progress)
   [Brief context to preserve]
   ```

---

## Phase 4: Update TODO.md

1. **Update Components table:**
   - Mark component(s) worked on as `Free` (unlocking for next session)
   - If multi-component milestone was in progress, unlock ALL affected components

2. **Update Master Milestone List:**
   - If milestone completed → Status: `DONE`
   - If milestone still in progress → Status: `ACTIVE` (or keep as-is)
   - If milestone now unblocked → Status: `READY`
   - Check if completing this milestone unblocks others (update their status)

3. **Update Session Context section:**
   - Replace or merge based on Phase 2 decision
   - Use component heading format: `### [Component] - Last Session`
   - Use timestamp from `date '+%Y-%m-%d %H:%M'`
   - Write narrative summary (no checklists - those stay in Milestone Details)

4. **Update Milestone Details:**
   - Check off completed test criteria (this is the ONLY place for progress checkboxes)
   - Update status (READY → ACTIVE → DONE)
   - If all test criteria checked → Milestone is DONE

5. **Move completed milestones to "Completed Milestones":**
   - Move entire milestone section to bottom
   - Add completion date and commit hash
   - Remove from active Milestone Details section

6. **For in-progress milestones, ensure:**
   - Test criteria checkboxes reflect current progress
   - Session Context has narrative summary for next agent
   - Milestone doc updated if exists

---

## Phase 5: Update Milestone Doc (if exists)

1. **Check if milestone doc exists:** `milestones/M[X].md`

2. **If milestone COMPLETED this session, add detailed LOG section:**
   - Add `## LOG` section at the end of the milestone doc (if not already present)
   - Write the full detailed session context here:
   ```markdown
   ## LOG

   ### YYYY-MM-DD HH:MM - Milestone Completed

   **What happened:**
   [Detailed summary of work done - can be multiple paragraphs]

   **Implementation details:**
   - [Key implementation points]
   - [Technical decisions made]
   - [Files created/modified]

   **Bug fixes / Issues resolved:**
   - [Any bugs fixed during implementation]

   **Test results:**
   - [Test command and results]

   **Key learnings:**
   - [Any gotchas or insights for future reference]
   ```

3. **If milestone IN PROGRESS, update Progress Log:**
   ```markdown
   **YYYY-MM-DD** - In Progress - [Session summary]
   ```

4. **Check off completed steps** in the "How" section (if applicable)
5. **Update test checkboxes** if tests were run

---

## Phase 6: Git Commit and Push

1. **Run git status and git diff** to see changes
2. **Create descriptive commit message** (explain WHY, not just WHAT)
3. **Commit all changes** (code + TODO.md + milestone doc)
4. **Push to remote automatically**
5. **Save commit hash** for documentation

---

## Phase 7: Update Logs and Archive

1. **Add ONE final handoff log entry to `{PROJECT_PATH}/Logs.md`** (newest at top):
   ```markdown
   ## YYYY-MM-DD HH:MM - Session Handoff
   **Milestone:** M[X] - [Name]
   **Summary:** [1-2 sentence session summary]
   **Completed:** [List completed todos]
   **Key Decisions:** [Important decisions made]
   **Committed:** [commit hash(es)]
   **Next Focus:** [What's in progress or next up]
   ```

2. **Archive log file:**
   - Move to `{PROJECT_PATH}/Archive/Logs/YYYY-MM-DD-session.md`
   - Create fresh `{PROJECT_PATH}/Logs.md` with just header

---

## Phase 8: Handoff Summary

**Summarize for Boss:**
- What was completed this session (from session memory + git commits)
- Key decisions made
- All commit hash(es) since last handoff
- What's next for the next agent
- Any open questions or blockers

**End with exactly this marker:**
```
<!-- handoff_complete -->
```
(Discord bot will auto-clear context after seeing this)

---

## Quick Reference: When to Ask

- **Argument says "option X" but no recent numbered question** → Ask what they meant
- **Previous context milestone is still in progress** → Ask if complete
- **File changes but milestone not updated** → Ask if complete
- **Different milestone than previous context** → Keep both, don't ask
- **Unclear which milestone current work belongs to** → Ask
- **Unclear which component was worked on** → Ask
- **Argument is ambiguous** → Ask for clarification

**Component Rules:**
- Always unlock component(s) at end of session
- Multi-component milestones unlock ALL affected components
- If you notice component overlap with another session, alert Boss

**Default behavior when uncertain:** ASK. Never assume completion.
