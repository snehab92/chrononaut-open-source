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

---

## Session: December 23, 2025

### Session Reference Info
- **Date:** December 23, 2025
- **Approximate Duration:** ~6 hours
- **Week/Day:** Week 7
- **Build Plan Goals:** AI Agents Complete Implementation, Token Efficiency Architecture

---

### What We Set Out To Do

1. **Complete AI Agents Implementation** - Pattern Analyzer, Research Assistant, Executive Coach, Therapist
2. **Context Architecture** - 5-layer context system for agent personalization
3. **Token Efficiency** - Stay under $30/month budget with model selection + caching
4. **Multi-step Workflows** - Research Assistant agentic tool execution
5. **Scheduled Jobs** - Vercel Cron for morning insights and weekly reviews

---

### Change Log Summary

| Category | Change | Files |
|----------|--------|-------|
| **Migration** | Token tracking tables (token_usage, token_usage_daily, ai_response_cache, computed_patterns, context_summaries) | `supabase/migrations/20251223173800_token_efficiency.sql` |
| **AI** | Model selector with Haiku/Sonnet task-based routing | `lib/ai/model-selector.ts` |
| **AI** | Context architecture with 5 layers | `lib/ai/context/types.ts`, `lib/ai/context/budget.ts`, `lib/ai/context/cache.ts` |
| **AI** | Agent-specific context builders | `lib/ai/context/builders/base-builder.ts` |
| **AI** | 7 tools for multi-step workflows | `lib/ai/tools/index.ts` |
| **AI** | Morning insight workflow | `lib/ai/workflows/morning-insight.ts` |
| **AI** | Multi-step orchestrator | `lib/ai/orchestrator.ts` |
| **API** | Morning insight endpoint | `app/api/ai/agents/pattern-analyzer/morning-insight/route.ts` |
| **API** | Research assistant execute endpoint | `app/api/ai/agents/research-assistant/execute/route.ts` |
| **API** | Updated chat route with caching + model selection | `app/api/chat/route.ts` |
| **Cron** | Vercel cron configuration | `vercel.json` |
| **Cron** | Morning insight cron route | `app/api/cron/morning-insight/route.ts` |
| **Cron** | Weekly review cron route | `app/api/cron/weekly-review/route.ts` |
| **UI** | Compass section wired to backend | `components/dashboard/metrics/compass-section.tsx` |
| **Deps** | Added missing npm packages | `package.json` |

---

### Daily Summary

#### 1. Completed Tasks Summary

- ✅ Complete AI agents architecture with 4 agents
- ✅ 5-layer context system (Static, Persistent, Conversational, Live, Reference)
- ✅ Hybrid Haiku/Sonnet model selection based on task complexity
- ✅ Token budget management with usage tracking
- ✅ Response caching for repetitive queries
- ✅ 7 tools for Research Assistant (read_notes, write_note, search_notes, analyze_patterns, get_context, create_task, read_folder)
- ✅ Multi-step orchestrator for agentic workflows
- ✅ Morning insight workflow for Pattern Analyzer
- ✅ Vercel Cron scheduled jobs (7am daily, 9am Sunday)
- ✅ Dashboard Compass section connected to backend
- ✅ Build fixes for TypeScript and dependency issues

---

#### 2. Completed Tasks Drill-Down

##### 2a. Model Selection Strategy (~1 hour)

**What was built:**
- Task-type to model mapping in `lib/ai/model-selector.ts`
- Haiku for simple tasks (mood inference, task estimates, quick start)
- Sonnet for complex tasks (coaching sessions, weekly reviews, therapy)
- Automatic escalation: simple-chat upgrades to Sonnet after 4 messages

**Model routing:**
| Task Type | Model | Max Input | Max Output | Cacheable |
|-----------|-------|-----------|------------|-----------|
| mood-inference | Haiku | 1,500 | 100 | ✅ 24hr |
| task-time-estimate | Haiku | 800 | 200 | ✅ 1hr |
| quick-start | Haiku | 600 | 400 | ❌ |
| simple-chat | Haiku→Sonnet | 1,000 | 600 | ❌ |
| daily-insight | Sonnet | 4,000 | 1,000 | ✅ 12hr |
| coaching-session | Sonnet | 3,000 | 1,200 | ❌ |

