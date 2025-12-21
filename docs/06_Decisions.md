# Chrononaut Architecture Decision Records (ADRs)

A log of significant technical and architectural decisions made during development.

---

## Decision Log

| ID | Date | Decision | Status |
|----|------|----------|--------|
| SCHEMA-001 | 2025-12-01 | 14-table schema with RLS policies (instead of original 12 - added two assessments to schema) | ✅ Implemented |
| SCHEMA-002 | 2025-12-01 | Location fields on notes table for map view | ✅ Implemented |
| INFRA-001 | 2025-12-01 | Disable cacheComponents for auth compatibility | ✅ Implemented |
| DESIGN-001 | 2025-12-01 | Warm color palette (forest green, mustard, cream) | ✅ Implemented |

---

## December 1, 2025

### SCHEMA-001: Database Schema Design

**Context:** Need a complete schema to support all Chrononaut features per PRD v3.

**Decision:** Created 14 tables with comprehensive RLS policies:
- Core: `profiles`, `notes`, `time_blocks`, `tasks`, `journal_entries`
- Health: `health_metrics`
- Meetings: `meeting_notes`
- AI: `ai_insights`, `cue_rules`, `cue_instances`
- System: `integration_tokens`, `audit_log`, `user_settings`, `notification_preferences`

**Rationale:**
- RLS policies ensure users only access their own data
- Audit log for security/debugging
- Separate tables for different data types (not one massive table)
- Indexes on commonly queried fields

**Consequences:**
- ✅ Clean separation of concerns
- ✅ Security by default via RLS
- ⚠️ 14 tables may need consolidation later if too complex

---

### SCHEMA-002: Location Fields on Notes Table

**Context:** Quick capture workflow needs geolocation and photo upload for unified map view across journal entries and quick captures.

**Decision:** Added to `notes` table:
```sql
location_name text        -- freeform, e.g., "Salt Lake City, UT"
location_lat numeric(10,7) -- 7 decimal places = ~1cm precision
location_lng numeric(10,7)
photo_url text
```

**Rationale:**
- Enables unified map view across `journal_entries` and `notes`
- Freeform `location_name` + lat/lng is more flexible than structured city/state/country
- Can parse via reverse geocoding API when saving if structured data needed later

**Consequences:**
- ✅ Map view can query both tables
- ✅ Flexible for international locations
- ⚠️ May need geocoding API integration later

---

### INFRA-001: Disable cacheComponents

**Context:** Next.js 16 Vercel template includes `cacheComponents: true` which is an experimental feature.

**Decision:** Disabled `cacheComponents` in `next.config.ts`.

**Rationale:**
- `cacheComponents` conflicts with dynamic auth routes
- Causes build errors: "Uncached data accessed outside Suspense"
- Can't use `export const dynamic = "force-dynamic"` with cacheComponents
- Auth routes inherently need dynamic rendering (checking session)

**Consequences:**
- ✅ Build passes
- ✅ Auth routes work correctly
- ⚠️ May miss some caching benefits (minor for MVP)
- 📝 Can re-enable later when Next.js 16 patterns are more established

---

### DESIGN-001: Warm Color Palette for Neurodivergent UX

**Context:** Need a calming, low-cognitive-load design that feels warm and inviting, not corporate.

**Decision:** Adopted warm palette:
- **Forest Green:** #2D5A47 (primary actions, active states)
- **Mustard Gold:** #D4A84B (accents, highlights)
- **Cream:** #FDFBF7, #F5F0E6, #E8DCC4 (backgrounds, cards)
- **Muted Green:** #5C7A6B, #8B9A8F (secondary text)

**Font:** Lora (serif) for headings, Geist Sans for body.

**Rationale:**
- Avoids harsh colors (purples, reds, bright blues) that can be overstimulating
- Warm cream backgrounds reduce eye strain
- Serif headings feel elegant and calm
- Nautical theme (Chrononaut = time traveler) reflected in compass logo

**Design Inspirations:**
- Notion (clean hierarchy)
- Insight Timer (calming palette)
- Tend Dental (friendly, not corporate)

**Consequences:**
- ✅ Visually calming for ADHD/autistic users
- ✅ Clear visual hierarchy
- ✅ Distinctive brand identity
- ⚠️ Need to ensure sufficient contrast for accessibility (will test)

---

*End of December 1, 2025 decisions*

---

## December 5, 2025

### INT-001: TickTick Direct Auth Instead of OAuth

**Context:** TickTick OAuth token exchange failed after 2 days of debugging (7 different implementation patterns). Working open-source projects (ticktick-mcp, TickTickSync) use different approaches.

**Decision:** Use Direct Auth (username/password login) via `/api/v2/user/signon` endpoint instead of OAuth.

**Rationale:**
- OAuth token exchange returns 401 for unknown reasons despite matching working implementations
- TickTickSync (15k+ users) uses Direct Auth successfully for years
- Direct Auth is simpler: one endpoint, immediate token
- Timeline pressure: 2 days already spent on OAuth

**Trade-offs:**

