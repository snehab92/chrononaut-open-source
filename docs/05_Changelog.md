# Chrononaut Changelog

A detailed log of development sessions, learnings, and progress.

---

## Session: December 1, 2025

### Session Reference Info
- **Date:** December 1, 2025
- **Approximate Duration:** ~8 hours
- **Week/Day:** Week 1, Day 1
- **Build Plan Goals:** Database Schema, Auth Enhancement, App Shell

---

### What I Set Out To Do

Complete Week 1 goals today (+ ground up redo of project set up with vercel <> superbase starter template):
1. **Day 1-2:** Create complete database schema (14 tables with RLS policies)
2. **Day 3:** Auth enhancement with onboarding flow
3. **Day 4-5:** App shell with global navigation menu

**Stretch goal:** Get something visually beautiful on screen to end Day 1 on a high note.

---

### Change Log Summary

| Category | Change | Files |
|----------|--------|-------|
| **Schema** | Created 14 tables, 20 indexes, 15 RLS policies, 9 triggers | `supabase/migrations/20251201214905_initial_schema.sql` |
| **Schema** | Added location + photo fields to notes table | Same migration + SQL Editor |
| **Auth** | Onboarding flow with protected route redirect | `lib/supabase/proxy.ts`, `app/onboarding/page.tsx`, `components/onboarding-form.tsx` |
| **Shell** | App shell with collapsible sidebar, mobile sheet, keyboard shortcuts | `components/app-shell.tsx`, `components/keyboard-shortcuts.tsx` |
| **Layout** | Authenticated route group with shell wrapper | `app/(authenticated)/layout.tsx` |
| **Pages** | Placeholder pages for all 6 main screens | `app/(authenticated)/[dashboard|notes|focus|meeting|journal|settings]/page.tsx` |
| **Build Fix** | Disabled `cacheComponents` for auth route compatibility | `next.config.ts` |
| **Design** | Beautiful warm color palette with serif font | `app-shell.tsx`, `dashboard/page.tsx`, `layout.tsx`, `tailwind.config.ts` |

---

### Daily Summary

#### 1. Completed Tasks Summary

- ✅ Database schema (14 tables) created and deployed
- ✅ Location/photo fields added to notes table
- ✅ Auth flow with onboarding redirect working
- ✅ App shell with navigation and keyboard shortcuts
- ✅ 6 placeholder pages created
- ✅ Build errors fixed (Next.js 16 cacheComponents)
- ✅ Beautiful design system applied (forest green, mustard, cream palette)

---

#### 2. Completed Tasks Drill-Down

##### 2a. Database Schema (~2 hours)

**What was built:**
- 14 tables: profiles, notes, time_blocks, tasks, journal_entries, health_metrics, meeting_notes, ai_insights, cue_rules, cue_instances, integration_tokens, audit_log, user_settings, notification_preferences
- 20 indexes for query performance
- 15 RLS policies (users own their data)
- 9 triggers (timestamps, audit logging, profile creation)

**Troubleshooting:**

| Issue | Root Cause | Solution | Time |
|-------|------------|----------|------|
| Quick capture needs geolocation | Notes table missing location fields | Added `location_name`, `location_lat`, `location_lng`, `photo_url` to notes table | 15 min |

**Key SQL patterns learned:**
```sql
-- Numeric precision for coordinates
location_lat numeric(10,7)  -- 7 decimal places = ~1cm precision

-- Check constraints for ratings
check (energy_rating between 1 and 10)

-- RLS policy pattern
create policy "Users can CRUD own data" on table_name
  for all using (auth.uid() = user_id);
```

---

##### 2b. Auth Enhancement + Env Var Debugging (~1.5 hours)

**What was built:**
- Onboarding page collecting: full_name, timezone, wind_down_time, max_focus_minutes
- Protected route middleware in `proxy.ts`
- Redirect flow: login → onboarding (if needed) → dashboard

**Troubleshooting:**

| Issue | Symptom | Root Cause | Solution | Time |
|-------|---------|------------|----------|------|
| Auth not working | "Failed to fetch", Status 0, ERR_NAME_NOT_RESOLVED | Vercel template auto-populated `.env.local` with placeholder Supabase keys that don't work | Copied real keys from Supabase dashboard (Settings → API) | **~1 hour** |

**Key Learning:** Never trust `vercel env pull` — it overwrites without warning and may contain placeholder keys. Always verify env vars against Supabase dashboard.

**Auth flow sequence:**
```
User visits protected route
        ↓
   Logged in? ──No──→ /auth/login
        ↓ Yes
   Onboarded? ──No──→ /onboarding
        ↓ Yes
      /dashboard
```

---

##### 2c. App Shell + Navigation (~30 min)

**What was built:**
- Collapsible sidebar (72px collapsed, 288px expanded)
- Mobile hamburger with Sheet component
- 5 nav items with keyboard shortcuts (⌘D/N/F/M/J)
- Quick Task button (⌘T)
- Settings and Logout at bottom
- Tooltips on collapsed state

**shadcn components added:**
```bash
npx shadcn@latest add sheet tooltip separator avatar
```

---

##### 2d. Build Error Fixes (~30 min)

**Troubleshooting:**

| Issue | Symptom | Root Cause | Solution |
|-------|---------|------------|----------|
| Build failing | "Uncached data accessed outside Suspense" | Next.js 16 `cacheComponents: true` is strict about async data | Disabled `cacheComponents` in `next.config.ts` |
| Dynamic export error | "Route segment config not compatible with cacheComponents" | Can't use `export const dynamic` with cacheComponents | Same fix — disabled cacheComponents |

**Key Learning:** Next.js 16 with `cacheComponents: true` (from Vercel template) requires different patterns for auth routes. Simplest fix: disable it for now.

---

##### 2e. Beautiful Design System (~30 min)