**Estimated monthly cost: ~$6** (well under $30 budget)

---

##### 2b. Context Architecture (~2 hours)

**5-layer context model:**

| Layer | Source | TTL | Purpose |
|-------|--------|-----|---------|
| Static | agents.ts + agent_instructions | ∞ | Base agent personality |
| Persistent | about_me_files + saved memories | 1hr | User background |
| Conversational | ai_messages history | Session | Chat continuity |
| Live | Whoop, tasks, calendar, journal | 1-10min | Real-time context |
| Reference | Notes, folders | On-demand | Retrieved documents |

**Agent-specific configurations:**
```typescript
"pattern-analyst": { layers: { static, live: ['journal_history', 'health_trends', 'task_patterns'] } }
"research-assistant": { layers: { static, persistent, conversational, reference: ['notes', 'folders'] } }
"executive-coach": { layers: { static, persistent, conversational, live: ['todays_tasks', 'calendar', 'recovery'] } }
"therapist": { layers: { static, persistent, conversational, live: ['journal_recent', 'mood_patterns'] } }
```

---

##### 2c. Token Budget Management (~30 min)

**What was built:**
- Token estimation (~4 chars per token)
- Usage tracking in `token_usage` and `token_usage_daily` tables
- Budget alerts at 70%/90%/100% thresholds
- Context pruning by priority when over budget

**Database stored procedure:**
```sql
update_daily_usage(user_id, date, agent_type, input_tokens, output_tokens, cost, cached)
```

---

##### 2d. Response Caching (~30 min)

**What was built:**
- Database-backed cache with TTL
- Cache key = hash of (task_type + context)
- `X-Cache: HIT/MISS` response headers
- Automatic cleanup of expired entries

**Cache hit scenario:**
1. User requests morning insight
2. Check cache for today's insight
3. If found and not expired → return cached (0 tokens)
4. If not found → generate, cache, return

---

##### 2e. Tools Implementation (~1 hour)

**7 tools for Research Assistant:**

| Tool | Description | Returns |
|------|-------------|---------|
| `read_notes` | Read notes by ID or title | Note content as markdown |
| `read_folder` | Read all notes in folder | Multiple notes concatenated |
| `write_note` | Create/update note | Success + note ID |
| `search_notes` | Search by query/tags/date | Matching notes list |
| `analyze_patterns` | Analyze user patterns | Pattern summary markdown |
| `get_context` | Fetch comprehensive context | Health, tasks, calendar, journal |
| `create_task` | Create task in Supabase | Success + task ID |

---

##### 2f. Multi-Step Orchestrator (~30 min)

**What was built:**
- `executeAgentWorkflow()` function in `lib/ai/orchestrator.ts`
- MAX_ITERATIONS = 10 (prevents runaway loops)
- Parses AI JSON responses for tool calls
- Executes tools in sequence, feeds results back
- Continues until AI returns final response

**Example workflow:**
```
Goal: "Review networking notes and identify action items"
Step 1: AI calls read_folder("networking")
Step 2: Tool returns note contents
Step 3: AI analyzes and responds with action items
```

---

##### 2g. Morning Insight Workflow (~30 min)

**What was built:**
- `generateMorningInsight()` in `lib/ai/workflows/morning-insight.ts`
- Gathers: health_metrics, tasks, calendar_events, journal_entries
- Generates insight with recommendations and focus theme
- Stores in `ai_insights` table

**Output structure:**
```typescript
{
  summary: string,
  recommendations: string[],
  energyOptimalTasks: string[],
  focusTheme: string,
  recoveryScore: number
}
```

---

##### 2h. Vercel Cron Setup (~20 min)

**Configuration:**
```json
{
  "crons": [
    { "path": "/api/cron/morning-insight", "schedule": "0 12 * * *" },
    { "path": "/api/cron/weekly-review", "schedule": "0 14 * * 0" }
  ]
}
```
(Times in UTC: 12 UTC = 7am EST, 14 UTC Sunday = 9am EST)

**Security:** Routes verify `Authorization: Bearer ${CRON_SECRET}` header.

---

