# Agent Instructions - CareHub

This file contains workflow instructions for the AI assistant working on this project.

---

## Session Workflow

### 1. At Start of Session
**User loads:** `ARCHITECTURE.md` + `DESIGN_SYSTEM.md` + `CURRENT_TASK.md`

**User tells AI:** What to do (fills CURRENT_TASK.md with task description)

**AI does:**
- Read CURRENT_TASK.md to understand the task
- Fill in Implementation Plan with phases/steps
- Start working and tick boxes as progress is made

### 2. During Session
**AI updates:** CURRENT_TASK.md - tick boxes `[x]` as steps complete

**User can:** Add notes/issues in the Notes section

### 3. At End of Session
**AI does:**
1. ✅ Ensure all completed items are ticked
2. 📝 Write entry to `CHANGELOG.md` (add new session at top)
3. 🔄 Update `ARCHITECTURE.md` / `DESIGN_SYSTEM.md` if structure changed
4. 🧹 Clear `CURRENT_TASK.md` (reset to template)

---

## File Purposes

| File | Purpose | Who Updates |
|------|---------|-------------|
| `CURRENT_TASK.md` | Active task tracker with checkboxes | Both (AI ticks, User reviews) |
| `CHANGELOG.md` | Session history log | AI only |
| `ARCHITECTURE.md` | Project structure & decisions | AI when architecture changes |
| `DESIGN_SYSTEM.md` | Colors, components, patterns | AI when design system changes |
| `AGENTS.md` | This file - workflow instructions | User when workflow changes |

---

## Quick Commands

**User can say:**
- "Start new task: [description]" → AI fills CURRENT_TASK.md and starts
- "Tick phase 1" → AI updates checkboxes
- "Task complete" → AI logs to changelog and clears CURRENT_TASK.md

---

## Conflict Avoidance

- **AGENTS.md** = Workflow (how we work together)
- **ARCHITECTURE.md** = What the project is (structure, tech stack)
- **DESIGN_SYSTEM.md** = How it looks (colors, components)
- **CURRENT_TASK.md** = What we're doing right now
- **CHANGELOG.md** = What we did (historical)

These don't conflict because each has a distinct purpose.