**What was built:**
- Warm color palette: forest green (#2D5A47), mustard (#D4A84B), cream (#FDFBF7, #E8DCC4)
- Lora serif font for headings
- Compass logo with gradient background
- Active nav with gold left accent bar
- User avatar card with initials
- Hover effects: scale, color transitions, icon animations
- Dashboard cards with hover lift effect

**Files modified:**
- `components/app-shell.tsx` — complete redesign
- `app/(authenticated)/dashboard/page.tsx` — matching card design
- `app/layout.tsx` — added Lora font, updated metadata
- `tailwind.config.ts` — added serif font family

---

#### 3. Key Learnings

##### Technical Learnings

| Concept | What I Learned |
|---------|----------------|
| **Next.js 16 proxy.ts** | Replaces middleware.ts; runs on every request for auth checks |
| **Route groups** | `(authenticated)` folder applies layout without affecting URL |
| **RLS policies** | `auth.uid()` returns current user; policies auto-filter queries |
| **Numeric precision** | `numeric(10,7)` = 10 digits total, 7 after decimal |
| **cacheComponents** | Experimental Next.js 16 feature; conflicts with dynamic auth routes |

##### ADHD-Specific Observations

- **Env var debugging was frustrating** — 1 hour on what should be a 5-min fix. Template magic hid the real problem.
- **Ending on visual beauty was worth it** — Seeing a polished UI at end of day provided dopamine reward and motivation for tomorrow.
- **Build errors are demoralizing** — Quick fixes matter for momentum.

##### Quick Reference Commands

```bash
# Run migrations
npx supabase db push

# Add shadcn component
npx shadcn@latest add [component]

# Build check before push
npm run build

# Commit and push
git add . && git commit -m "message" && git push origin main
```

---

#### 4. Final System State

**Working:**
- ✅ Database schema deployed to Supabase
- ✅ Auth + onboarding flow
- ✅ App shell with navigation
- ✅ Dashboard with beautiful design
- ✅ Build passing
- ✅ Deployed to Vercel

**Routes:**
| Route | Status |
|-------|--------|
| `/` | Landing (static) |
| `/auth/*` | Login, signup, etc. (static) |
| `/onboarding` | Onboarding form (dynamic) |
| `/dashboard` | Main dashboard (dynamic) |
| `/notes`, `/focus`, `/meeting`, `/journal`, `/settings` | Placeholder pages (dynamic) |

**Next Session (Day 2):**
- Week 2: TickTick OAuth integration
- Week 2: Bidirectional task sync
- Week 2: Smart Task View on dashboard

---

*End of December 1, 2025 session*

---

## Session: December 5, 2025

### Session Reference Info
- **Date:** December 5, 2025
- **Approximate Duration:** ~4 hours
- **Week/Day:** Week 2, Day 2-3
- **Build Plan Goals:** TickTick Integration + Smart Task View

---

### What I Set Out To Do

1. Debug TickTick OAuth token exchange (continued from Day 1)
2. Get bidirectional task sync working
3. Display tasks on dashboard

---

### Change Log Summary

| Category | Change | Files |
|----------|--------|-------|
| **Auth** | Pivoted from OAuth to Direct Auth (username/password login) | `lib/ticktick/client.ts` |
| **API** | TickTick login endpoint | `app/api/integrations/ticktick/login/route.ts` |
| **API** | TickTick test endpoint | `app/api/integrations/ticktick/test/route.ts` |
| **API** | TickTick disconnect endpoint | `app/api/integrations/ticktick/disconnect/route.ts` |
| **API** | TickTick tasks fetch endpoint | `app/api/integrations/ticktick/tasks/route.ts` |
| **API** | TickTick complete task endpoint | `app/api/integrations/ticktick/complete/route.ts` |
| **API** | TickTick update due date endpoint | `app/api/integrations/ticktick/update-date/route.ts` |
| **UI** | Settings integrations card with login modal | `components/settings/integrations-card.tsx` |
| **UI** | Task list component with Today/Week toggle | `components/dashboard/task-list.tsx` |
| **UI** | Dashboard fetches and displays TickTick tasks | `app/(authenticated)/dashboard/page.tsx` |
| **Deps** | Added shadcn dialog, calendar, popover components | `components/ui/` |
| **Deps** | Downgraded react-day-picker to v8 for Tailwind v3 compat | `package.json` |

---

### Daily Summary

#### 1. Completed Tasks Summary

- ✅ Pivoted from OAuth to Direct Auth after 2 days of OAuth debugging
- ✅ TickTick client library with login, read tasks, complete task methods
- ✅ Settings UI with Connect/Disconnect TickTick functionality
- ✅ Dashboard displays real TickTick tasks
- ✅ Complete task works (bidirectional sync!)
- ✅ Today/This Week toggle with timeline view
- ✅ Date picker UI added (local update works, sync pending)

---

#### 2. Completed Tasks Drill-Down

##### 2a. OAuth → Direct Auth Pivot (~1 hour decision + 2 hours implementation)

**Context:** After 2 days of OAuth debugging (7 different patterns tested), all returned 401 errors despite matching implementations from working repos (ticktick-mcp, TickTickSync).

**Discovery:** TickTickSync (15k+ users Obsidian plugin) uses Direct Auth via `/api/v2/user/signon` endpoint, not OAuth.

**Implementation:**
- `TickTickClient.login(username, password)` → returns session token
- Token stored in `integration_tokens` table
- `TickTickClient.fromToken(token, inboxId)` for subsequent requests

**Key headers required:**
```typescript
{
  'x-device': JSON.stringify({ platform: 'web', version: 6070, ... }),
  'Cookie': `t=${token}`,
  't': token
}
```

---

##### 2b. Task Sync Implementation (~1 hour)

**Read operations:**
- `getAllTasks()` via `/batch/check/0` endpoint
- Returns all projects, tasks, and tags in one call

**Write operations:**
- `completeTask(projectId, taskId)` via `/batch/task` with `status: 2`
- `updateTaskDueDate()` via same endpoint (implemented but sync not working yet)

**Batch payload format:**
```typescript
{
  add: [],
  addAttachments: [],
  delete: [],
  deleteAttachments: [],
  updateAttachments: [],
  update: [{ id, projectId, status: 2, modifiedTime }]
}
```

---

##### 2c. Dashboard Task Display (~30 min)

- Server component fetches tasks via TickTick client
- Filters for tasks due today/this week
- Client component handles completion and date changes
- Priority colors match TickTick (red=high, yellow=medium, blue=low)

---

##### 2d. Today/Week Toggle (~30 min)

**Today view:**
- Tasks due today + overdue
- Simple list sorted by priority

**Week view (timeline):**
- Tasks grouped by day
- Visual timeline with dots and connecting lines
- Day headers: "Today", "Tomorrow", "Overdue", or "Wednesday, Dec 11"

---

##### 2e. Dependency Issues (~20 min)

**Problem:** shadcn calendar component uses Tailwind v4 syntax (`--spacing(8)`)
**Solution:** Rewrote calendar.tsx for Tailwind v3 + downgraded react-day-picker to v8

```bash
npm install react-day-picker@^8.10.1 date-fns@^3.6.0 --legacy-peer-deps
```

---

#### 3. Key Learnings

##### Technical Learnings

| Concept | What I Learned |
|---------|----------------|
| **OAuth vs Direct Auth** | OAuth is preferred (limited scope, user trust, revocation) but Direct Auth works when OAuth is broken/undocumented |
| **Session tokens** | Direct Auth returns session token, not OAuth refresh token. Simpler but user must provide actual password |
| **TickTick batch API** | `/batch/task` endpoint handles creates, updates, deletes in one call |
| **x-device header** | TickTick requires device fingerprint with version >= 6070 |
| **Tailwind v3 vs v4** | shadcn latest uses v4 syntax; need to check compatibility |

##### Security Considerations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Password in transit | Low | HTTPS only, not stored |
| Token in DB | Medium | RLS policies, consider Vault later |
| Full account access | Medium | Client only implements safe operations |

---

#### 4. Pending Items

| Item | Priority | Notes |
|------|----------|-------|
| Due date sync to TickTick | High | API returns success but date doesn't update - may need `timeZone` field |
| Supabase Vault for token | Low | Token protected by RLS, Vault is nice-to-have |
| Create new task | Medium | Not in current scope but user requested |
| Google Calendar integration | High | Next major integration (Week 9 per build plan) |
| Finish sync engine | Medium | 15-min polling, conflict resolution |

---

#### 5. Final System State

**Working:**
- ✅ TickTick Direct Auth login
- ✅ Token storage in Supabase
- ✅ Fetch tasks from TickTick
- ✅ Display tasks on dashboard
- ✅ Complete task (syncs to TickTick)
- ✅ Today/Week toggle
- ✅ Date picker UI
- ✅ Settings connect/disconnect

**Not Working:**
- ❌ Due date changes don't sync to TickTick (API returns success but no change)

**Next Session:**
- Debug due date sync OR move on
- Google Calendar integration research
- Consider "create task" feature

---

*End of December 5, 2025 session*

---

## Session: December 12, 2025

### Session Reference Info
- **Date:** December 12, 2025
- **Approximate Duration:** ~4 hours (ongoing)
- **Week/Day:** Week 2-3
- **Build Plan Goals:** Google Calendar Integration, Whoop Integration, Dashboard Metrics

---

### What I Set Out To Do

1. Complete Google Calendar OAuth integration with read-only sync
2. Build Whoop integration for health data (recovery, sleep, strain, workouts)
3. Update dashboard metrics panel to match evolved requirements

---

### Change Log Summary

| Category | Change | Files |
|----------|--------|-------|
| **Migration** | Calendar events table | `supabase/migrations/2025121102_calendar_events.sql` |
| **Migration** | Sync log table | `supabase/migrations/2025121101_sync_log.sql` |
| **Migration** | Workouts table + health_metrics updates | `supabase/migrations/2025121201_workouts_metrics.sql` |
| **Library** | Google Calendar client (OAuth, token refresh, API) | `lib/google/calendar.ts` |
| **Library** | Google Calendar sync engine | `lib/google/sync.ts` |
| **Library** | Whoop client (OAuth, token refresh, API) | `lib/whoop/client.ts` |
| **Library** | Whoop sync engine | `lib/whoop/sync.ts` |
| **API** | Google Calendar OAuth routes | `app/api/integrations/google/{authorize,callback,sync,disconnect}/route.ts` |
| **API** | Calendar events endpoint | `app/api/calendar/events/route.ts` |
| **API** | Whoop OAuth routes | `app/api/integrations/whoop/{authorize,callback,sync,disconnect}/route.ts` |
| **Hooks** | useGoogleCalendarSync hook | `lib/hooks/use-google-calendar-sync.ts` |
| **UI** | Calendar context provider | `components/dashboard/calendar-context.tsx` |
| **UI** | Event list with Today/Week views | `components/dashboard/event-list.tsx` |
| **UI** | Combined sync status for TickTick + GCal | `components/dashboard/combined-sync-status.tsx` |
| **UI** | Settings integrations card (added Whoop) | `components/settings/integrations-card.tsx` |
| **UI** | Updated calendar component for react-day-picker v9 | `components/ui/calendar.tsx` |
| **Deps** | Upgraded react-day-picker to v9.4.4 | `package.json` |
| **Docs** | Privacy policy for Whoop OAuth | `docs/PRIVACY_POLICY.md` |
| **Fix** | Added modifiedTime to TickTickTask interface | `lib/ticktick/client.ts` |

---

### Daily Summary

#### 1. Completed Tasks Summary

- ✅ Google Calendar OAuth integration complete
- ✅ 7-day calendar view with Today/Week toggle
- ✅ Expandable event modals with attendees, meeting links
- ✅ Combined sync engine (TickTick + GCal, 60-second polling)
- ✅ Whoop OAuth integration complete (awaiting sync test)
- ✅ Workouts table for exercise/meditation tracking
- ✅ Health metrics table updated with new columns
- ✅ Privacy policy created for Whoop OAuth
- ✅ All migrations made idempotent (IF NOT EXISTS pattern)

---

#### 2. Completed Tasks Drill-Down

##### 2a. Google Calendar Integration (~1.5 hours)

**What was built:**
- OAuth 2.0 flow with Google Cloud Console setup
- Read-only calendar sync (30-day window)
- Local-first storage in `calendar_events` table
- Event modals with: title, time, location, attendees, meeting link, "Start Meeting Notes" button

**Sync pattern:**
- Initial sync on OAuth callback
- 60-second polling interval
- Page focus triggers sync
- Manual sync button

**Week view UI:**
- 7 columns (days), scrollable if >250px
- Today highlighted with gold border and cream background
- Mini event cards stacked vertically per day

---

##### 2b. Whoop Integration (~2 hours)

**What was built:**
- OAuth 2.0 flow with Whoop Developer Portal
- Read scopes: recovery, cycles, sleep, workout, profile, body_measurement
- Two tables:
  - `health_metrics`: daily recovery, sleep hours, sleep consistency, strain, HRV, RHR
  - `workouts`: individual activities with HR zones, meditation flag

**Data captured:**

| health_metrics | workouts |
|----------------|----------|
| recovery_score (0-100) | whoop_id |
| sleep_hours | activity_type |
| sleep_consistency (0-100) | total_minutes |
| strain_score (0-21) | strain_score |
| hrv_rmssd | zone_1-5_minutes |
| resting_heart_rate | is_meditation |

**Sport ID mapping:** 70+ activity types mapped (meditation = sport_id 82)

---

##### 2c. Migration Refactoring (~30 min)

**Problem:** Supabase migration version conflicts after renaming files.

**Solution:**
1. Used `supabase migration repair --status reverted` for old versions
2. Made all migrations idempotent:
   - `CREATE TABLE IF NOT EXISTS`
   - `CREATE INDEX IF NOT EXISTS`
   - `DROP POLICY IF EXISTS` before `CREATE POLICY`
   - `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`
   - `ADD COLUMN IF NOT EXISTS` for schema updates

**Key learning:** Always write idempotent migrations that can be safely re-run.

---

##### 2d. Dashboard Metrics Redesign (planning)

**Evolution from PRD:**
- Dropped generic "Energy" metric (Whoop recovery + journal energy blend)
- Replaced with actionable Habits tracking against specific goals
- Added Well-being/Growth toggle for different metric scopes

**New structure:**

```
Well-being Scope:
├── Habits Section (current week)
│   ├── Sleep Streak (goal: 8hrs + 84% consistency)
│   ├── Exercise (goal: 2.5hrs Z1-3, 15min Z4-5)
│   └── Meditation Streak (goal: 1x daily)
├── Mood Section
│   └── Week mood faces (from journal, gray if missing)
└── Compass Section
    └── AI daily insight + "I commit to..." button

Growth Scope:
├── Self-Compassion assessment
├── Values Alignment assessment
├── Executive Skills assessment
└── Strengths Profile assessment
```

---

#### 3. Key Learnings

##### Technical Learnings

| Concept | What I Learned |
|---------|----------------|
| **react-day-picker v9** | Uses `Chevron` component instead of `IconLeft`/`IconRight` |
| **Supabase migrations** | Version = numeric prefix of filename; must be unique |
| **Migration repair** | `--status reverted` removes old versions from tracking |
| **Idempotent SQL** | Essential for migrations that might be re-run |
| **Whoop API** | Uses `limit` param, not date filters for pagination |
| **TypeScript objects** | Negative number keys need brackets: `{[-1]: 'value'}` |

##### ADHD-Specific Observations

- **Metrics evolution is good** — Moving from abstract "Energy" to concrete "Sleep Streak" is more actionable
- **Goals on cards** — Visual accountability reinforcement requested
- **Gray faces for missing journals** — Gamification to avoid skipping entries

---

#### 4. Pending Items

| Item | Priority | Notes |
|------|----------|-------|
| Test Whoop sync | High | OAuth works, sync returned 400 error - need to debug |
| Build metrics panel UI | High | Well-being/Growth toggle + Habits cards |
| daily_commitments table | Medium | For "I commit to..." tracking |
| Expanded modals for habit cards | Medium | Trend lines, HRV, sleep efficiency |
| Compass AI integration | Low | Requires AI pattern analyst setup |

---

#### 5. Final System State

**Working:**
- ✅ Google Calendar OAuth + sync
- ✅ Calendar week view with event modals
- ✅ Combined sync status (TickTick + GCal)
- ✅ Whoop OAuth flow
- ✅ Workouts + health_metrics tables created
- ✅ Settings page shows all 3 integrations

**In Progress:**
- 🔄 Whoop data sync (400 error, needs debugging)
- 🔄 Dashboard metrics panel redesign

**Next Steps:**
1. Fix Whoop sync (remove date filters, test again)
2. Build metrics panel with Well-being/Growth toggle
3. Implement Habits cards with goals display
4. Add expanded modals with trend data

---

*End of December 12, 2025 session (ongoing)*

---

## Session: December 13, 2025 (Continued from Dec 12)

### Session Reference Info
- **Date:** December 13, 2025
- **Approximate Duration:** ~3 hours
- **Week/Day:** Week 5
- **Build Plan Goals:** Notes Screen Phase 3, AI Agent Integration

---

### What I Set Out To Do

1. Complete Notes Screen Phase 3 (Rich text editor + templates)
2. Build AI agent integration (Week 5 of build plan)
3. Test and debug chat functionality

---

### Change Log Summary

| Category | Change | Files |
|----------|--------|-------|
| **Notes** | Tiptap rich text editor with formatting toolbar | `components/rich-editor.tsx` |
| **Notes** | Note templates (Meeting, Document, Quick Capture) | `lib/note-templates.ts` |
| **Notes** | Removed assessment note type (will use external assessments) | `app/(authenticated)/notes/page.tsx` |
| **AI** | 4-agent system (Executive Coach, Therapist, Pattern Analyst, Research Assistant) | `lib/ai/agents.ts` |
| **AI** | Streaming chat API endpoint | `app/api/chat/route.ts` |
| **AI** | Chat drawer with agent selector | `components/chat-drawer.tsx` |
| **AI** | Conversation persistence tables | `supabase/migrations/20251212050000_ai_conversations.sql` |
| **UI** | Global ⌘/ keyboard shortcut for chat | `components/app-shell.tsx` |
| **UI** | History modal with rename/delete | `components/chat-drawer.tsx` |
| **Deps** | Installed Tiptap editor | `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder` |
| **Deps** | Installed Vercel AI SDK | `ai`, `@ai-sdk/anthropic` |

---

### Daily Summary

#### 1. Completed Tasks Summary

- ✅ Notes Phase 3: Rich text editor with formatting toolbar
- ✅ Note templates (Meeting, Document, Quick Capture)
- ✅ Removed assessment note type per user request
- ✅ AI agent configuration with system prompts
- ✅ Chat drawer UI with agent switching
- ✅ Streaming chat working with Claude Sonnet 4
- ✅ Conversation history modal with rename/delete
- ✅ Chat persistence per agent (in-memory cache)
- ✅ Context-aware default agents (journal → therapist)

---

#### 2. Completed Tasks Drill-Down

##### 2a. Notes Phase 3: Rich Text Editor (~30 min)

**What was built:**
- Tiptap-based rich editor with formatting toolbar
- Toolbar buttons: Bold, Italic, H1, H2, Bullet list, Numbered list, Blockquote, Divider, Undo/Redo
- Fixed SSR hydration issue with `immediatelyRender: false`

**Templates:**
- Meeting: Attendees, Agenda, Discussion, Action Items, Next Steps
- Document: Basic heading + content
- Quick Capture: Minimal structure

**Assessment removal:** Per user request, removed assessment note type. Assessments will be completed externally and imported to "About Me" folders for AI context.

---

##### 2b. AI Agent Integration (~2 hours)

**Architecture Decisions:**
- Claude-only approach (Sonnet 4 for all agents) - "one brain" philosophy
- 4 agents with distinct personalities and contexts
- Pattern Analyst is background-only (no direct chat)
- Wispr Flow for dictation (user already has account)

**Agent Configurations:**

| Agent | Model | Role | Default For |
|-------|-------|------|-------------|
| Executive Coach | claude-sonnet-4-20250514 | Productivity, meeting prep, work challenges | Dashboard, Notes, Focus, Meeting |
| Therapist | claude-sonnet-4-20250514 | Journal reflection, emotional processing, DBT/ACT | Journal |
| Pattern Analyst | claude-sonnet-4-20250514 | Background analysis, structured JSON output | (no direct chat) |
| Research Assistant | claude-sonnet-4-20250514 | Quick research, summarization, fact-finding | Research context |

**Database schema:**
```sql
ai_conversations (
  id, user_id, agent_type, title,
  context_type, context_id, created_at, updated_at
)

ai_messages (
  id, conversation_id, role, content, created_at
)
```

---

##### 2c. Chat Drawer Implementation (~1 hour)

**Features:**
- Slide-over panel (420px width)
- Agent selector dropdown (hides Pattern Analyst)
- Message streaming from Claude
- Copy/Insert buttons on assistant messages
- Conversation history modal with:
  - Filtered by current agent
  - Chronologically sorted
  - Rename capability (inline edit)
  - Delete with confirmation
- Chat persistence per agent (in-memory cache)
- Context-aware default agent based on current screen

**Keyboard shortcuts:**
- ⌘/ to toggle chat
- Shift+Enter for new line
- Enter to send

---

##### 2d. AI SDK v5 Troubleshooting (~1 hour)

**Problem:** Multiple API changes in Vercel AI SDK v5 caused errors.

**Issues encountered:**

| Issue | Error | Solution |
|-------|-------|----------|
| useChat hook | `handleInputChange`, `setInput`, `append` not functions | Abandoned useChat, implemented manual fetch |
| Streaming response | `toDataStreamResponse is not a function` | Changed to `toTextStreamResponse()` |
| SSE parsing | Complex chunk parsing needed | Simplified to plain text streaming |
| Hydration mismatch | `crypto.randomUUID()` during SSR | Deferred initialization to useEffect |

**Final architecture:** Manual implementation instead of useChat hook:
1. Local state for messages, input, loading
2. Manual fetch to `/api/chat`
3. Manual stream reading with `response.body.getReader()`
4. Direct text accumulation (not SSE parsing)

---

#### 3. Key Concepts Learned

##### Vercel AI SDK Architecture

**How it works:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  Next.js    │────▶│  Anthropic  │
│  (client)   │◀────│   API       │◀────│    API      │
│             │     │  /api/chat  │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
   Manual fetch      streamText()        HTTPS only
   + stream read     handles auth        (API key in
                     via env var         server env)
```

**Key insight:** No OAuth for Claude! Unlike Google Calendar or Whoop, Claude uses simple API key authentication:
- API key stored in `.env.local` as `ANTHROPIC_API_KEY`
- Key never exposed to client (only server-side)
- Vercel AI SDK reads env var automatically
- No token refresh, no OAuth dance, no user consent flow

**Why no OAuth for AI APIs?**
- AI APIs bill the developer, not the end user
- No user data to protect (unlike calendar/health data)
- Developer controls access via their API key
- Rate limits and costs are developer's responsibility

**Data flow:**
```
1. User types message
2. Client sends POST to /api/chat with:
   - messages array
   - agentType
   - conversationId
   - optional context
3. Server verifies Supabase auth (user owns this request)
4. Server calls Claude via SDK (API key from env)
5. Claude streams response
6. Server pipes stream to client
7. Client reads stream chunks, updates UI
8. Client saves to Supabase (conversation + messages)
```

**Cost model:**
- Sonnet 4: ~$3/million input tokens, ~$15/million output tokens
- Personal use estimate: $5-15/month
- No per-user API keys needed—single developer key

---

##### Manual Streaming vs useChat Hook

**useChat hook (didn't work reliably in v5):**
```tsx
const { messages, input, handleSubmit } = useChat({ api: "/api/chat" });
// One line, but black-box behavior
```

**Manual implementation (what we built):**
```tsx
// State management
const [messages, setMessages] = useState([]);
const [inputValue, setInputValue] = useState("");
const [isLoading, setIsLoading] = useState(false);

// Fetch + stream
const response = await fetch("/api/chat", { ... });
const reader = response.body?.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // Update message content incrementally
}
```

**Trade-off:** More code but full control and easier debugging.

---

#### 4. Key Learnings

##### Technical Learnings

| Concept | What I Learned |
|---------|-----------------|
| **AI SDK v5** | Breaking changes from v4; useChat hook unreliable, manual fetch more stable |
| **toTextStreamResponse** | Returns plain text stream; simpler than SSE parsing |
| **Hydration errors** | Any `crypto.randomUUID()` or `Date.now()` in initial render causes mismatches |
| **API key auth** | AI providers use simple API keys, not OAuth (developer pays, not user) |
| **Tiptap SSR** | Requires `immediatelyRender: false` to avoid hydration issues |

##### ADHD-Specific Observations

- **Agent switching clears chat** - Good UX decision to avoid confusion
- **Context-aware defaults** - Journal → Therapist feels natural
- **Keyboard shortcut (⌘/)** - Quick access matches power user expectations

---

#### 5. Files to Edit Agent Prompts

**Primary file:** `/lib/ai/agents.ts`

Contains:
- `AGENTS` object with all 4 agent configurations
- Each agent has: `id`, `name`, `icon`, `model`, `description`, `systemPrompt`
- `CONTEXT_DEFAULT_AGENTS` mapping for screen → agent defaults
- `getAgent()` helper function

**Example structure:**
```typescript
export const AGENTS: Record<AgentType, AgentConfig> = {
  "executive-coach": {
    id: "executive-coach",
    name: "Executive Coach",
    icon: "🎯",
    model: "claude-sonnet-4-20250514",
    description: "Productivity coaching, meeting prep, work challenges",
    systemPrompt: `You are an executive coach with 25+ years experience...
      Style:
      - Direct and warm—no fluff
      - One small step at a time
      - Never shame; always curious
      ...`,
  },
  // ... other agents
};
```

---

#### 6. Final System State

**Working:**
- ✅ Notes screen with rich text editor
- ✅ Note templates (Meeting, Document, Quick Capture)
- ✅ Chat drawer with ⌘/ shortcut
- ✅ All 4 agents configured
- ✅ Streaming chat responses
- ✅ Conversation history modal
- ✅ Chat persistence per agent
- ✅ Context-aware default agents
- ✅ Rename/delete conversations

**Next Steps:**
1. "About Me" section for AI context (user preferences, values, goals)
2. Pattern Analyst background analysis
3. Journal screen (to feed Therapist agent)
4. Meeting transcription integration

---

*End of December 13, 2025 session*

---

## Session: December 17, 2025 

Focus areas for today (in sequential order):
1. Pattern analyzer <> task build out: lines 144-162
2. AI chat drawer <> notes screen UI/UX enhancements: lines 327-333
3. Focus screen build out: lines 362-375
4. Journal screen build out: lines 384-416; 436-458 (we can implement e2ee lines 416-433 later, unless you disagree?)
5. Meeting screen build out: 463-519
6. Claude pattern analysis agent - other workflows: 523-594
7. Notes export/import functionality - line 360

---

## Session: December 17-19, 2025

### Session Reference Info
- **Date:** December 17-19, 2025
- **Approximate Duration:** ~12 hours across 3 days
- **Week/Day:** Week 6
- **Build Plan Goals:** About Me Section, AI Chat Drawer Enhancements, Focus Screen Build

---

### What We Set Out To Do

1. **About Me section** in Notes screen for AI agent context files
2. **AI Chat Drawer enhancements** - agent instructions, memory exposure in UI
3. **Screen ↔ AI Chat Drawer interaction fixes** - context-aware agent switching
4. **Focus Screen build** - comprehensive focus mode with timer, tasks, notes, calendar

---

### Change Log Summary

| Category | Change | Files |
|----------|--------|-------|
| **Migration** | About Me files storage table | `supabase/migrations/20251220140000_about_me_files.sql` |
| **Migration** | Folders type column | `supabase/migrations/20251219140000_folders_type.sql` |
| **Migration** | About Me storage | `supabase/migrations/20251219150000_about_me_storage.sql` |
| **Migration** | Notes starred column | `supabase/migrations/2025121902_notes_starred.sql` |
| **Migration** | TickTick list/section names | `supabase/migrations/20251220150000_ticktick_list_section_names.sql` |
| **UI** | About Me section in Notes sidebar | `app/(authenticated)/notes/page.tsx` |
| **UI** | Agent instructions modal | `components/chat-drawer.tsx` |
| **UI** | Agent memory modal | `components/chat-drawer.tsx` |
| **Context** | Screen-aware agent switching | `components/chat/chat-provider.tsx` |
| **API** | AI task analysis endpoint | `app/api/ai/analyze-tasks/route.ts` |
| **Focus** | Complete Focus Screen | `app/(authenticated)/focus/page.tsx` |
| **Focus** | Focus Task List with AI analysis | `components/focus/focus-task-list.tsx` |
| **Focus** | Focus Note Editor | `components/focus/focus-note-editor.tsx` |
| **Focus** | Focus Calendar Widget | `components/focus/focus-calendar-widget.tsx` |
| **Focus** | Focus Timer | `components/focus/focus-timer.tsx` |
| **Focus** | Focus Analytics Widget | `components/focus/focus-analytics-widget.tsx` |
| **Focus** | Focus Session Context | `components/focus/focus-session-context.tsx` |
| **Sync** | TickTick list/section name sync | `lib/ticktick/sync.ts` |

---

### Daily Summary

#### 1. Completed Tasks Summary

**December 17-18: About Me & Chat Drawer Enhancements**
- ✅ "About Me" section added to Notes sidebar (above AI Conversations)
- ✅ File upload support for AI agent context (PDF, DOCX, MD, TXT)
- ✅ Auto-detection of assessment files (Self-Compassion, Values, etc.)
- ✅ Agent instructions modal - per-agent custom instructions
- ✅ Agent memory modal - view saved AI insights
- ✅ Screen-aware agent switching (dashboard→research, notes→coach, journal→therapist)
- ✅ Auto-minimize chat drawer on screen navigation
- ✅ Therapist agent removed from Notes (moved to Journal screen)

**December 19: Focus Screen Build**
- ✅ Focus Screen layout with collapsible sidebar
- ✅ Focus Task List mirroring Dashboard functionality
- ✅ AI-powered task analysis (time estimates, prioritization)
- ✅ Focus Note Editor with note picker dropdown
- ✅ Focus Calendar Widget with today's events
- ✅ Meeting note creation from calendar events
- ✅ Focus Timer (task timer + focus session timer)
- ✅ Focus Analytics Widget (placeholder for metrics)
- ✅ Session persistence across navigation
- ✅ TickTick list/section name display on tasks

---

#### 2. Completed Tasks Drill-Down

##### 2a. About Me Section (~2 hours)

**What was built:**
- Collapsible "About Me" section at top of Notes sidebar
- File upload accepting: PDF, DOCX, Markdown, TXT
- `about_me_files` table storing file metadata + content
- Auto-categorization: detects "self-compassion", "values", "clifton", etc.
- File viewer modal for reviewing uploaded content
- Per-agent file targeting (which agents can access which files)

**Database schema:**
```sql
about_me_files (
  id, user_id, filename, file_type, content, 
  category, target_agents[], created_at, updated_at
)
```

**Agent file categories:**
- `assessment` - Self-compassion, Values Alignment, CliftonStrengths
- `feedback` - 360 reviews, performance feedback
- `inspiration` - Writing samples, quotes
- `context` - General background info

---

##### 2b. AI Chat Drawer Enhancements (~1.5 hours)

**Agent Instructions:**
- New `agent_instructions` table for per-agent custom prompts
- Settings → 3-dot menu → "Agent Instructions" modal
- Instructions included in system prompt for that agent
- Visual indicator when custom instructions are active

**Agent Memory:**
- Memory modal shows `ai_insights` saved from conversations
- Displays insight type, content, source, and date
- Memory populated via "Save to Memory" button on assistant messages

**Screen-Aware Switching:**
```typescript
CONTEXT_DEFAULT_AGENTS = {
  dashboard: "research-assistant",
  notes: "executive-coach",
  focus: "executive-coach",
  meeting: "executive-coach",
  journal: "executive-coach", // Therapist in journal screen directly
};
```

---

##### 2c. Focus Screen Build (~6 hours)

**Layout:**
- Two-panel layout: left sidebar (tasks/calendar), right main area (timer/notes)
- Collapsible sidebar for distraction-free focus
- Floating AI chat button integration

**Focus Task List:**
- Mirrors Dashboard task list exactly (Today/Week/All views)
- AI-powered analysis for each task:
  - Time estimation with confidence levels
  - Suggested order (prioritization)
  - Best time of day (morning/afternoon/evening)
- Sortable by: suggested order, priority, quickest, longest
- "Start Timer" button on selected task
- TickTick list/section badges on tasks

**AI Task Analysis API:**
```typescript
// /api/ai/analyze-tasks
// Returns per-task:
{
  timeEstimate: {
    userEstimate, adjustedEstimate, aiEstimate,
    displayMinutes, confidence, source, explanation
  },
  prioritization: {
    suggestedOrder, suggestedTimeOfDay, explanation
  }
}
```

**Focus Note Editor:**
- Dropdown to select existing note OR create new
- Tiptap rich text editor
- Auto-save on content change
- Meeting note creation from calendar event
- "Start Meeting Notes" button in calendar widget

**Focus Timer:**
- Task timer: tracks time on specific task
- Session timer: tracks total focus time
- Pause/Resume/Complete controls
- Visual display with task title

**Focus Calendar Widget:**
- Shows today's events from Google Calendar
- Compact event cards with time, title, location
- Meeting link buttons (Google Meet, Zoom)
- "Start Meeting Notes" creates linked note

---

##### 2d. TickTick Sync Enhancements (~30 min)

**New fields synced:**
- `ticktick_list_name` - Project/list name (e.g., "Projects", "Health")
- `ticktick_section_name` - Section within list (e.g., "Build Second Brain")

**UI display:**
- Purple badge on task cards: "📁 List Name / Section Name"
- Provides context for where task lives in TickTick

---

#### 3. Key Learnings

##### Technical Learnings

| Concept | What I Learned |
|---------|----------------|
| **Optional chaining** | `analysis?.prioritization?.suggestedOrder` prevents runtime errors when nested properties undefined |
| **Context providers** | `FocusSessionContext` enables state sharing across Focus Screen components |
| **Tiptap SSR** | Must use `immediatelyRender: false` and dynamic imports for editor |
| **Timer persistence** | Using context + refs to maintain timer state across component updates |
| **AI streaming** | Manual fetch + reader more reliable than useChat hook for streaming responses |

##### ADHD-Specific Observations

- **Task list parity matters** - Different behavior between Dashboard and Focus screen is confusing
- **AI time estimates helpful** - Seeing "~30m" on tasks reduces estimation anxiety
- **Suggested order reduces decision fatigue** - "Do #1 first" is easier than choosing
- **Calendar integration essential** - Seeing meetings while focusing prevents time blindness

---

#### 4. Bug Fixes Applied

| Bug | Symptom | Fix |
|-----|---------|-----|
| Runtime TypeError | `Cannot read properties of undefined (reading 'prioritization')` | Added optional chaining: `analysis?.prioritization?.suggestedOrder` |
| Timer not starting | Task timer wouldn't begin | Fixed `onStartTimer` callback wiring |
| Note editor empty | Content not loading | Added `editorKey` to force re-render on note change |
| Calendar sync 400 | Google Calendar returning errors | Added null checks for missing event fields |
| Duplicate AI folders | Multiple "Executive Coach" folders created | Added cleanup logic in `fetchFolders()` |

---

#### 5. Pending Items

| Item | Priority | Notes |
|------|----------|-------|
| Push migration for list/section names | High | Run `npx supabase db push` then sync |
| Focus session persistence to DB | Medium | Currently in-memory only |
| "Get task started" AI prompt | Medium | Collapsible section with task kickoff help |
| Focus cues system | Low | AI-driven attention reminders |
| Journal screen | High | Next major screen to build |
| Meeting screen | High | Transcription + real-time coaching |

---

#### 6. Final System State

**Working:**
- ✅ About Me file upload and storage
- ✅ Agent instructions (per-agent custom prompts)
- ✅ Agent memory viewing
- ✅ Screen-aware agent switching
- ✅ Focus Screen with full task list
- ✅ AI task analysis (time estimates, prioritization)
- ✅ Focus Note Editor with note picker
- ✅ Focus Calendar Widget
- ✅ Focus Timer (task + session)
- ✅ Meeting note creation from events

**Needs Migration Push:**
- 🔄 TickTick list/section name fields

**Next Session:**
1. Push pending migrations
2. Test TickTick sync for list/section display
3. Journal screen build
4. Meeting screen build

---

*End of December 17-19, 2025 session*

---

## Session: December 20-21, 2025

### Session Reference Info
- **Date:** December 20-21, 2025
- **Approximate Duration:** ~10 hours across 2 days
- **Week/Day:** Week 6-7
- **Build Plan Goals:** Journal Screen Build, Focus Cue System, E2EE Implementation

---

### What We Set Out To Do

1. **Journal Screen build** - Full journaling experience with encrypted entries
2. **Focus Cue System** - ADHD-informed attention reminders during focus sessions
3. **End-to-end encryption** for journal entries (client-side)
4. **Photo EXIF parsing** for automatic location extraction

---

### Change Log Summary

| Category | Change | Files |
|----------|--------|-------|
| **Journal** | Journal page with date navigation | `app/(authenticated)/journal/page.tsx` |
| **Journal** | Journal Composer component | `components/journal/journal-composer.tsx` |
| **Journal** | E2EE encryption library | `lib/journal/encryption.ts` |
| **Journal** | EXIF parser for photo geolocation | `lib/journal/exif-parser.ts` |
| **Journal** | Journal API endpoint | `app/api/journal/route.ts` |
| **Focus** | Focus Cue type definitions | `lib/focus/cue-types.ts` |
| **Focus** | Focus Cue templates (8 cue types) | `lib/focus/cue-templates.ts` |
| **Focus** | Focus Cue evaluation engine | `lib/focus/cue-engine.ts` |
| **Focus** | Focus Cue popup component | `components/focus/focus-cue-popup.tsx` |
| **UI** | Calendar component v9 compatibility | `components/ui/calendar.tsx` |

---

### Daily Summary

#### 1. Completed Tasks Summary

**December 20: Journal Screen Core**
- ✅ Journal page with date navigation (prev/next day, calendar picker)
- ✅ Three-section journal structure (Happened, Feelings, Grateful)
- ✅ Mood selector with 12 emotional states
- ✅ Energy rating slider (1-10)
- ✅ Tag system with suggestions from previous entries
- ✅ Photo upload with EXIF geolocation extraction
- ✅ Location field (manual entry + auto from photo)
- ✅ Auto-save with unsaved changes indicator

**December 21: E2EE + Focus Cues**
- ✅ Client-side E2EE for journal entries (AES-256-GCM)
- ✅ Passphrase-based encryption with PBKDF2 key derivation
- ✅ Focus Cue system with 8 cue types
- ✅ ADHD-informed variable intervals (prevents habituation)
- ✅ Cue popup with gentle visual design
- ✅ Snooze and action handling

---

#### 2. Completed Tasks Drill-Down

##### 2a. Journal Screen Build (~4 hours)

**What was built:**
- Date-based navigation with URL state (`/journal?date=2025-12-21`)
- Calendar picker showing which dates have entries (bold + underlined)
- Future date blocking (can only journal today or past)
- Three-section layout matching PRD:
  - **What happened today?** - freeform text
  - **How are you feeling?** - freeform text + AI mood inference
  - **What are you grateful for?** - freeform text

**Mood options:**
| Positive | Neutral | Challenging |
|----------|---------|-------------|
| Calm 😌 | Unfocused 🌀 | Stressed 😰 |
| Creative ✨ | Acceptance 🙏 | Threatened 😨 |
| Adventurous 🚀 | | Rejected 😔 |
| Socially Connected 💛 | | Angry 😤 |
| Romantic 💕 | | Manic ⚡ |

**Tags feature:**
- Freeform tag input with suggestions from previous entries
- Visual tag badges with remove button
- Persisted across sessions for quick tagging

---

##### 2b. Photo Upload + EXIF Parsing (~1.5 hours)

**What was built:**
- Photo upload with preview
- Native EXIF parser (no external dependencies)
- Automatic GPS coordinate extraction
- Reverse geocoding for human-readable location names
- Date taken extraction from EXIF

**EXIF parsing flow:**
```
1. User selects photo
2. Read file as ArrayBuffer
3. Parse JPEG markers for APP1 (EXIF)
4. Extract GPS coordinates (DMS → decimal degrees)
5. Reverse geocode via Nominatim API
6. Auto-populate location field
```

**Supported data:**
- Latitude/Longitude (from GPS tags)
- Date taken (for potential date correction)
- Location name (via reverse geocoding)

---

##### 2c. End-to-End Encryption (~2 hours)

**What was built:**
- Client-side encryption using Web Crypto API
- AES-256-GCM for symmetric encryption
- PBKDF2 key derivation (100,000 iterations)
- Passphrase-based key management

**Encryption flow:**
```
First time setup:
1. User enters passphrase
2. Generate random salt
3. Derive key via PBKDF2
4. Store encrypted key + salt in localStorage
5. Store passphrase hash for verification

