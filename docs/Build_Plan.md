# Chrononaut: Week By Week Build Plan

**Version:** 1.0 (MVP)

**Last Updated:** December 1, 2025

**Timeline:** 10 weeks @ 6 hours/day

**Status:** Ready to Execute

---

## Tool Efficiency Map

| Tool | Use | Time Savings |
| --- | --- | --- |
| **Vercel Supabase Starter** | Pre-configured Next.js 15 + Auth + shadcn/ui | ~3 days |
| **v0.dev** | Natural language → React components | UI 10x faster |
| **Cursor + MCP** | AI coding with DB context | Backend 3-5x faster |
| **Supabase CLI** | Migration-based schema | Safe DB changes |
| **Vercel AI SDK** | Unified Claude + Gemini interface | No provider boilerplate |

---

## Pre-Development Setup (Day 0)

### 1. Deploy Starter Template

```bash
# One-click: https://vercel.com/templates/next.js/supabase# Creates: GitHub repo, Supabase project, Vercel deploy, env vars
```

### 2. Local Setup

```bash
git clone https://github.com/YOUR_USERNAME/chrononaut.git
cd chrononaut && npm install
npx supabase login && npx supabase link --project-ref YOUR_REF
npm run dev
```

### 3. Cursor Rules (.cursor/rules/chrononaut.mdc)

```markdown
# Tech Stack- Next.js 15 App Router, TypeScript strict, shadcn/ui
- Supabase for all backend
- Vercel AI SDK for Claude + Gemini
# Patterns- Server Components default
- Client Components for interactivity only
- Streaming for AI responses
# AI Agents (4 total)- Pattern Analyst (Claude Sonnet): background analysis
- Executive Coach (Claude Sonnet): interactive coaching
- Research Assistant (Gemini Flash): speed tasks
- Communications Coach (Gemini Flash): voice only
```

---

## Week-by-Week Plan

---

### Week 1: Database + Auth + Shell

**Goal:** Complete schema, auth flow, app navigation

### Day 1-2: Database Schema

```bash
npx supabase migration new initial_schema
```

**Tables (from PRD):**
- profiles (with core_values[], encryption_key_hash, pin_hash)
- notes (with assessment_type, assessment_score)
- time_blocks, tasks
- journal_entries (with mood_label, energy_rating, override flags)
- health_metrics, meeting_notes
- ai_insights, cue_rules, cue_instances
- integration_tokens, audit_log

```
Create Supabase migration from CHRONONAUT_PRD_v3.md section 5.2. Include:
- All tables with exact field names
- Indexes for common queries
- RLS policies (users own their data)
- Check constraints on ratings/scores
```

### Day 3: Auth Enhancement

- Profile creation trigger on signup
- Onboarding redirect if not completed
- Protected route middleware

### Day 4-5: App Shell + Global Menu

**v0 prompt:**

```
Next.js app shell with:
- Sidebar nav (collapsible mobile)
- Top bar with avatar
- Global action menu (top-left, floating): Notes, Focus, Meeting, Journal icons + Task overlay
- Task overlay: right slide-over, Title/Due/Priority/List fields
- Keyboard shortcuts: Cmd+N/F/M/J/T
- shadcn/ui, dark mode
```

**Deliverables:**
- [ ] 12 tables created with RLS
- [ ] Auth flow working
- [ ] App shell with navigation
- [ ] Global action menu functional

---

### Week 2: TickTick Integration + Tasks

**Goal:** Bidirectional task sync

### Day 1-2: OAuth Flow

```
Create TickTick OAuth:
1. /api/integrations/ticktick/callback
2. Store encrypted tokens
3. Settings UI to connect/disconnect
4. Token refresh logic
```

### Day 3-4: Sync Engine

```
Bidirectional TickTick sync:
1. Pull tasks on connect + every 15 min
2. Push completions back
3. Handle conflicts (last-write-wins)
4. Track sync_status per task
```

### Day 5: Smart Task View

**v0 prompt:**

```
Task list with Today/Week toggle, priority dots, time estimates, drag-to-reorder. Empty state for no tasks or disconnected.
```

**Deliverables:**
- [ ] TickTick OAuth working
- [ ] Tasks syncing bidirectionally
- [ ] Smart task view functional
- [ ] Quick task creates in TickTick

---

### Week 3: Notes Screen + Focus Foundation

**Goal:** Notes CRUD with assessments, Focus shell

### Day 1-3: Notes Screen

**v0 prompt:**

```
Master-detail notes:
- Left: search, filter chips (Meeting/Document/Spec/Research/Assessment), note list
- Right: rich editor, title, type dropdown, tags
- Assessment type shows structured template based on assessment_type
- Autosave, 10s undo on delete
```