##### 2i. Build Fixes (~1.5 hours)

**Issues encountered and fixed:**

| Issue | Root Cause | Solution |
|-------|------------|----------|
| Missing npm packages | Packages used but not in package.json | Added: ai, @ai-sdk/anthropic, @tiptap/*, @radix-ui/react-popover, react-day-picker, @tailwindcss/typography |
| TipTap version conflict | v2.x vs v3.x mismatch | Updated to ^3.0.0 |
| `maxOutputTokens` error | AI SDK v4 uses `maxTokens` | Changed property name |
| PromiseLike type error | Supabase `.then()` returns PromiseLike not Promise | Wrapped in `async () => { ... }()` |
| TypeScript strict errors | Missing type annotations | Added explicit `Record<string, unknown>` casts |

---

#### 3. Key Architectural Decisions

##### Why We Didn't Implement RAG (Vector Search)

**What RAG would provide:**
1. Embed documents into vectors
2. Store in vector database (pgvector, Pinecone, etc.)
3. At query time, semantic similarity search
4. Inject relevant chunks into prompt

**Why we skipped it:**

| RAG Pattern | Our Approach |
|-------------|--------------|
| Embed documents → vector DB | Store structured data in Supabase tables |
| Semantic similarity search | SQL queries with filters (date, type, tags) |
| Retrieve top-k similar chunks | Fetch recent/relevant records directly |

**Reasons:**

1. **Data is structured, not documents** - Journal entries, tasks, health metrics have clear schemas. SQL is more precise than vector similarity for "get my tasks due today."

2. **Scale doesn't warrant it** - RAG shines with thousands of documents. Personal productivity data is manageable with direct queries.

3. **Context windows are huge** - Claude's 200k token window means we can include substantial context without retrieval overhead.

4. **Determinism matters** - SQL returns predictable results. Vector search returns "similar" results which can be inconsistent.

**When to add RAG later:**
- Hundreds of notes where keyword search fails
- External documents (PDFs, articles) to query
- "Find everything I've written about X concept" across all data

---

##### Why We Didn't Use LangChain

**What LangChain provides:**
- Model switching abstractions
- Chain compositions
- Memory management
- Tool/agent patterns
- Prompt templates

**Why we built custom instead:**

| LangChain Feature | Our Implementation |
|-------------------|-------------------|
| Model switching | `model-selector.ts` - 15-line config object |
| Chains (multi-step) | `orchestrator.ts` - ~80 line loop |
| Memory | Supabase `ai_messages` + context builders |
| Tools/Agents | `tools/index.ts` - Tool definitions with execute functions |
| Caching | `cache.ts` - Simple key-value with TTL |

**Reasons:**

1. **Less abstraction** - When something breaks, debug your code, not framework internals.

2. **Smaller bundle** - LangChain adds significant dependencies.

3. **Tailored to our data** - Context builders know our exact schema. Generic framework needs configuration.

4. **Stability** - LangChain changes frequently. Our code is self-contained.

**The core insight:** AI frameworks mostly provide:
```typescript
while (not done):
    response = call_llm(prompt + context)
    if response.has_tool_call:
        result = execute_tool(response.tool)
        context += result
    else:
        done = True
```

That's ~80 lines of code. The framework becomes optional overhead.

---

#### 4. Key Learnings

##### Technical Learnings

| Concept | What I Learned |
|---------|----------------|
| **AI SDK v4** | Uses `maxTokens` not `maxOutputTokens`; `toTextStreamResponse()` for streaming |
| **Supabase promises** | `.then()` returns PromiseLike, not Promise; wrap in `async () => {}()` for proper typing |
| **Context layering** | Static + Persistent + Conversational + Live + Reference enables flexible agent personalization |
| **Model routing** | Haiku for quick tasks, Sonnet for complex - saves ~60% on costs |
| **Response caching** | 30%+ cache hit rate expected for repetitive queries (mood inference, daily insight) |

##### ADHD-Specific Observations

- **Morning insight as ritual** - Daily AI guidance creates anchoring routine
- **Task time estimates** - Reduces estimation anxiety for planning
- **Budget visibility** - Knowing costs helps prevent compulsive overuse

---

#### 5. Pending Items

| Item | Priority | Notes |
|------|----------|-------|
| Debug chat drawer null responses | High | API returns 200, streaming works, but UI shows null |
| Add CRON_SECRET to Vercel | High | Required for scheduled jobs to work |
| Test morning insight end-to-end | Medium | Need to verify full workflow |
| Weekly review workflow | Low | Cron route exists, workflow similar to morning insight |

---

#### 6. Final System State

**Working:**
- ✅ Model selection (Haiku/Sonnet routing)
- ✅ Context architecture (5 layers)
- ✅ Token budget tracking
- ✅ Response caching
- ✅ Tools for Research Assistant
- ✅ Multi-step orchestrator
- ✅ Morning insight workflow
- ✅ Vercel cron configuration
- ✅ Compass section UI wired to backend
- ✅ Build passing on Vercel

**Needs Debugging:**
- 🔄 Chat drawer showing null responses (API works, UI issue)

**Next Steps:**
1. Debug chat drawer response display
2. Add CRON_SECRET environment variable
3. Run database migration on Supabase
4. Test morning insight generation

---

*End of December 23, 2025 session*

---

## Session: December 24-25, 2025

### Session Reference Info
- **Date:** December 24-25, 2025
- **Approximate Duration:** ~14 hours across 2 days
- **Week/Day:** Week 7-8
- **Build Plan Goals:** Journal Multi-View System, Notes Folder Views, Assessment System V2, Meeting Transcription Widget

---

### What We Set Out To Do

1. **Journal Screen Multi-View System** - Transform journal from single entry view to multi-view experience
2. **Notes Folder Views** - Notion-like database, kanban, and gallery views for notes
3. **Assessment System V2** - Comprehensive assessment tracking with AI-powered analysis
4. **Meeting Transcription Widget** - Real-time transcription with speaker diarization

---

### Change Log Summary

| Category | Change | Files |
|----------|--------|-------|
| **Migration** | Folder views and templates tables | `supabase/migrations/20251224140000_folder_views_templates.sql` |
| **Migration** | Assessment trends + reminders tables | `supabase/migrations/20251225100000_assessment_trends.sql` |
| **Migration** | Assessment system V2 | `supabase/migrations/20251226100000_assessment_system_v2.sql` |
| **Migration** | Realignment actions table | `supabase/migrations/20251227100000_add_realignment_actions.sql` |
| **Journal** | Multi-view journal page with sidebar | `app/(authenticated)/journal/page.tsx` |
| **Journal** | Entry Feed View | `components/journal/views/entry-feed-view.tsx` |
| **Journal** | Photo of Day View | `components/journal/views/photo-of-day-view.tsx` |
| **Journal** | Mood Tracker View with bar charts | `components/journal/views/mood-tracker-view.tsx` |
| **Journal** | Weekly Reviews View | `components/journal/views/weekly-reviews-view.tsx` |
| **Journal** | Journal Sidebar navigation | `components/journal/journal-sidebar.tsx` |
| **Journal** | Mood bar/pie/compact charts | `components/journal/charts/*.tsx` |
| **Journal** | Entry preview modal | `components/journal/modals/entry-preview-modal.tsx` |
| **Notes** | Folder view system (index) | `components/notes/folder-view/index.tsx` |
| **Notes** | Database view with resizable columns | `components/notes/folder-view/database-view.tsx` |
| **Notes** | Kanban view with drag-and-drop | `components/notes/folder-view/kanban-view.tsx` |
| **Notes** | Gallery view for visual notes | `components/notes/folder-view/gallery-view.tsx` |
| **Notes** | View toolbar and selectors | `components/notes/folder-view/view-toolbar.tsx`, `view-selector.tsx` |
| **Notes** | Template system | `components/notes/folder-view/template-dialog.tsx`, `template-selector.tsx` |
| **Notes** | Label and folder selectors | `components/notes/folder-view/label-selector.tsx`, `folder-selector.tsx` |
| **Notes** | Export/import functionality | `components/notes/export-import-menu.tsx`, `import-dialog.tsx` |
| **Assessment** | Assessment types and utilities | `lib/assessments/types.ts`, `utils.ts`, `index.ts` |
| **Assessment** | Markdown parser for external assessments | `lib/assessments/markdown-parser.ts` |
| **Assessment** | Assessment question definitions | `lib/assessments/questions.ts` |
| **Assessment** | Dashboard assessment cards | `components/dashboard/metrics/assessment-cards/*.tsx` |
| **Assessment** | Constellation Map visualization | `components/dashboard/metrics/constellation-map.tsx` |
| **AI** | Values Alignment Score workflow | `lib/ai/workflows/values-alignment-score.ts` |
| **API** | Values alignment cron job | `app/api/cron/values-alignment/route.ts` |
| **API** | AI assessment extraction | `app/api/ai/extract-assessment/route.ts` |
| **API** | Assessment CRUD endpoints | `app/api/assessments/route.ts` |
| **API** | Journal stats endpoint | `app/api/journal/stats/route.ts` |
| **API** | Weekly reviews endpoint | `app/api/journal/weekly-reviews/route.ts` |
| **Transcription** | Meeting transcription widget | `components/transcription/MeetingTranscriptionWidget.tsx` |
| **Transcription** | BlackHole setup modal | `components/transcription/BlackholeSetupModal.tsx` |
| **Transcription** | Deepgram client | `lib/transcription/deepgram-client.ts` |
| **Transcription** | Dual audio stream capture | `lib/transcription/audio-capture.ts` |
| **Transcription** | Transcription API | `app/api/transcription/route.ts` |
| **Shared** | Date utilities | `lib/date-utils.ts` |
| **Shared** | Journal types | `lib/journal/types.ts` |
| **Shared** | Notes types | `lib/notes/types.ts` |
| **Shared** | Tiptap extensions | `lib/tiptap/*.ts` |
| **Shared** | TickTick quick-add parser | `lib/ticktick/quick-add-parser.ts` |

---

### Daily Summary

#### 1. Completed Tasks Summary

**December 24: Journal Multi-View + Notes Folder Views**
- ✅ Journal page restructured with 4 views (Entry Feed, Photo of Day, Mood Tracker, Weekly Reviews)
- ✅ Journal sidebar navigation with view switching
- ✅ Mood Tracker view with bar chart visualization (3m/6m/1y ranges)
- ✅ Photo of Day gallery view for visual journal browsing
- ✅ Weekly Reviews view with AI-generated summaries
- ✅ Entry preview modal for quick entry viewing
- ✅ Notes folder view system with Database/Kanban/Gallery modes
- ✅ Database view with sortable columns, resizable widths, multi-sort
- ✅ Kanban view with drag-and-drop support
- ✅ Gallery view for visual note browsing
- ✅ Folder templates system with AI prompt support
- ✅ View configuration persistence per folder

**December 25: Assessment System V2 + Meeting Transcription**
- ✅ In-app assessment questionnaires with wizard-style interface
- ✅ Executive Function questionnaire (36 questions, 12 skills)
- ✅ Self-Compassion questionnaire (26 questions, 6 subscales)
- ✅ Values Alignment and Strengths Profile flows
- ✅ Executive Function scores table for quarterly tracking
- ✅ Assessment reminders system (quarterly retake prompts)
- ✅ Dashboard assessment cards (Self-Compassion, Values, Strengths, Executive Function)
- ✅ Values Alignment Score AI workflow (computes "Living Aligned" 0-100 score)
- ✅ Constellation Map component for dashboard visualization
- ✅ Meeting Transcription Widget with real-time transcription
- ✅ Deepgram WebSocket integration for live speech-to-text
- ✅ Dual audio stream capture (microphone + system audio via BlackHole)
- ✅ Speaker diarization with customizable speaker labels
- ✅ AI-powered meeting summary generation
- ✅ BlackHole audio driver setup guide modal

---

#### 2. Completed Tasks Drill-Down

##### 2a. Journal Multi-View System (~3 hours)

**What was built:**
- Complete journal page refactor from single-entry to multi-view architecture
- URL-based view state (`/journal?view=mood-tracker`)
- Date navigation integrated with views

**Views implemented:**

| View | Purpose | Key Features |
|------|---------|--------------|
| Entry Feed | Daily journal writing | Date picker, composer, encryption |
| Photo of Day | Visual journal gallery | Photo grid, date overlay, click-to-view |
| Mood Tracker | Mood analytics | Bar charts, 3m/6m/1y ranges, click-to-view |
| Weekly Reviews | AI summaries | Week-by-week review cards |

**Mood Tracker visualization:**
- Bar chart showing mood distribution over time
- Color-coded by mood category (positive/neutral/challenging)
- Click any bar to see that day's full entry
- Summary stats: top 3 moods, entries with mood logged

---

##### 2b. Notes Folder Views (~4 hours)

**What was built:**
- Notion-inspired folder view system
- Three view modes: Database, Kanban, Gallery
- Per-folder view configuration storage

**Database View features:**
- Resizable columns with drag handles
- Multi-column sorting (Shift+click for secondary sort)
- Inline editing for labels, folders
- Starred notes sorting
- Column visibility toggling

**Kanban View features:**
- Grouping by label, note_type, or starred status
- Drag-and-drop between columns (planned)
- Collapsible columns
- Card previews with content snippet

**Gallery View features:**
- Visual grid of notes
- Thumbnail generation from note content
- Quick preview on hover

**Database schema:**
```sql
folder_views (
  id, user_id, folder_id, name, view_type,
  config jsonb, is_default, sort_order
)

folder_templates (
  id, user_id, folder_id, name, default_content,
  default_note_type, default_label, ai_prompt, is_active
)
```

---

##### 2c. Assessment System V2 (~4 hours)

**What was built:**
- In-app assessment questionnaires with wizard-style UI
- Executive Function: 36 questions (12 skills × 3), 1-7 Likert scale
- Self-Compassion: 26 questions (6 subscales), 1-5 Likert scale
- Values Alignment: Core values selection with behavior definitions
- Strengths Profile: 60 strengths across 5 families
- Quarterly trend tracking for Executive Function

**Assessment types and data models:**

| Assessment | Questions | Scale | Tracking |
|------------|-----------|-------|----------|
| Executive Function | 36 (12 skills × 3) | 1-7 Likert | Quarterly |
| Self-Compassion | 26 (6 subscales) | 1-5 Likert | Annual |
| Values Alignment | 3 core values + behaviors | Selection | Daily score |
| Strengths Profile | 60 strengths | P/E/F 1-5 | One-time |

**Values Alignment Score workflow:**
```typescript
computeLivingAlignedScore(userId):
  1. Load user's values assessment
  2. Fetch 30 days of journal entries (mood, energy)
  3. Fetch recent AI insights
  4. Build analysis context
  5. AI computes 0-100 alignment score
  6. Returns: score, trend, highlights, concerns, per-value scores
```

**Executive Function tracking:**
- Stores historical scores per assessment date
- 12 skill dimensions (mean of 3 questions per skill)
- Trend visualization on dashboard card

---

##### 2d. Meeting Transcription Widget (~3 hours)

**What was built:**
- Real-time meeting transcription embedded in notes
- Dual audio capture: microphone + system audio
- Speaker diarization with customizable labels
- AI-powered meeting summary generation

**Technical implementation:**

| Component | Technology | Purpose |
|-----------|------------|---------|
| Audio Capture | Web Audio API | Dual stream (mic + system) |
| System Audio | BlackHole driver | Route system audio to browser |
| Transcription | Deepgram WebSocket | Real-time speech-to-text |
| Diarization | Deepgram | Speaker identification |
| Summary | Claude Haiku | Generate meeting notes |

**Transcript format:**
```typescript
TranscriptParagraph {
  id: string,
  speaker: number,
  speakerLabel: string, // "Me", "Alice", "Bob"
  text: string,
  startTime: number,
  endTime: number
}
```

**Features:**
- Start/Stop/Pause recording controls
- Live transcript display with speaker turns
- Editable speaker labels
- Silence detection (auto-stop after 30s)
- "Summarize" button generates AI meeting notes
- Transcript saved with note (encrypted)

---

#### 3. Key Learnings

##### Technical Learnings

| Concept | What I Learned |
|---------|----------------|
| **URL-based view state** | `useSearchParams` + router.push for view persistence across navigation |
| **Resizable columns** | Document-level mousemove/mouseup listeners for smooth resize UX |
| **Multi-sort** | Array of sort rules with Shift+click to add secondary sorts |
| **Deepgram WebSocket** | Uses `linear16` encoding, 16kHz sample rate, requires API key server-side |
| **BlackHole audio** | Virtual audio driver creates loopback; must configure Multi-Output in Audio MIDI Setup |
| **Speaker diarization** | Returns speaker_id per word; aggregate into paragraphs by speaker turns |

##### QA Learnings

| Issue Found | Root Cause | Fix Applied |
|-------------|------------|-------------|
| Mood chart not rendering | Empty array on initial load | Added loading state, null check |
| Column resize jumpy | Using state updates during drag | Used refs for intermediate values |
| Speaker labels lost on reload | Not persisted to DB | Added to transcript storage |
| Deepgram connection drops | No keepalive | Added periodic ping messages |

##### Troubleshooting Log

| Issue | Symptom | Investigation | Resolution |
|-------|---------|---------------|------------|
| Journal views not switching | URL updates but view doesn't change | useEffect dependency missing | Added `viewParam` to dependency array |
| Database view column order | Columns reorder on every render | Columns derived from config on each render | Memoized column order |
| Transcription audio not captured | Silence in recording | BlackHole not set as input device | Added device selection dropdown |
| Assessment import fails | Parse error on markdown | Inconsistent frontmatter format | Added flexible YAML parser |

---

#### 4. Key Decisions Made

##### JOURNAL-004: Four-View Architecture

**Decision:** Fixed four views (Entry Feed, Photo of Day, Mood Tracker, Weekly Reviews) rather than customizable view system.

**Rationale:**
- Each view serves distinct cognitive purpose
- Reduces decision fatigue for ADHD users
- Simpler implementation than fully customizable views
- Can add views later if needed

---

##### NOTES-003: Notion-Inspired Folder Views

**Decision:** Three view types (Database, Kanban, Gallery) with per-folder configuration.

**Rationale:**
- Database view provides power-user spreadsheet-like control
- Kanban enables visual workflow (labels as columns)
- Gallery useful for notes with visual content
- Per-folder config means different views for different use cases

---

##### ASSESS-001: In-App Assessment Questionnaires

**Decision:** Build questionnaires directly into the app with wizard-style interface rather than external import.

**Rationale:**
- Seamless in-app experience without context switching
- Structured data from the start enables trend tracking
- Question-level storage allows detailed analysis
- Consistent scoring logic across assessments

---

##### TRANSCRIBE-001: Deepgram Over Whisper

**Decision:** Use Deepgram WebSocket API for real-time transcription.

**Rationale:**
- Real-time streaming (Whisper requires batch processing)
- Built-in speaker diarization
- Lower latency (<300ms)
- WebSocket API is straightforward to implement
- Pay-per-use pricing ($0.0059/min)

---

#### 5. Pending Items

| Item | Priority | Notes |
|------|----------|-------|
| Kanban drag-and-drop | Medium | Basic view works, need DnD library |
| Gallery thumbnails | Low | Currently using title/date overlay |
| Weekly review AI generation | Medium | Cron job runs, need UI trigger |
| Transcription E2EE | High | Currently unencrypted in DB |
| Assessment reminder notifications | Low | Table exists, need UI display |

---

#### 6. Final System State

**Working:**
- ✅ Journal multi-view system (4 views)
- ✅ Journal sidebar navigation
- ✅ Mood Tracker with bar charts
- ✅ Notes folder views (Database, Kanban, Gallery)
- ✅ View configuration persistence
- ✅ Folder templates
- ✅ Assessment markdown parser
- ✅ Dashboard assessment cards
- ✅ Values Alignment Score workflow
- ✅ Meeting transcription widget
- ✅ Deepgram real-time transcription
- ✅ Speaker diarization
- ✅ AI meeting summaries

**In Progress:**
- 🔄 Kanban drag-and-drop
- 🔄 Transcription encryption

**Next Steps:**
1. Add drag-and-drop to Kanban view
2. Encrypt transcription content
3. Build About Me dedicated page
4. Connect assessment reminders to UI

---

*End of December 24-25, 2025 session*