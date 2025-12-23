# Chrononaut: Build Plan Tracker

**Version:** 1.0 (MVP)

**Last Updated:** December 22, 2025

## Final Stretch

1. AI-agent context infra: full context integration for ai-chat drawer (per agent), clear context pathways for pattern analyzer workflows in UI
2. AI-meeting widget build out: STT - Notion-like experience. (worth it also piloting live voice mode? Deepgram has this)
3. Dashboard copy clean up
4. Notebook folders rest of build out - kanban/table/graph views via toggle with filter/sort/group and multi view enabled when click notebook folder name -> navigate to pages from that view a la Notion
4. QA and get all api integrations working
5. iOS journal shortcut and full working workflow on phone web and desktop web
6. iOS snippet capture shortcut
7. Security review - RLS, e2ee, MFA and read.me creation




---
## Reading List
- Decisive, Heath Brothers
- 

---

## Tool Efficiency Map

| Tool | Use | Time Savings |
| --- | --- | --- |
| **Vercel Supabase Starter** | Pre-configured Next.js 16 + Auth + shadcn/ui | ~3 days |
| **v0.dev** | Natural language → React components | UI 10x faster |
| **Cursor + MCP** | AI coding with DB context | Backend 3-5x faster |
| **Supabase CLI** | Migration-based schema | Safe DB changes |
| **Vercel AI SDK** | Unified Claude interface | No provider boilerplate |

---

## Pre-Development Setup

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
# Tech Stack- Next.js 16 App Router, TypeScript strict, shadcn/ui
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

## By Module - Plan

---

### Database + Auth + Shell

**Goal:** Complete schema, auth flow, app navigation

### Database Schema

```bash
npx supabase migration new initial_schema
```

**Tables (from PRD):**
- profiles (with core_values[], encryption_key_hash, pin_hash)
- notes (with assessment_type, assessment_score)
- time_blocks, tasks
- journal_entries (with mood_label, energy_rating, override flags)
- health_metrics, meeting_notes
- ai_insights (with source_type, source_conversation_id for chat memories)
- ai_conversations, ai_messages (for persistent chat)
- cue_rules, cue_instances
- integration_tokens, audit_log

```
Create Supabase migration from CHRONONAUT_PRD_v3.md section 5.2. Include:
- All tables with exact field names
- Indexes for common queries
- RLS policies (users own their data)
- Check constraints on ratings/scores
```

### Auth Enhancement

- Profile creation trigger on signup
- Onboarding redirect if not completed
- Protected route middleware

### App Shell + Global Menu

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
- [done] 14 tables created with RLS (including ai_conversations, ai_messages)
- [done] Auth flow working** went with direct auth instead of oauth, because oauth wasn't working
- [done] App shell with navigation
- [done] Global action menu functional

---

### TickTick Integration 

**Goal:** Bidirectional task sync

### OAuth Flow

```
Create TickTick OAuth:
1. /api/integrations/ticktick/callback
2. Store encrypted tokens
3. Settings UI to connect/disconnect
4. Token refresh logic
```

### Sync Engine

```
Bidirectional TickTick sync:
1. Pull tasks on connect + every 15 min
2. Push completions back
3. Handle conflicts (last-write-wins)
4. Track sync_status per task
```

### Smart Task View

```
**Goal:** Task list with Today/Week toggle, priority dots, time estimates, prioritization AI-opinion. Empty state for no tasks or disconnected.
```

**Deliverables:**
- [done] TickTick OAuth working
- [done] Tasks syncing bidirectionally
- [done] Task view functional
- [ ] Quick task button creates in TickTick in global actions menu
- [ ] Pattern analyzer data enrichment around ticktick task data 

## 12/17/25 session complete smart task view build:
- Quick task button on global actions menu currently non-functional. Write UX routing.
- Pattern analyzer UI/UX additions on task container. This container to be used in dashboard as widget, as well as focus screen as a drawer (can be collapsed away). Task cards for tasks due TODAY display ticktick data alongside AI-pattern analyzer data: 
--- Task time estimation. Estimate for how long this task will take me, based on pattern analysis context data. "i" icon next to the estimate displays the data behind this estimation when user clicks it
--- Suggested prioritization (when to do it today - e.g., morning, afternoon, in what order against the other tasks due today based on pattern analysis context data).  "i" icon next to the estimate displays the data behind this estimation when user clicks it
--- Task list can be sorted based on task time estimation (shortest -> longest, vice versa), or prioritization (first -> last, vice versa)