**Assessment Templates:**
- Self-Compassion: 5 questions × 1-10, auto-total, reflection
- Values Alignment: 3 values × 0-100%, evidence per value, auto-average

### Day 4-5: Focus Screen Shell

**v0 prompt:**

```
Full-screen focus mode:
- Header: time, mode selector (Admin/Research/Writing/Meeting Prep/Toastmasters), exit
- Center: task title, large timer
- Controls: Pause, Complete, Switch, End
- Task drawer from right
- Collapsible AI chat panel (right)
```

**Deliverables:**
- [ ] Notes CRUD complete
- [ ] Assessment templates working
- [ ] Assessment scores saved
- [ ] Focus screen full-screen mode
- [ ] Timer functional

---

### Week 4: Whoop + Dashboard Analytics

**Goal:** Health data + 4-card metrics grid

### Day 1-2: Whoop OAuth + Sync

```
Whoop integration:
1. OAuth flow
2. Daily cron (6 AM) for recovery, HRV, sleep, strain
3. Store in health_metrics
```

### Day 3-5: Analytics Panel (4-Card Grid)

**v0 prompt:**

```
Dashboard analytics panel matching prototype:
- 2x2 card grid, rounded corners, icons
- Top-left: Energy (0-100%), battery icon, ↑↓ trend arrow
- Top-right: Mood (label from enum), heart icon, → arrow
- Bottom-left: Self-Compassion (X/10), shield icon, ↑↓ trend
- Bottom-right: Values Alignment (0-100%), target icon, ↑↓ trend
- Click card expands to trend chart
```

**Calculation functions:**

```tsx
// lib/metrics/energy.tsexport async function calculateEnergy(userId: string): Promise<number> {
  const whoop = await getWhoop7DayAvg(userId); // 0-100  const journalEnergy = await getJournalEnergy7DayAvg(userId); // 1-10  return (whoop * 0.6) + (journalEnergy * 10 * 0.4);}
// lib/metrics/self-compassion.tsexport async function calculateSelfCompassion(userId: string): Promise<number> {
  const assessment = await getLatestAssessment(userId, 'self_compassion');  const adjustment = await analyzeLanguagePatterns(userId); // -1 to +1  return Math.min(10, Math.max(1, assessment.score + adjustment));}
// lib/metrics/values-alignment.tsexport async function calculateValuesAlignment(userId: string): Promise<number> {
  const assessment = await getLatestAssessment(userId, 'values_alignment');  const { aligned, total } = await countValuesMentions(userId);  return (assessment.score / 100) * (aligned / total) * 100;}
```

**Deliverables:**
- [ ] Whoop OAuth working
- [ ] Health data syncing daily
- [ ] 4-card grid matching prototype
- [ ] Energy calculation from Whoop + journal
- [ ] Self-Compassion from assessment + language
- [ ] Values Alignment from assessment + mentions
- [ ] Trend arrows working

---

### Week 5: AI Integration (4 Agents)

**Goal:** Claude + Gemini connected, pattern analysis

### Day 1-2: Vercel AI SDK Setup

```tsx
// lib/ai/agents.tsimport { anthropic } from '@ai-sdk/anthropic';import { google } from '@ai-sdk/google';export const patternAnalyst = anthropic('claude-3-5-sonnet-20241022');export const executiveCoach = anthropic('claude-3-5-sonnet-20241022');export const researchAssistant = google('gemini-2.0-flash');export const communicationsCoach = google('gemini-2.0-flash');
```

**System prompts (from PRD 4.3.2):**
- Executive Coach: DBT/ACT trained, ADHD-experienced, direct + warm
- Pattern Analyst: Technical, data-focused
- Research Assistant: Fast, summarization-oriented
- Communications Coach: Speech coaching focus

### Day 3-4: Pattern Analysis Engine

```
Create pattern analysis:
1. Daily cron analyzes: journals, health, tasks, cue interactions
2. Calculates: energy, mood classification, self-compassion adjustment
3. Stores in ai_insights table
4. Exposes via API for dashboard
```

**Mood classification prompt:**

```
Analyze this journal entry and classify the mood as exactly one of:
Threatened, Stressed, Unfocused, Rejected, Creative, Adventurous,
Angry, Manic, Calm, Content, Socially Connected, Romantic

Entry: {entry_text}

Respond with only the mood label.
```

### Day 5: AI Chat Drawer

**v0 prompt:**

```
Slide-over chat drawer (40% width):
- Message list with user/assistant bubbles
- Streaming indicator
- Context badge showing active agent
- Cmd+/ toggle from anywhere
```

**Deliverables:**
- [ ] Claude API connected
- [ ] Gemini API connected
- [ ] 4 agent prompts configured
- [ ] Pattern analysis cron running
- [ ] Mood classification working
- [ ] Chat drawer functional