Encrypting entry:
1. Verify encryption initialized
2. Get key from localStorage
3. Generate random IV (96 bits)
4. Encrypt content with AES-GCM
5. Prepend IV to ciphertext
6. Base64 encode for storage

Decrypting entry:
1. Prompt for passphrase (if not cached)
2. Verify against stored hash
3. Extract IV from ciphertext
4. Decrypt with AES-GCM
5. Display plaintext
```

**Database schema:**
```sql
encrypted_happened text,   -- AES-GCM encrypted
encrypted_feelings text,   -- AES-GCM encrypted
encrypted_grateful text,   -- AES-GCM encrypted
-- Location/mood/tags NOT encrypted (needed for analytics)
```

---

##### 2d. Focus Cue System (~2.5 hours)

**What was built:**
- 8 ADHD-informed cue types with variable intervals
- Context-aware cue evaluation engine
- Gentle popup UI with pastel gradients
- Snooze functionality with configurable duration

**Cue types and triggers:**

| Cue Type | Trigger | Purpose |
|----------|---------|---------|
| `session_milestone` | 15/30/45/60 min focused | Celebrate progress |
| `break_reminder` | After 45+ min sustained | Prevent burnout |
| `tab_return` | Return from distraction | Welcome back, refocus |
| `task_progress` | Every 15 min on task | Check-in, keep momentum |
| `energy_check` | 11am, 2pm, 4pm | Time-of-day awareness |
| `encouragement` | Random during focus | Dopamine boost |
| `getting_started` | <5 min task progress | Overcome initiation |
| `completion_nudge` | Task >80% estimated time | Push toward finish |

**Cooldown system:**
```typescript
GLOBAL_CUE_COOLDOWN = 90;  // 1.5 min minimum between ANY cue

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