### Google Calendar Integration + Whoop Integration + Analytics Dashboard 

```
## Google Calendar integration:
1. OAuth flow
2. Webhook for real-time updates
3. Drag-to-reschedule on calendar view

## Whoop integration:
1. OAuth flow
2. Daily cron (6 AM) for recovery, HRV, sleep, strain
3. Store in health_metrics

```
Analytics Panel

Dashboard analytics panel:
**Well-being** containers stacked top-down 
- Habits (3 cards): sleep (whoop), exercise (whoop), meditation (manually tracked)
- Mood: ai-generated enum picker from journal entries
- Compass: ai-generated "today's insight"
All cards can be expanded for drill down metrics
**Growth** 4 cards using raw data from uploaded files + calculation fields in Supabase
- Top-left: last Self-compassion assessment score -> expand card for drill down metrics
- Top-right: latest Values-alignment assessment score -> expand card for drill down metrics
- Bottom-left: latest Executive Function assessment data -> expand card for drill down metrics
- Bottom-right: Strengths Profile assessment data -> expand card for drill down metrics
```

**Deliverables:**
- [done] Whoop OAuth working
- [done] Health data syncing daily
- [done] Gcal oauth working, data syncing
- [done] Dashboard analytics grid

```

### Claude AI Integration (4 Agents)

**Goal:** Claude connected, AI chat drawer + persistence implemented

## Vercel AI SDK Setup

```tsx
// lib/ai/agents.tsimport { anthropic } from '@ai-sdk/anthropic';import { google } from '@ai-sdk/google';export const patternAnalyst = anthropic('claude-3-5-sonnet-20241022');export const executiveCoach = anthropic('claude-3-5-sonnet-20241022');export const researchAssistant = google('gemini-2.0-flash');export const communicationsCoach = google('gemini-2.0-flash');
```

**System prompts:**
- Therapist: DBT/ACT trained, ADHD-experienced, direct + warm, 1:1 therapy integration
- Executive Coach: 1:1 or advisory panel of c-suite. AHD-informed, helps critique ideas, find vulnerabilities across POVs (pro vs con, conflicting priorities, etc.), communications training, meeting prep
- Pattern Analyst: Technical, data-focused, in the background
- Research Assistant: Fast, summarization-oriented
```

### AI Chat Drawer + Persistence

**Database tables to add:**
```sql
-- Add to Week 1 migration or create new migration
create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  title text,
  context_type text not null check (context_type in ('focus_session', 'journal_reflection', 'meeting_prep', 'general')),
  linked_note_id uuid references notes(id),
  linked_journal_id uuid references journal_entries(id),
  linked_meeting_id uuid references meeting_notes(id),
  agent_type text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references ai_conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  saved_to_memory boolean default false,
  pushed_to_note_id uuid references notes(id),
  created_at timestamptz default now()
);

-- Update ai_insights to track chat-sourced memories
alter table ai_insights add column source_type text default 'pattern_analysis';
alter table ai_insights add column source_conversation_id uuid references ai_conversations(id);
alter table ai_insights add column extracted_text text;