| OAuth (not working) | Direct Auth (implemented) |
|---------------------|---------------------------|
| User enters password on TickTick site | User enters password in our app |
| Limited scope access | Full account access |
| User can revoke in TickTick settings | User must change password to revoke |
| Industry standard | Session-based, less standard |
| Works with 2FA/SSO | Requires password (SSO users must set one) |

**Security Mitigations:**
- Password only used for initial login, not stored
- Session token stored in Supabase with RLS
- Client library only implements safe operations (read, complete, update date)
- Destructive operations (delete, edit title) intentionally not implemented

**Consequences:**
- ✅ Integration working within 2 hours of pivot
- ✅ Bidirectional sync functional
- ⚠️ Users with Google SSO must set a TickTick password first
- ⚠️ Less secure than OAuth for multi-user production app
- 📝 Acceptable for single-user MVP; revisit for public launch

---

### INT-002: TickTick Client Safety Constraints

**Context:** Direct Auth gives full account access. Need to prevent accidental data loss.

**Decision:** TickTick client library explicitly limits write operations:

**Allowed:**
- `completeTask()` - Safe, reversible
- `updateTaskDueDate()` - Safe, reversible

**Blocked (not implemented):**
- `createTask()` - Nice-to-have, may add later with explicit flag
- `deleteTask()` - Dangerous, not implemented
- `updateTaskTitle()` - Could cause data loss
- `updateTaskContent()` - Could cause data loss
- `createProject()`, `deleteProject()` - Structural changes
- `moveTask()` - Could lose task context

**Rationale:**
- ADHD users may click impulsively
- "Complete" and "reschedule" are the core workflows
- Creating tasks can be done in TickTick directly
- Deletion should never happen from a secondary app

**Consequences:**
- ✅ Safe by default
- ✅ Covers 90% of use cases
- ⚠️ "Create task" requested by user - will consider with confirmation dialog

---

### UI-001: Today/Week Toggle for Task View

**Context:** PRD specifies "TODAY | THIS WEEK" toggle for Smart Task View.

**Decision:** Implemented client-side toggle with two distinct views:

**Today View:**
- Simple list of tasks due today + overdue
- Sorted by priority (high → low)
- Full date picker on each task

**Week View:**
- Tasks grouped by day in timeline format
- Visual indicators: dots, connecting lines
- Day headers with smart labels ("Today", "Tomorrow", "Overdue", date)
- Overdue section highlighted in red

**Rationale:**
- Today view = immediate focus, what needs attention NOW
- Week view = planning perspective, see what's coming
- Timeline format is ADHD-friendly: visual, scannable, shows time progression
- Grouping reduces cognitive load vs flat list

**Consequences:**
- ✅ Matches PRD specification
- ✅ ADHD-optimized visual design
- ✅ Both views use same data (fetched once)
- 📝 May add "overdue" as separate section at top of both views later

---

### DEPS-001: Downgrade react-day-picker for Tailwind v3

**Context:** shadcn calendar component (react-day-picker v9) uses Tailwind v4 CSS syntax (`--spacing(8)`) which breaks with Tailwind v3.

**Decision:** Downgraded to react-day-picker v8 + date-fns v3.

```bash
npm install react-day-picker@^8.10.1 date-fns@^3.6.0 --legacy-peer-deps
```

**Alternatives Considered:**
1. Upgrade to Tailwind v4 - Too risky mid-project, breaking changes
2. Use native `<input type="date">` - Uglier, inconsistent across browsers
3. Downgrade react-day-picker - Chosen, known stable

**Consequences:**
- ✅ Calendar picker works
- ✅ Matches design aesthetic
- ⚠️ Using `--legacy-peer-deps` flag (date-fns version mismatch)
- 📝 Can upgrade to Tailwind v4 + react-day-picker v9 post-MVP

---

*End of December 5, 2025 decisions*

---

## December 12, 2025

### INT-003: Google Calendar Read-Only Integration

**Context:** Need calendar awareness for meeting prep and time management without modifying user's calendar.

**Decision:** Implement read-only Google Calendar sync with local-first storage.

**Implementation:**
- OAuth 2.0 with `calendar.readonly` scope only
- 30-day event window (past and future)
- Local storage in `calendar_events` table
- 60-second polling + page focus sync

**Rationale:**
- Read-only is safer—no risk of accidentally modifying calendar
- Local storage enables fast dashboard rendering
- Pattern matches TickTick sync architecture

**Consequences:**
- ✅ Fast calendar display on dashboard
- ✅ Meeting prep feature can link notes to events
- ⚠️ Can't create/modify events (would need separate scope)
- 📝 "Start Meeting Notes" button ready for notes screen

---

### INT-004: Whoop Data Model Design

**Context:** Need to pull health data from Whoop for energy/wellness tracking.

**Decision:** Two-table design: `health_metrics` (daily summary) + `workouts` (individual activities).

**Rationale:**
- Daily metrics (recovery, sleep, strain) are one-per-day
- Workouts are many-per-day with detailed HR zone data
- Meditation tracked as workout with `is_meditation` flag
- Enables queries like "cardio minutes this week" and "meditation streak"

