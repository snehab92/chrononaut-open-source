# Chrononaut Changelog

A detailed log of development sessions, learnings, and progress.

---

## Session: December 1, 2025

### Session Reference Info
- **Date:** December 1, 2025
- **Approximate Duration:** ~4.5 hours
- **Week/Day:** Week 1, Day 1
- **Build Plan Goals:** Database Schema, Auth Enhancement, App Shell

---

### What I Set Out To Do

Per Build Plan v3, Week 1 goals:
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