---

### Week 6: Journal Screen (Day One Style)

**Goal:** Beautiful journal with AI-inferred mood/energy

### Day 1-2: Entry Composer

**v0 prompt:**

```
Journal composer (Day One style):
- Date header, location pill (auto + editable)
- Large photo drop zone with EXIF parsing
- Three stacked text areas: happened, feelings, grateful
- Tag chips with typeahead
- AI-Inferred section: Mood dropdown (12 options), Energy dropdown (1-10)
- Both show "Pending..." until AI runs
- User can override after AI inference
- Encryption badge, Get Insights button
- Autosave every 30s
```

### Day 3: AI Inference on Save

```tsx
// On save or "Get Insights":async function inferMoodEnergy(entryId: string) {
  const entry = await getDecryptedEntry(entryId);  const combined = `${entry.happened}\n${entry.feelings}\n${entry.grateful}`;  const [mood, energy] = await Promise.all([
    patternAnalyst.classifyMood(combined),    patternAnalyst.inferEnergy(combined)
  ]);  await updateEntry(entryId, {
    mood_label: mood,
    energy_rating: energy,    mood_override: false,    energy_override: false  });}
```

### Day 4: E2E Encryption

```
Client-side encryption:
1. First journal access → prompt for passphrase
2. Passphrase → PBKDF2 → AES-256-GCM key
3. Store key hash in profiles
4. Encrypt before save, decrypt after fetch
5. PIN option for subsequent access (WebAuthn)
```

**AI + Encryption Flow:**

```tsx
async function getInsights(entryId: string) {
  // 1. Fetch encrypted  const encrypted = await supabase.from('journal_entries').select('*').eq('id', entryId);  // 2. Decrypt client-side  const plaintext = await decrypt(encrypted, userKey);  // 3. Send plaintext to AI (HTTPS)  const insight = await executiveCoach.analyze(plaintext);  // 4. Encrypt insight  const encryptedInsight = await encrypt(insight, userKey);  // 5. Store encrypted  await supabase.from('journal_entries').update({
    encrypted_ai_insights: encryptedInsight
  }).eq('id', entryId);}
```

### Day 5: Journal Views

**v0 prompt:**

```
Journal views with tabs: Calendar, Map, List, Gallery
- Calendar: month grid, photo thumbnails on entry days
- Map: pins at locations (react-map-gl), click to open
- List: reverse-chronological cards
- Gallery: masonry photo grid

Filter panel: tags, date range, has photo, mood (multi-select), energy range
Saved filters: Travel, Work Weeks, High-Energy Days
```

**Deliverables:**
- [ ] Journal composer complete
- [ ] Photo upload with EXIF parsing
- [ ] AI-inferred mood/energy on save
- [ ] User override dropdowns working
- [ ] E2E encryption functional
- [ ] PIN secondary auth
- [ ] All 4 views working
- [ ] Filtering + saved filters

---

### Week 7: Meeting Screen + Transcription

**Goal:** Meeting notes with encrypted sensitive fields

### Day 1-2: Meeting Screen Layout

**v0 prompt:**

```
Meeting screen:
- Header: title, attendees, timer, 🔒 badge, recording dot
- Split view: Transcript (40%) | Notes (60%)
- Footer: Record toggle, Coach toggle, End button
- Templates dropdown
```

### Day 3-4: Transcription + Encryption

```
Meeting transcription:
1. Browser MediaRecorder for audio
2. Stream to Whisper/AssemblyAI
3. Display real-time transcript
4. On end: encrypt transcript, notes, summary
5. Store encrypted fields, leave metadata unencrypted
```

**Encryption mapping:**

```tsx
// Encrypted (client-side before save)encrypted_prep_notes
encrypted_meeting_notes
encrypted_transcript
encrypted_ai_summary
encrypted_coach_feedback
// Unencrypted (queryable)title, attendees, scheduled_start, scheduled_end
meeting_type, risk_level, action_items
```

### Day 5: Post-Meeting AI

```
Post-meeting processing:
1. Decrypt transcript + notes
2. Send to Executive Coach for summary
3. Extract action items → create TickTick tasks
4. If coach_enabled, generate coach_feedback
5. Encrypt all AI outputs before storage
```

**Deliverables:**
- [ ] Meeting screen with split view
- [ ] Audio recording functional
- [ ] Real-time transcription
- [ ] E2E encryption for sensitive fields
- [ ] Post-meeting summary generating
- [ ] Action items → TickTick tasks

---

### Week 8: Focus Polish + Voice Mode

**Goal:** Focus sub-modes with agents, Gemini voice

### Day 1-2: Focus Mode Agents