**ADHD-specific design decisions:**
- Variable intervals with jitter (prevents pattern habituation)
- Back-off after 3+ dismissals (respect user flow state)
- Positive framing only (no shame, no urgency)
- Soft colors and gentle animations (not jarring)
- Quick snooze option (low friction)

---

#### 3. Key Learnings

##### Technical Learnings

| Concept | What I Learned |
|---------|----------------|
| **Web Crypto API** | Native AES-GCM encryption with PBKDF2 key derivation; no external libs needed |
| **EXIF parsing** | JPEG files store GPS in APP1 segment; coordinates in DMS format need conversion |
| **Reverse geocoding** | Nominatim API (OpenStreetMap) is free for low-volume use |
| **react-day-picker v9** | Breaking changes from v8; uses `Chevron` component, different className patterns |
| **Variable intervals** | Adding 20% jitter to cooldowns prevents ADHD brains from habituating to patterns |

##### ADHD-Specific Observations

- **Three-section structure works** - Less overwhelming than blank page
- **Mood override important** - AI inference is helpful but user needs final say
- **Tags build over time** - Suggestions reduce cognitive load for categorization
- **Cue backs-off after dismissals** - Respects when user is in flow state

---

#### 4. Pending Items

| Item | Priority | Notes |
|------|----------|-------|
| AI mood inference | Medium | Call Pattern Analyst to classify mood from text |
| Energy blending | Medium | Combine Whoop recovery with journal energy |
| Cue effectiveness tracking | Low | Log which cues lead to positive outcomes |
| Photo storage to Supabase Storage | Medium | Currently URLs only; need actual upload |
| Meeting screen build | High | Next major screen |

---

#### 5. Final System State

**Working:**
- ✅ Journal screen with date navigation
- ✅ Three-section journal composer
- ✅ Mood selector (12 options)
- ✅ Energy rating (1-10)
- ✅ Tag system with suggestions
- ✅ Photo upload with EXIF geolocation
- ✅ Client-side E2EE (AES-256-GCM)
- ✅ Focus Cue system (8 cue types)
- ✅ Cue popup with gentle UI
- ✅ Variable interval cooldowns

**Not Yet Implemented:**
- ❌ AI mood inference from text
- ❌ Photo storage (currently URL references only)
- ❌ Cue effectiveness analytics

**Next Session:**
1. Meeting screen build
2. AI mood inference integration
3. Photo upload to Supabase Storage

---

*End of December 20-21, 2025 session*