-- Indexes
create index idx_ai_conversations_user on ai_conversations(user_id);
create index idx_ai_messages_conversation on ai_messages(conversation_id);
create index idx_ai_insights_source on ai_insights(source_type);
```

**UI/UX:**

```
Slide-over chat drawer (40% width):
- Header: "New Chat" button, conversation search, close button
- Conversation list (collapsible sidebar within drawer): grouped by date, shows title + context badge
- Message list with user/assistant bubbles
- Each assistant message has hover actions: "Save to Memory", "Push to Note", "Create Task"
- Streaming indicator
- Context badge showing: active agent + linked entity (note/journal/meeting)
- Cmd+/ toggle from anywhere
- "Push to Note" opens note selector modal
- "Save to Memory" shows confirmation toast
```

**Context assembly function:**
```tsx
// lib/ai/context.ts
export async function assembleContext(userId: string, conversationId: string) {
  const [recentMessages, relevantMemories, structuredData, activeContext] = await Promise.all([
    // Last 10 messages in current conversation
    getRecentMessages(conversationId, 10),
    // Semantic search of ai_insights for relevant memories
    searchMemories(userId, currentQuery),
    // Journals, assessments, health from last 7 days
    getStructuredContext(userId),
    // Current note/task/meeting if linked
    getActiveScreenContext(conversationId)
  ]);
  
  return buildContextPrompt({ recentMessages, relevantMemories, structuredData, activeContext });
}
```

**Memory extraction function:**
```tsx
// lib/ai/memory.ts
export async function saveToMemory(messageId: string) {
  const message = await getMessage(messageId);
  
  // Pattern Analyst extracts key insight
  const extraction = await patternAnalyst.extract({
    prompt: `Extract the key fact, preference, or decision from this AI response. 
             Summarize in 1-2 sentences. Classify as: user_preference | decision | pattern | fact
             Response: ${message.content}`
  });
  
  await createInsight({
    user_id: message.user_id,
    insight_type: extraction.type,
    content: extraction.summary,
    source_type: 'chat',
    source_conversation_id: message.conversation_id,
    extracted_text: message.content.substring(0, 500)
  });
}
```

```

**Deliverables:**
- [done] Claude API connected
- [done] 4 agent prompts configured
- [done] Chat drawer functional
- [done] ai_conversations + ai_messages tables created
- [done] Chat persistence working (conversations saved)
- [done] Conversation history browsable

```

## 12/17/25 session - finishing items
- Conversation list (grouped by date, shows title + context badge) - TWO ways of viewing this list: 1. Collapsible sidebar within drawer, 2. folders in the notes screen navigation bar. Section at top of notes folder section titled "Agent conversations" with 1 folder each for executive coach and research assistant agents. Subfolders (a.k.a "projects" in Claude.ai interface) can be created. New chats can be initiated from the project folder OR by selecting the appropriate project in the AI-chat drawer.
- Each assistant message has hover actions: "Save to Memory", "Push to Note", "Create Task"
- Streaming indicator
- Context badge showing: active agent + linked entity (note/journal/meeting)
- "Push to Note" opens note selector modal. Default to open note page.
- "Save to Memory" shows confirmation toast

```

### Notes Screen

```
 **Goal:** easy to navigate notebook view of all non-journal notes database - CRUD functionality with the filter/sort ux specified in the PRD. 
Master-detail notes:
*Left navigation panel is much thinner than the right panel. Entire left panel can be collapsed*
- Left: keyword search, filter chips (as per PRD)
- Left: import/export buttons. Import in markdown, docx or PDF formats -> create a note page from the import. Export in markdown, docx or PDF formats. Markdown is the default for import and export.
- Left: "about me" files section - a.k.a "project files" in Claude AI. In this section, I am able to upload (and view) files to include in "about me" files for the embedded AI-agents to utilize. I can organize the files into "about me" folders - e.g., "assessments", "360 feedback', "writing that inspired me", etc.
-Left: notes database organized by folders and sections. UI inspiration: Notion, Obsidian.
*Right panel is much wider. It is the pop out of the selected note*
- Right: rich editor, title, type dropdown, tags
- Templates by note type auto-applied 
- Autosave, 10s undo on delete
- Access chatbot (bottom bar that can be minimized)
- Ability to paste chatbot content into open note
- Export to markdown 

```

**Deliverables:**
- [done] Notes CRUD complete
- [done] Notes folders
- [ ] export / import functionality in markdown format

### Focus Screen

