(user prompt kimi)
"
@alzheimerApp/docs/ARCHITECTURE.md @alzheimerApp/docs/CURRENT_TASK.md  @alzheimerApp/docs/DESIGN_SYSTEM.md @alzheimerApp/docs/AGENTS.md
do x y z

"

┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User gives     │────▶│  Write task to   │────▶│  Work through  │
│  task           │     │  CURRENT_TASK.md │     │  subtasks, tick │
└─────────────────┘     └──────────────────┘     │  off as done    │
                          │                        └────────┬────────┘
                          │                                 │
                          │    ┌────────────────────┐      │
                          └───▶│  If interrupted:   │◀─────┘
                               │  Read CURRENT_TASK │
                               │  Resume from last  │
                               │  unchecked item    │
                               └────────────────────┘
                                         │
                                         ▼
                               ┌────────────────────┐
                               │  When complete:    │
                               │  1. Update CHANGELOG│
                               │  2. Update ARCH/DES│
                               │  3. Clear CURRENT  │
                               └────────────────────┘



Done! I created **`AGENTS.md`** at the project root with your workflow.

## How It Works Now:

**You (at start of new session):**
```
@alzheimerApp/docs/ARCHITECTURE.md 
@alzheimerApp/docs/DESIGN_SYSTEM.md 
@alzheimerApp/docs/CURRENT_TASK.md
"Add a notification bell to the navbar that shows unread count"
```

**I (AI) will:**
1. Read the 3 files you loaded
2. Fill CURRENT_TASK.md with implementation plan
3. Start working and tick boxes `[x]` as I progress
4. When done → log to CHANGELOG.md → clear CURRENT_TASK.md

**No conflicts** because each file has a distinct purpose:
- **AGENTS.md** → How we work together (this workflow)
- **ARCHITECTURE.md** → Project structure
- **DESIGN_SYSTEM.md** → Visual system
- **CURRENT_TASK.md** → Active task (ephemeral)
- **CHANGELOG.md** → History