**health_metrics columns:**
```
date, recovery_score, sleep_hours, sleep_consistency,
strain_score, hrv_rmssd, resting_heart_rate, whoop_cycle_id
```

**workouts columns:**
```
whoop_id, activity_type, sport_id, started_at, ended_at,
total_minutes, strain_score, avg/max_heart_rate, calories,
zone_1-5_minutes, is_meditation, date
```

**Consequences:**
- ✅ Granular workout data for pattern analysis
- ✅ Meditation tracked separately from exercise
- ✅ HR zones enable training load analysis
- 📝 Sport ID 82 = meditation in Whoop's taxonomy

---

### INT-005: Skip Whoop Webhooks for MVP

**Context:** Whoop offers webhooks for real-time data updates.

**Decision:** Use daily polling instead of webhooks.

**Rationale:**
- Whoop data updates once per day (when you wake up)
- Webhooks add complexity (public endpoint, signature verification, retries)
- Not making real-time decisions based on Whoop data
- Daily sync sufficient for pattern analysis

**Consequences:**
- ✅ Simpler implementation
- ✅ Easier to debug
- ⚠️ Data may be up to 24 hours stale
- 📝 Can add webhooks later if fresher data needed

---

### SCHEMA-003: Idempotent Migrations Pattern

**Context:** Migration version conflicts caused errors when files were renamed.

**Decision:** All migrations must be idempotent (safe to re-run).

**Pattern:**
```sql
-- Tables
CREATE TABLE IF NOT EXISTS ...

-- Columns
ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...

-- Indexes
CREATE INDEX IF NOT EXISTS ...

-- Policies (must drop first)
DROP POLICY IF EXISTS "policy_name" ON table;
CREATE POLICY "policy_name" ON table ...;

-- Triggers (must drop first)
DROP TRIGGER IF EXISTS trigger_name ON table;
CREATE TRIGGER trigger_name ...;
```

**Rationale:**
- Supabase tracks migrations by version number (filename prefix)
- Renaming files or re-running migrations shouldn't fail
- Production safety: can't accidentally break existing tables

**Consequences:**
- ✅ Migrations can be safely re-run
- ✅ No more "already exists" errors
- ✅ Cleaner CI/CD pipeline
- ⚠️ Slightly more verbose SQL

---

### UI-002: Dashboard Metrics Panel Redesign

**Context:** Original PRD specified abstract "Energy" metric (60% Whoop + 40% journal). User found this less actionable than concrete habit tracking.

**Decision:** Replace Energy metric with goal-based Habits tracking + Well-being/Growth toggle.

**New structure:**

```
┌─────────────────────────────────────────────────────┐
│  [Well-being]  [Growth]     ← Segmented control     │
├─────────────────────────────────────────────────────┤
│  HABITS (This Week)                                 │
│  • Sleep Streak - goal: 8hrs + ≥84% consistency     │
│  • Exercise - goal: 2.5hrs Z1-3, 15min Z4-5         │
│  • Meditation - goal: 1x daily                      │
│                                                     │
│  MOOD                                               │
│  • 7 faces for Sun-Sat (gray if no journal)         │
│                                                     │
│  COMPASS                                            │
│  • AI daily insight + "I commit to..." button      │
├─────────────────────────────────────────────────────┤
│  GROWTH (when toggled)                              │
│  • Self-Compassion, Values, Executive, Strengths    │
└─────────────────────────────────────────────────────┘
```

**Rationale:**
- Concrete goals ("8 hours sleep") more actionable than abstract scores
- Streaks provide gamification/accountability
- Gray faces for missing journals create social pressure to complete
- Goals displayed prominently on cards for reinforcement
- Well-being vs Growth separates daily habits from periodic assessments

**Data sources:**
| Card | Source | Status |
|------|--------|--------|
| Sleep | `health_metrics` | ✅ Ready |
| Exercise | `workouts` (zones) | ✅ Ready |
| Meditation | `workouts` (is_meditation) | ✅ Ready |
| Mood | `journal_entries.mood_label` | ⏳ Needs journal screen |
| Compass | `ai_insights` | ⏳ Needs AI integration |
| Assessments | `notes` (assessment type) | ⏳ Needs notes screen |

**Consequences:**
- ✅ More actionable dashboard
- ✅ Clear accountability with visible goals
- ✅ Gamification through streaks
- ⚠️ Requires journal/notes screens for full functionality
- 📝 Placeholder UI until dependent features built

---

### SCHEMA-004: daily_commitments Table

**Context:** "I commit to..." button in Compass section needs to store user commitment for accountability tracking.

**Decision:** Create `daily_commitments` table to track when user acknowledges daily AI insight.

**Schema:**
```sql
daily_commitments (
  id uuid primary key,
  user_id uuid references profiles,
  commitment_date date not null,
  committed_at timestamp,
  insight_id uuid references ai_insights,
  unique(user_id, commitment_date)
)
```

**Rationale:**
- Enables future features: commitment streaks, accountability reports
- Links to specific AI insight for context
- One commitment per day per user