```tsx
// Focus screen routes to different agents based on modeconst agentForMode = {
  admin: researchAssistant,      // Gemini - quick tasks  research: researchAssistant,   // Gemini - web search  writing: executiveCoach,       // Claude - structure help  meeting_prep: executiveCoach,  // Claude - context briefing  toastmasters: communicationsCoach // Gemini - voice};
```

### Day 3-4: Toastmasters Voice Mode

```
Gemini voice implementation:
1. Gemini 2.0 Flash with audio streaming
2. Push-to-talk (hold space)
3. Real-time transcription both sides
4. Metrics: filler words, pace, interruptions
5. Post-session summary
```

**v0 prompt:**

```
Toastmasters voice screen:
- Large microphone button (animated when recording)
- Waveform visualizer
- Split: Your transcript | Coach transcript
- Metrics panel: Filler count, pace indicator
- End session → summary with improvement tips
```

### Day 5: Cue System

```
Cue system:
1. Evaluation engine (every minute during focus)
2. Check cue_rules against state
3. Fire toast notification (bottom-right)
4. Log to cue_instances with response
```

**Deliverables:**
- [ ] Admin mode with Gemini
- [ ] Research mode with web search
- [ ] Writing mode with Claude
- [ ] Meeting Prep mode with context
- [ ] Voice mode functional
- [ ] Cue system firing
- [ ] Cue interactions logging

---

### Week 9: Polish + Wind-Down

**Goal:** GCal direct sync, wind-down ritual, edge cases

### Day 1-2: Google Calendar

```
Google Calendar integration:
1. OAuth flow
2. Webhook for real-time updates
3. Drag-to-reschedule on calendar view
```

### Day 3: Wind-Down Ritual

**v0 prompt:**

```
Wind-down modal:
- Appears at configured time (default 6 PM)
- Shows: incomplete high-priority tasks, journal status
- CTA: Start Journal or Review Tasks
- Snooze (30 min, max 2)
- Dismisses when journal logged
- Calming design
```

### Day 4-5: Edge Cases

- Offline: queue mutations
- Token expiry: auto-refresh
- API errors: friendly messages
- Encryption key lost: clear messaging

**Deliverables:**
- [ ] GCal OAuth working
- [ ] Webhooks receiving events
- [ ] Wind-down modal functional
- [ ] Offline handling
- [ ] Error states graceful

---

### Week 10: Test + Launch

**Goal:** QA, docs, deploy

### Day 1-2: E2E Testing

Test all flows:
- [ ] Signup → Connect integrations
- [ ] Assessment → Dashboard metrics update
- [ ] Journal → AI infers mood/energy
- [ ] Meeting → Transcription → Encrypted storage
- [ ] Focus → Cues → Voice mode

### Day 3: Security Audit

- [ ]  RLS policies verified
- [ ]  Encrypted fields unreadable in DB
- [ ]  PIN lockout working
- [ ]  No sensitive data in logs

### Day 4: Documentation

- [ ]  README.md
- [ ]  DATABASE_SCHEMA.md
- [ ]  API_DOCS.md (iOS Shortcut endpoint)

### Day 5: Launch

- [ ]  Production env vars set
- [ ]  Final smoke test
- [ ]  Error monitoring enabled
- [ ]  **SHIPPED! 🚀**

---

## V0 Prompt Library

### Dashboard 4-Card Grid

```
2x2 analytics grid matching prototype:
- Energy (0-100%, battery icon, ↑↓)
- Mood (label, heart icon, →)
- Self-Compassion (X/10, shield icon, ↑↓)
- Values Alignment (0-100%, target icon, ↑↓)
Click to expand trends. shadcn/ui cards.
```

### Journal Composer

```
Day One-style journal:
- Date, location, photo drop zone
- Three text areas (happened, feelings, grateful)
- Tags, AI-inferred Mood/Energy dropdowns
- Encryption badge, Get Insights button
```

### Meeting Screen

```
Meeting with split view:
- Header: title, attendees, timer, 🔒, recording
- Left: live transcript
- Right: rich notes
- Footer: record, coach toggle, end
```

---

## Risk Mitigation

| Risk | Mitigation |
| --- | --- |
| Assessment not completed | Default metrics to “Complete assessment” CTA |
| AI inference wrong | User override dropdowns |
| Voice latency | Fallback to text-only |
| Encryption complexity | Proven libraries, extensive testing |

---

## Success Criteria

### Week 5 Checkpoint

- [ ]  4 metrics displaying on dashboard
- [ ]  AI chat working with correct agent per context
- [ ]  Assessments saving scores

### Week 8 Checkpoint

- [ ]  Journal AI-inferring mood/energy
- [ ]  Meeting encryption working
- [ ]  Voice mode functional

### Week 10 Launch

- [ ]  All flows working
- [ ]  Using it daily myself
- [ ]  **SHIPPED!**

---

*This build plan is a living document.*