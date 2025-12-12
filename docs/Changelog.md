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