**Consequences:**
- ✅ Foundation for accountability tracking
- ✅ Can analyze commitment patterns vs outcomes
- 📝 V2 feature: commitment streak display

---

*End of December 12, 2025 decisions*

---

## December 13, 2025

### AI-001: Claude-Only Agent Architecture

**Context:** PRD specified using Claude for coaching/analysis and Gemini for speed/voice tasks.

**Decision:** Use Claude Sonnet 4 for all 4 agents ("one brain" approach).

**Rationale:**
- Simpler to maintain one provider
- Consistent personality across agents
- Sonnet 4 is fast enough for real-time chat
- Voice mode (Gemini's strength) deferred to later phase
- Cost difference negligible for personal use

**Agents:**
| Agent | Purpose | Direct Chat? |
|-------|---------|-------------|
| Executive Coach | Productivity, meeting prep, work challenges | ✅ Yes |
| Therapist | Journal reflection, DBT/ACT, emotional processing | ✅ Yes |
| Pattern Analyst | Background analysis, mood classification, metrics | ❌ No (system only) |
| Research Assistant | Quick research, summarization, fact-finding | ✅ Yes |

**Consequences:**
- ✅ Simpler codebase (one SDK, one API key)
- ✅ Consistent user experience
- ⚠️ May revisit for voice mode (Gemini 2.0 Flash)
- 📝 Pattern Analyst runs in background, not exposed to users

---

### AI-003: Manual Streaming vs useChat Hook

**Context:** Vercel AI SDK v5 provides `useChat` hook for chat UI, but it had breaking changes.

**Decision:** Implement manual fetch + streaming instead of useChat hook.

**Issues with useChat in v5:**
- `handleInputChange` not a function
- `setInput` not a function  
- `append` not a function
- Different API from v4 documentation

**Manual implementation:**
```typescript
// State
const [messages, setMessages] = useState([]);
const [inputValue, setInputValue] = useState("");

// Send
const response = await fetch("/api/chat", { ... });
const reader = response.body?.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunk = decoder.decode(value);
  // Accumulate and update UI
}
```

**Trade-offs:**

| useChat Hook | Manual Implementation |
|--------------|----------------------|
| Less code | More code (~50 lines) |
| Black-box behavior | Full control |
| SDK version dependent | Stable across versions |
| Hard to debug | Easy to debug |

**Consequences:**
- ✅ Full control over streaming behavior
- ✅ Easier debugging when things break
- ✅ Not dependent on SDK internal changes
- ⚠️ More boilerplate code
- 📝 Can migrate back to useChat when SDK stabilizes

---

### AI-004: Context-Aware Default Agents

**Context:** Different screens benefit from different AI personalities.

**Decision:** Map screens to default agents, switchable by user.

**Mapping:**
```typescript
CONTEXT_DEFAULT_AGENTS = {
  dashboard: "executive-coach",
  notes: "executive-coach",
  focus: "executive-coach",
  meeting: "executive-coach",
  journal: "therapist",        // ← Different!
  research: "research-assistant",
};
```

**Rationale:**
- Journal → Therapist: Emotional processing needs different tone
- Work screens → Executive Coach: Action-oriented, direct
- Research → Research Assistant: Factual, concise

**User override:** Agent selector always visible; user can switch anytime.

**Consequences:**
- ✅ Appropriate default behavior per context
- ✅ User retains full control
- ✅ Reduces cognitive load (right agent auto-selected)

---

### AI-005: Chat Persistence Strategy

**Context:** Users expect to continue conversations across sessions.

**Decision:** Three-layer persistence:

1. **In-memory cache** (per agent, current session)
   - Survives agent switching within same browser session
   - Lost on page refresh

2. **Database storage** (permanent)
   - `ai_conversations` table for conversation metadata
   - `ai_messages` table for message history
   - Persists across sessions

3. **History modal** (user-accessible)
   - Filtered by current agent
   - Chronologically sorted
   - Rename/delete capability

**Agent switching behavior:**
- Saves current chat to cache for that agent
- Restores cached chat when switching back
- New conversation = explicit user action

**Consequences:**
- ✅ Smooth agent switching without losing context
- ✅ Conversation history survives browser refresh
- ✅ Users can rename conversations for findability
- 📝 Cache clears on page refresh (by design)

---

### UI-003: Remove Assessment Note Type

**Context:** PRD specified assessment notes (Self-Compassion, Values Alignment) as a note type.

**Decision:** Remove assessment note type; assessments completed externally and imported.

**Rationale:**
- Assessments are structured questionnaires with scoring—awkward as "notes"
- Better UX: complete on official sites (self-compassion.org, etc.)
- Import results to "About Me" folder for AI context
- Reduces complexity in notes screen

**Alternative approach:**
- Create "About Me" folder structure
- Store assessment results as documents
- AI agents read from "About Me" for personalization

**Consequences:**
- ✅ Simpler notes screen (3 types: Meeting, Document, Quick Capture)
- ✅ Validated assessments from official sources
- ⚠️ Requires manual import step for users
- 📝 "About Me" section to be built next

---

### UI-004: Chat Drawer UX Patterns

**Context:** Need intuitive chat interface that doesn't disrupt main workflow.

**Decisions:**

1. **Slide-over drawer** (not modal)
   - Main content remains visible
   - User maintains context
   - 420px width (comfortable reading)

2. **Agent switching clears chat**
   - Prevents confusion about who you're talking to
   - Each agent = fresh context
   - Previous chat cached (can switch back)

3. **History in modal** (not inline)
   - Cleaner primary interface
   - History is secondary action
   - Modal provides focused browsing experience

4. **Keyboard-first** (⌘/)
   - Quick toggle from anywhere
   - Shift+Enter for multiline
   - Enter to send (expected pattern)

**Consequences:**
- ✅ Non-disruptive to main workflow
- ✅ Clear mental model (one agent, one conversation)
- ✅ Power user friendly
- ✅ Touch-friendly (buttons visible)

---

*End of December 13, 2025 decisions*

---

## December 17-19, 2025

### ABOUT-001: About Me Files Architecture

**Context:** Need a way for users to upload context files (assessments, feedback, inspiration) that AI agents can reference during conversations.

**Decision:** Create `about_me_files` table with per-agent targeting and category classification.

**Schema:**
```sql
about_me_files (
  id uuid primary key,
  user_id uuid references profiles,
  filename text not null,
  file_type text, -- pdf, docx, md, txt
  content text, -- extracted text content
  category text, -- assessment, feedback, inspiration, context
  target_agents text[], -- which agents can access
  created_at timestamptz,
  updated_at timestamptz
)
```

**Rationale:**
- Storing extracted text (not raw binary) enables AI to read content directly
- Category field allows filtering (e.g., only assessments for Growth metrics)
- `target_agents[]` array enables per-file agent targeting
- Auto-detection of assessment types reduces user friction

**Auto-categorization logic:**
```typescript
if (filename includes "self-compassion") → category: "assessment"
if (filename includes "values") → category: "assessment"
if (filename includes "clifton" or "strengths") → category: "assessment"
if (filename includes "360" or "feedback") → category: "feedback"
else → category: "context"
```

**Consequences:**
- ✅ AI agents have rich personal context
- ✅ Users control which agents see which files
- ✅ Assessment data can populate Growth metrics
- ⚠️ Large files may hit text extraction limits
- 📝 V2: Add file size limits and chunking for large documents

---

### AI-006: Agent Instructions (Custom Prompts)

**Context:** Users need ability to customize agent behavior without modifying code.

**Decision:** Create `agent_instructions` table for per-agent custom system prompts.

**Schema:**
```sql
agent_instructions (
  id uuid primary key,
  user_id uuid references profiles,
  agent_type text not null,
  instructions text not null,
  is_active boolean default true,
  created_at timestamptz,
  updated_at timestamptz,
  unique(user_id, agent_type)
)
```

**UI location:** Chat drawer → 3-dot menu → "Agent Instructions"

**Prompt injection:**
```typescript
const systemPrompt = `
${agent.systemPrompt}

<user_instructions>
${userInstructions}
</user_instructions>
`;
```

**Rationale:**
- Mirrors Claude.ai "Project Instructions" pattern (familiar to user)
- Per-agent customization (different instructions for Coach vs Research)
- `is_active` flag allows disabling without deleting
- Unique constraint prevents duplicate instructions per agent

**Consequences:**
- ✅ Personalized agent behavior
- ✅ Instructions persist across sessions
- ✅ Visual indicator when active
- ⚠️ Bad instructions could degrade responses
- 📝 Could add instruction templates in V2

---

### AI-007: Screen-Aware Agent Context

**Context:** Different screens benefit from different default agents, and chat should minimize when switching screens.

**Decision:** Implement automatic agent switching based on current route, with auto-minimize on navigation.

**Implementation:**
```typescript
// ChatProvider detects route changes
useEffect(() => {
  if (prevPathnameRef.current !== pathname && isOpen) {
    setIsMinimized(true);
    setIsOpen(false);
  }
  prevPathnameRef.current = pathname;
}, [pathname, isOpen]);

// Default agent per screen
const mapping = {
  dashboard: "research-assistant",
  notes: "executive-coach",
  focus: "executive-coach",
  meeting: "executive-coach",
  journal: "executive-coach", // Therapist embedded in journal
};
```

**Rationale:**
- Dashboard → Research: Quick lookups, fact-finding
- Notes/Focus/Meeting → Coach: Work tasks, execution
- Journal → Coach (not Therapist): Therapist will be embedded directly in Journal screen
- Auto-minimize prevents chat covering new screen content
- Restoring chat brings up appropriate agent for current context

**Consequences:**
- ✅ Reduced cognitive load (right agent auto-selected)
- ✅ Cleaner UX on screen transitions
- ✅ User can still manually switch agents
- 📝 Therapist removed from chat drawer (Journal-only)

---

### FOCUS-001: Focus Screen Architecture

**Context:** Need a dedicated focus mode with task management, timer, notes, and calendar integration.

**Decision:** Two-panel layout with collapsible sidebar, state managed via React Context.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Focus                                          [Collapse]  │
├──────────────┬──────────────────────────────────────────────┤
│ TASK LIST    │                                              │
│ Today/Week   │           FOCUS TIMER                        │
│ [Task 1]     │           00:45:30                           │
│ [Task 2]     │           "Current Task Title"               │
│ [Task 3]     │           [Pause] [Complete]                 │
├──────────────┤──────────────────────────────────────────────┤
│ CALENDAR     │                                              │
│ Today's      │           NOTE EDITOR                        │
│ Events       │           [Select note ▼]                    │
│              │           Rich text content...               │
├──────────────┤                                              │
│ ANALYTICS    │                                              │
│ Focus stats  │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

**State management:**
```typescript
FocusSessionContext provides:
- selectedTask: FocusTask | null
- selectedNote: Note | null
- isTimerRunning: boolean
- timerSeconds: number
- focusingStartedAt: Date | null
```

**Rationale:**
- Collapsible sidebar for distraction-free writing
- Task list mirrors Dashboard for consistency
- Timer tied to specific task (not generic pomodoro)
- Note editor allows capturing thoughts while working
- Calendar prevents time blindness

**Consequences:**
- ✅ Single-screen focus experience
- ✅ Timer tracks actual task time
- ✅ Notes captured in context
- ⚠️ Complex state management (many interacting components)
- 📝 Session data not yet persisted to DB

---

### FOCUS-002: AI Task Analysis API

**Context:** Need AI-powered time estimates and prioritization for tasks.

**Decision:** Create `/api/ai/analyze-tasks` endpoint that returns structured analysis per task.

**Request:**
```typescript
POST /api/ai/analyze-tasks
{
  tasks: Array<{
    id: string,
    title: string,
    content: string | null,
    priority: number,
    dueDate: string | null
  }>
}
```

**Response:**
```typescript
{
  analyses: Array<{
    taskId: string,
    timeEstimate: {
      userEstimate: number | null,
      adjustedEstimate: number,
      aiEstimate: number,
      displayMinutes: number,
      confidence: "none" | "low" | "medium" | "high",
      source: "user_adjusted" | "user_raw" | "ai_guess",
      explanation: string,
      factors: string[]
    },
    prioritization: {
      suggestedOrder: number,
      suggestedTimeOfDay: "morning" | "afternoon" | "evening" | "anytime",
      explanation: string,
      factors: string[]
    },
    dataState: "no_data" | "emerging" | "established"
  }>
}
```

**Rationale:**
- Batch analysis (all tasks at once) is more efficient than per-task calls
- `confidence` level helps user know when to trust estimates
- `source` shows where estimate came from (user vs AI)
- `factors` array explains reasoning ("Based on similar tasks...")
- `suggestedTimeOfDay` helps with energy management

**Consequences:**
- ✅ Users get actionable time estimates
- ✅ Suggested order reduces decision fatigue
- ✅ Explanations build trust in AI recommendations
- ⚠️ Analysis takes 2-3 seconds (loading state needed)
- 📝 V2: Use historical completion data for better estimates

---

### FOCUS-003: Task List UI Parity

**Context:** Focus Screen task list was initially different from Dashboard, causing confusion.

**Decision:** Focus task list must exactly mirror Dashboard task list behavior.

**Shared behavior:**
- Today/Week/All view toggle
- Same priority colors (red/orange/blue/gray)
- Same date formatting ("Today", "Tomorrow", "Overdue")
- Same date picker popover
- Same completion behavior
- Same sorting options

**Focus-specific additions:**
- "Start Timer" button on selected task
- AI analysis badges (time estimate, suggested order)
- TickTick list/section badge

**Rationale:**
- Consistency reduces cognitive load
- User learns one pattern, applies everywhere
- Different behavior in similar UIs is confusing for ADHD brain

**Consequences:**
- ✅ Predictable task interaction
- ✅ Easy to switch between Dashboard and Focus
- ⚠️ More code to maintain (near-duplicate components)
- 📝 Consider extracting shared TaskList component in V2

---

### SYNC-001: TickTick List/Section Names

**Context:** Tasks in TickTick belong to Projects (lists) and Sections, but this context wasn't displayed.

**Decision:** Add `ticktick_list_name` and `ticktick_section_name` columns to tasks table, populated during sync.

**Migration:**
```sql
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS ticktick_list_name text,
ADD COLUMN IF NOT EXISTS ticktick_section_name text;
```

**Sync logic:**
```typescript
// During pullTasksFromTickTick:
// 1. Build projectNameMap from projectProfiles
// 2. Fetch sections for each project
// 3. Build sectionNameMap
// 4. When upserting task, include list_name and section_name
```

**UI display:**
```tsx
{task.ticktick_list_name && (
  <span className="badge bg-purple-50 text-purple-700">
    📁 {task.ticktick_list_name}
    {task.ticktick_section_name && ` / ${task.ticktick_section_name}`}
  </span>
)}
```

**Rationale:**
- Provides context for where task lives in TickTick
- Helps user understand task grouping without switching apps
- Section name shows sub-categorization (e.g., "Projects / Build Second Brain")

**Consequences:**
- ✅ Better task context in Chrononaut
- ✅ Easier to identify which project a task belongs to
- ⚠️ Requires re-sync after migration to populate existing tasks
- 📝 Names update automatically on subsequent syncs

---

*End of December 17-19, 2025 decisions*

---

## December 20-21, 2025

### JOURNAL-001: Client-Side E2EE for Journal Entries

**Context:** Journal entries contain sensitive personal reflections. Users need assurance their private thoughts cannot be read—even by the app developer or if the database is compromised.

**Decision:** Implement client-side end-to-end encryption using Web Crypto API.

**Implementation:**
- Algorithm: AES-256-GCM (authenticated encryption)
- Key derivation: PBKDF2 with 100,000 iterations
- IV: 96-bit random per encryption operation
- Key storage: Encrypted key + salt in localStorage
- Passphrase verification: SHA-256 hash stored for quick validation

**What's encrypted:**
```sql
encrypted_happened text,   -- Journal content
encrypted_feelings text,   -- Feelings content
encrypted_grateful text,   -- Gratitude content
```

**What's NOT encrypted:**
```sql
entry_date,        -- Needed for date navigation
location_name,     -- Needed for map view
location_lat/lng,  -- Needed for map view
mood_label,        -- Needed for mood analytics
energy_rating,     -- Needed for energy charts
tags,              -- Needed for filtering/search
```

**Rationale:**
- Web Crypto API is native (no dependencies, fast)
- AES-GCM provides authentication (detects tampering)
- PBKDF2 with high iterations resists brute force
- Client-side means server/DB never sees plaintext
- Metadata (mood, location, tags) remains queryable

**Trade-offs:**

| Encrypted | Unencrypted Metadata |
|-----------|---------------------|
| Full privacy of content | Analytics/visualizations possible |
| No server-side search | Mood trends, location maps work |
| Password recovery impossible | Faster UI (no decrypt for filtering) |
| Slightly more complex UX | Better user experience for browsing |

**Security considerations:**
- Key stored in localStorage (vulnerable if XSS exists)
- No password recovery (if user forgets, entries unrecoverable)
- Passphrase hash enables offline verification (but also offline attacks)

**Consequences:**
- ✅ Strong privacy for journal content
- ✅ No external dependencies
- ✅ Analytics still functional on metadata
- ⚠️ No password recovery mechanism
- ⚠️ Key in localStorage is XSS-vulnerable
- 📝 V2: Consider WebAuthn or passkey integration

---

### JOURNAL-002: Three-Section Journal Structure

**Context:** Blank journal pages are overwhelming for ADHD users. Need structure without rigidity.

**Decision:** Fixed three-section layout with clear prompts:
1. **What happened today?** - Events, activities, occurrences
2. **How are you feeling?** - Emotional state, reflections
3. **What are you grateful for?** - Gratitude practice

**Rationale:**
- Structure reduces "blank page paralysis"
- Each section has distinct cognitive purpose
- Gratitude section supports wellbeing research
- Sections map to different AI agent interests:
  - Happened → Executive Coach (context for work)
  - Feelings → Therapist (emotional processing)
  - Grateful → Pattern Analyst (trend analysis)

**Alternatives considered:**
1. Single freeform field - Too overwhelming
2. Daily prompts (varying questions) - Inconsistent, harder to compare
3. Five-minute journal format - Too rigid, feels like homework
4. Bullet points only - Loses narrative richness

**Consequences:**
- ✅ Reduces cognitive load for entry creation
- ✅ Consistent structure aids AI analysis
- ✅ Supports gratitude practice research
- ⚠️ May feel constraining for some users
- 📝 Consider optional "free notes" section in V2

---

### JOURNAL-003: Photo EXIF Geolocation Extraction

**Context:** Photos often contain embedded GPS coordinates. Users want location context without manual entry.

**Decision:** Build native EXIF parser to extract GPS and auto-populate location.

**Implementation:**
```typescript
parseExifFromFile(file: File) → {
  latitude: number | null,
  longitude: number | null,
  dateTaken: Date | null,
  locationName?: string  // via reverse geocoding
}
```

**Rationale:**
- Many smartphone photos have GPS EXIF tags
- Manual location entry is friction
- Native parsing (no external libs) keeps bundle small
- Reverse geocoding provides human-readable names

**Reverse geocoding:**
- Uses Nominatim API (OpenStreetMap)
- Free for low-volume use
- Returns: city, state, country

**Why native parser vs exifr/exif-js:**
- Zero dependencies
- Smaller bundle size
- Only need GPS + date (not full EXIF spec)
- Educational: understand the format

**Consequences:**
- ✅ Automatic location from photos
- ✅ No external dependencies
- ✅ Reduces manual entry friction
- ⚠️ Many photos don't have GPS (camera setting, edited)
- ⚠️ Nominatim has rate limits (1 req/sec)
- 📝 Cache geocoding results in V2

---

### FOCUS-004: Focus Cue System Architecture

**Context:** ADHD users struggle with time awareness, task switching, and sustained attention. Need gentle nudges without being annoying.

**Decision:** Build 8-type cue system with variable intervals and context-awareness.

**Cue types:**

| Type | When Fired | Purpose |
|------|-----------|---------|
| `session_milestone` | 15/30/45/60 min | Celebrate progress |
| `break_reminder` | 45+ min sustained | Prevent burnout |
| `tab_return` | Browser tab return | Welcome back |
| `task_progress` | Every 15 min on task | Momentum check |
| `energy_check` | 11am, 2pm, 4pm | Time-of-day awareness |
| `encouragement` | Random | Dopamine boost |
| `getting_started` | <5 min task progress | Overcome initiation |
| `completion_nudge` | >80% estimated time | Push toward finish |

**Architecture:**
```
Session Metrics → Cue Engine → Candidate Cues → Cooldown Filter → Display Cue
                                    ↑
                              Template Library
```

**Key components:**
- `cue-types.ts` - Type definitions and cooldowns
- `cue-templates.ts` - Message templates per cue type
- `cue-engine.ts` - Evaluation logic and prioritization
- `focus-cue-popup.tsx` - UI component

**Rationale:**
- 8 cue types cover major ADHD attention patterns
- Separation of types, templates, and engine enables easy tuning
- Context-awareness (tab return, time-of-day) feels intelligent
- Celebration cues (milestones) provide positive reinforcement

**Consequences:**
- ✅ Comprehensive attention support
- ✅ Modular design for iteration
- ✅ Context-aware messaging
- ⚠️ Risk of cue fatigue if not tuned well
- 📝 Add effectiveness tracking in V2

---

### FOCUS-005: ADHD-Informed Cue Intervals

**Context:** ADHD brains habituate to predictable patterns. Fixed-interval reminders quickly become ignorable.

**Decision:** Variable intervals with jitter and adaptive back-off.

**Implementation:**

1. **Base cooldowns (seconds):**
```typescript
CUE_COOLDOWNS = {
  session_milestone: 300,   // 5 min
  break_reminder: 600,      // 10 min
  tab_return: 120,          // 2 min
  task_progress: 900,       // 15 min
  energy_check: 1800,       // 30 min
  encouragement: 600,       // 10 min
  getting_started: 300,     // 5 min
  completion_nudge: 600,    // 10 min
};
```

2. **Global minimum:**
```typescript
GLOBAL_CUE_COOLDOWN = 90;  // 1.5 min between ANY cue
```

3. **Jitter function:**
```typescript
function addJitter(baseSeconds: number, jitterPercent = 0.2): number {
  const jitter = baseSeconds * jitterPercent;
  return baseSeconds + (Math.random() * jitter * 2 - jitter);
}
```

4. **Adaptive back-off:**
```typescript
// If user dismissed 3+ cues in under an hour, stop firing
if (metrics.cuesDismissedCount >= 3 && metrics.focusTimeSeconds < 3600) {
  return null;  // They're in flow, leave them alone
}
```

**Research basis:**
- Variable ratio reinforcement schedules are more engaging (Skinner)
- ADHD brains seek novelty; predictable patterns become background noise
- Respecting flow state prevents learned helplessness toward cues

**Consequences:**
- ✅ Prevents pattern habituation
- ✅ Respects user flow state
- ✅ Feels more "intelligent" / less robotic
- ⚠️ Harder to predict when cues will fire
- 📝 Log cue timing for effectiveness analysis

---

### FOCUS-006: Gentle Cue Visual Design

**Context:** Typical notifications are jarring and anxiety-inducing. Need cues that feel supportive, not stressful.

**Decision:** Pastel gradient backgrounds with soft animations and positive framing.

**Visual design:**
```typescript
CUE_STYLES = {
  session_milestone: {
    gradient: "from-amber-100 via-yellow-50 to-orange-50",
    glow: "shadow-amber-200/50",
    accent: "from-amber-400 to-orange-400",
  },
  break_reminder: {
    gradient: "from-sky-100 via-blue-50 to-cyan-50",
    ...
  },
  // ... each cue type has unique color palette
};
```

**Animation choices:**
- Fade in + slide up (not jarring pop)
- Gentle pulse on background (subtle movement)
- Bounce on emoji (draws attention without alarm)
- Smooth exit animation (doesn't just disappear)

**Copy principles:**
- Always positive framing ("Great progress!" not "You've been working too long")
- First-person inclusive ("Let's..." not "You should...")
- Emoji adds warmth
- Short messages (scannable, not paragraphs)

**Consequences:**
- ✅ Feels supportive, not nagging
- ✅ Distinct colors help identify cue type at glance
- ✅ Animations add delight without overwhelm
- ⚠️ Soft colors may not grab attention in peripheral vision
- 📝 Consider optional "high visibility" mode

---

*End of December 20-21, 2025 decisions*