```
Full-screen focus mode:
- Header: time, mode selector (Admin/Research/Writing/Meeting Prep/Toastmasters), exit
--- Two functionalities to the timer: focus timer (total amount of time focusing so far), task timer (total amount of time on task so far) - focus timer starts/stops in background automatically based on time on screen. Task timer is triggered by user behavior (clicking start timer on a specific task or meeting)
--- Task drawer displays ticktick data and AI-pattern analyzer data (mirrored UI/UX as task list on dashboard) AND a focus screen specific button "start timer" to trigger timer for that task
- Center: task title, large timer
- Controls: Pause, Complete, Switch, End
- Task drawer from right
- "Get task started" collapsible section at top of writing area with button to trigger job from the pattern analyzer agent -> clicking button populates section with the key "get going" items for that task. This AI response uses the following context: which mode selected, task specific data, and background pattern data from biometrics/whoop/calendar etc. The "get started" response presents suggested framework(s), cognitive bias checks, etc.
- "Turn on focus cues" allows me to turn on/off the AI-driven pop-up cues that keep me focused on the task at hand. This is CRUCIAL to ensuring focus sessions are meaningful. The cues should be informed by current session tracking data - how many times I click out of the focus screen, how long I'm taking on different parts of the task, etc. to keep me locked in and executing. I want to gamify my attention to fight functional freeze, attention fragmentation and perfectionism.
- Access chatbot (bottom bar that can be minimized)
- Agents (research assistant and executive coach) are context-aware of the mode I selected, so when I open the chat drawer to initiate a chat they are ready to support that specific mode. E.g., "I see you are knocking out admin tasks, here's how I can help.."

---


```

---

### Journal Screen (Day One Style)

**Goal:** Beautiful journal with AI-inferred mood/energy

### Entry Composer

**UI/UX:**

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

### Pattern Analyzer Agent In Journal - AI Background Inference 

```tsx
// On save or "Get Insights":async function inferMoodEnergy(entryId: string) {
  const entry = await getDecryptedEntry(entryId);  const combined = `${entry.happened}\n${entry.feelings}\n${entry.grateful}`;  const [mood, energy] = await Promise.all([
    patternAnalyst.classifyMood(combined),    patternAnalyst.inferEnergy(combined)
  ]);  await updateEntry(entryId, {
    mood_label: mood,
    energy_rating: energy,    mood_override: false,    energy_override: false  });}
```

### E2E Encryption

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

### Journal Views

**UI/UX:**

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

### Meeting Screen + Transcription

**Goal:** Meeting notes with encrypted sensitive fields

### Meeting Screen Layout

**UI/UX:**

```
Meeting screen:
- Header: title, attendees, timer, 🔒 badge, recording dot
- Split view: Transcript (40%) | Notes (60%)
- Footer: Record toggle, Coach toggle, End button
- Templates dropdown
```

### Transcription (voice to text)

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

### Post-Meeting AI

```
Post-meeting processing:
1. Decrypt transcript + notes
2. Send to Executive Coach for summary
3. Extract action items → suggest TickTick tasks (user can create those tasks through button trigger)
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

### Claude Pattern Analysis Agent - Well-being analytics and productivity scaffolding

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

### Week 8: Focus Polish + Voice Mode

**Goal:** Focus sub-modes with agents, Gemini voice

### Focus Mode Agents

```tsx
// Focus screen routes to different agents based on modeconst agentForMode = {
  admin: researchAssistant,      // Gemini - quick tasks  research: researchAssistant,   // Gemini - web search  writing: executiveCoach,       // Claude - structure help  meeting_prep: executiveCoach,  // Claude - context briefing  toastmasters: communicationsCoach // Gemini - voice};
```

### Toastmasters Voice Mode

```
Gemini voice implementation:
1. Gemini 2.0 Flash with audio streaming
2. Push-to-talk (hold space)
3. Real-time transcription both sides
4. Metrics: filler words, pace, interruptions
5. Post-session summary
```

**UI/UX:**

```
Toastmasters voice screen:
- Large microphone button (animated when recording)
- Waveform visualizer
- Split: Your transcript | Coach transcript
- Metrics panel: Filler count, pace indicator
- End session → summary with improvement tips
```

### Day 5: Focus Screen Cue System

```
Cue system:
1. Evaluation engine (every minute during focus)
2. Check cue_rules against state
3. Fire toast notification (bottom-right)
4. Log to cue_instances with response
```

**Deliverables:**
- [ ] Pattern analysis cron running
- [ ] Mood classification working
- [ ] "Save to Memory" extracts insight to ai_insights
- [ ] "Push to Note" appends to selected note
- [ ] Context assembly includes relevant memories
- [ ] Cue system firing
- [ ] Cue interactions logging

---

### Week 9: Polish + Wind-Down

**Goal:** Wind-down ritual, edge cases


### Day 3: Wind-Down Ritual

**UI/UX:**

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