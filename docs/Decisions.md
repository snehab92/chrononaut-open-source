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
