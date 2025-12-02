# Chrononaut: Product Requirements Document (PRD)

**Version:** 1.0 (MVP)

**Last Updated:** December 1, 2025

**Author:** Sneha Banerjee

**Status:** Ready for Development

---

## Executive Summary

Chrononaut is an ADHD-optimized “second brain” system designed to provide contextual cognitive scaffolding for executive function challenges. Unlike existing productivity tools that require consistent effort, Chrononaut uses AI to deliver proactive, context-aware interventions that work *with* ADHD brain patterns rather than against them.

**Core Value Proposition:** A system that understands *your specific brain*, adapts to *your specific patterns*, requires zero maintenance *from you*, and just… works.

---

## 1. Problem Statement

### 1.1 Core Problem

Users with ADHD experience executive function deficits that current productivity tools fail to address because those tools assume neurotypical working patterns (consistent moderate effort). ADHD brains work in intense bursts + crashes, requiring external scaffolding that adapts in real-time.

### 1.2 Key Pain Points

| Category | Pain Point | Clinical Presentation | Impact |
| --- | --- | --- | --- |
| **Time Management** | Time blindness | Prospective memory deficit | Late to events, broken commitments |
| **Task Initiation** | Paralysis on deep work | Immediate reinforcement preference | Days lost to “quick wins” |
| **Context Switching** | Hyperfocus lock-in | Sustained attention fixation | Missed meetings, derailed routines |
| **Emotional Regulation** | RSD spirals | Rejection sensitivity dysphoria | Rumination, impaired decision-making |
| **Social Function** | Workplace masking | Pragmatic language impairment | Cognitive depletion, misread cues |
| **Object Permanence** | Out of sight = gone | Working memory deficits | Forgotten relationships, abandoned goals |

### 1.3 Market Gap

- **No existing tool** adapts to energy fluctuations based on wearable/calendar data AND journal patterns, task load, and task completion data. These additional self-reported data sources most closely measure executive function status.
- **No existing tool** provides real-time social coaching for workplace interactions embedded within an ADHD-informed productivity ecosystem
- **No existing tool** surfaces context proactively without user initiation

---

## 2. Target User

### 2.1 Primary Persona

**ADHD Professional (25-45)**
- Knowledge worker in demanding role
- Diagnosed or self-identified ADHD
- Has tried multiple productivity systems (all abandoned)
- Owns wearable device (Whoop, Apple Watch)
- Uses TickTick, Google Calendar
- Experiences daily friction with time management, emotional regulation, social navigation

### 2.2 User Needs Hierarchy

1. **Survival Needs:** Don’t be late, don’t forget critical tasks, don’t implode emotionally
2. **Functioning Needs:** Sustainable work rhythm, meeting commitments, managing relationships
3. **Thriving Needs:** Values-aligned living, creative output, genuine wellbeing

---

## 3. Product Vision

### 3.1 Vision Statement

An intelligent companion that provides the external prefrontal cortex ADHD brains need—surfacing the right information at the right time, intervening before dysregulation cascades, and learning continuously from user patterns.

### 3.2 Success Metrics (V1)

| Metric | Target | Measurement |
| --- | --- | --- |
| Daily journal completion | >80% adherence | Entries logged/days active |
| Time estimation accuracy | Within 25% of actual | Estimated vs tracked time |
| On-time arrival rate | >90% | Calendar events vs actual arrival |
| Self-compassion trend | Upward over 30 days | Assessment + journal pattern analysis |
| Meeting preparation trend | >80% adherence | Meetings prepped for (documented in app) / total # of meetings |
| Meeting feedback analysis | >80% of meetings rated good or great performance | Measured by AI meeting coach |

---

## 4. Feature Specification

### 4.1 Global Elements

### 4.1.1 Global Action Menu

**Purpose:** Quick access to core actions from any screen

**Behavior:**
- Fixed position (top-left corner), persists on all screens
- Never obscured by modals or full-screen modes (floats above)
- Keyboard accessible via global shortcuts
- Collapsed on mobile (hamburger icon)

**Actions:**

| Icon | Label | Shortcut | Target |
| --- | --- | --- | --- |
| 📝 | Notes | `⌘+N` | Notes Screen |
| ⏱️ | Focus | `⌘+F` | Focus Screen |
| 📅 | Meeting | `⌘+M` | Meeting Screen |
| 📓 | Journal | `⌘+J` | Journal Screen |
| ➕ | Task | `⌘+T` | Quick Task Overlay |

**Create Task Overlay:**
- Top-right corner, 40% width max
- Fields: Title, Due date, Priority (1-4), List
- `Enter` = save, `Esc` = cancel
- Syncs to TickTick immediately

### 4.1.2 Global Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `⌘+N` | Open Notes |
| `⌘+F` | Start Focus |
| `⌘+M` | Start Meeting |
| `⌘+J` | Open Journal |
| `⌘+T` | Create Task |
| `⌘+K` | Command Palette |
| `⌘+/` | Toggle AI Chat |
| `Esc` | Close/Exit |
| `⌘+S` | Save |

---

### 4.2 Core Screens

### 4.2.1 Homepage Dashboard

**Purpose:** Single pane of glass for daily executive function

**Layout:** Three-column (Tasks 25% | Calendar 50% | Analytics 25%)

### Analytics Summary Panel (2×2 Card Grid)

**Visual Design:** Matches Lovable prototype—four rounded cards in 2×2 grid with icons, labels, values, and trend arrows.

| Position | Metric | Display | Calculation | Trend |
| --- | --- | --- | --- | --- |
| **Top-Left** | Energy | 0-100% | 60% Whoop recovery (7-day avg) + 40% journal energy patterns (7-day avg) | ↑↓ vs prior week |
| **Top-Right** | Mood | Label | AI classifies most recent journal entry into one of 12 moods | → (current state) |
| **Bottom-Left** | Self-Compassion | X/10 | Last assessment score ± AI adjustment (-1 to +1) based on journal language patterns | ↑↓ vs prior assessment |
| **Bottom-Right** | Values Alignment | 0-100% | (Last assessment score / 100) × (values-aligned mentions / total entries in period) × 100 | ↑↓ vs prior week |
|  |  |  |  |  |

**Mood Enum (12 options):**

```
Threatened | Stressed | Unfocused | Rejected
Creative | Adventurous | Angry | Manic
Calm | Content | Socially Connected | Romantic
```

**Card Interactions:**
- Click card → expands trend chart + contributing factors
- Each card has “→” arrow linking to deeper analysis in AI chat

### Calendar Mirror (center)

- Bidirectional sync with Google Calendar via TickTick
- Events color-coded by energy fit
- Click event → linked meeting note
- Drag to reschedule

### Smart Task View (left)

- Bidirectional sync with TickTick
- Toggle: TODAY | THIS WEEK
- AI organization toggle
- Priority dots, time estimates, due indicators

### Wind-Down Ritual

- Modal at configured time (default 6 PM)
- Shows: incomplete tasks, journal status
- Persistent until journal logged
- Max 2 snoozes

**Empty State:** Welcome checklist, connect integrations CTA, sample data preview

---

### 4.2.2 Notes Screen

**Purpose:** Central hub for notes with calendar linkage

**Layout:** Left list (30%) → Right detail (70%)

**Note Types:**

| Type | Icon | Use Case |
| --- | --- | --- |
| Meeting | 📅 | Calendar-linked |
| Document | 📄 | General notes |
| Spec | 📋 | Planning docs |
| Research | 🔍 | Research capture |
| Assessment | 📊 | Self-Compassion, Values Alignment |

**Assessment Templates:**

**Self-Compassion Assessment:** [https://self-compassion.org/self-compassion-test/](https://self-compassion.org/self-compassion-test/)

**Values Alignment Assessment:** [https://brenebrown.com/resources/living-into-our-values/](https://brenebrown.com/resources/living-into-our-values/)

**Features:**
- Search, filter by type/tags
- Rich text editor with Markdown
- Autosave, 10s undo on delete
- Calendar event linking

---

### 4.2.3 Focus Screen

**Purpose:** Protected deep work with hyperfocus management

**Requirements:**
- Full-screen mode (browser API)
- Task-level time tracking
- Mode-specific AI agents

**Layout:**
- Minimal header: time, mode selector, exit
- Center: task title, large timer
- Controls: Pause, Complete, Switch, End
- AI chat panel (collapsible)

**Sub-Modes:**

| Mode | AI Agent | Capabilities |
| --- | --- | --- |
| Admin | Research Assistant (Gemini) | Quick task help, time guards |
| Research | Research Assistant (Gemini) | Web search, summarization |
| Writing | Executive Coach (Claude) | On-demand structure help |
| Meeting Prep | Executive Coach (Claude) | Context briefing, risk assessment |
| Toastmasters | Communications Coach (Gemini) | **Live voice mode**, real-time feedback |

**Intervention Cues:**
- Meeting proximity alerts
- Rabbit-hole detection
- Task-type mismatch
- Break reminders

---

### 4.2.4 Meeting Screen

**Purpose:** Cognitive scaffolding for workplace interactions

**Security:**
- **E2E encryption** for: prep_notes, meeting_notes, transcript, ai_summary, coach_feedback
- **Unencrypted** (queryable): title, attendees, scheduled times, meeting_type, risk_level, action_items
- Encryption badge visible in header

**Layout:**
- Header: title, attendees, timer, 🔒 badge, recording indicator
- Split view: Transcript (40%) | Notes (60%)
- Footer: Record, Coach toggle, End

**Meeting Coach (toggle) - REAL-TIME FEEDBACK NOT IN SCOPE FOR V1:**
- Role reminders
- Lane-keeping alerts
- Speaking time tracking
- Post-meeting feedback (if enabled)

**Post-Meeting Processing:**
- AI summary generation
- Action item extraction → TickTick tasks via button
- Coach feedback (encrypted)
- All sensitive content encrypted before storage

**Templates:** Status Update, Decision Meeting, 1:1, Networking, Therapy (coach disabled), Coaching (coach disabled)

---

### 4.2.5 Journal Screen

**Purpose:** Rich data for pattern analysis with delightful UX

**Design Reference:** Day One Journal

**Security:**
- E2E encryption for all content
- PIN/biometric secondary auth

**Entry Composer:**

```
┌────────────────────────────────────────────────┐
│  📅 Date                        [Save] [Close] │
│  📍 Location (auto)                    [Edit]  │
├────────────────────────────────────────────────┤
│  📸 Photo of the Day [drop zone]               │
├────────────────────────────────────────────────┤
│  What happened today? [text area]              │
│  How did you feel? [text area]                 │
│  What are you grateful for? [text area]        │
├────────────────────────────────────────────────┤
│  🏷️ Tags: [chips]                              │
├────────────────────────────────────────────────┤
│  AI-Inferred (editable):                       │
│  😊 Mood: [dropdown]    ⚡ Energy: [dropdown]  │
├────────────────────────────────────────────────┤
│  🔒 Encrypted                   [Get Insights] │
└────────────────────────────────────────────────┘
```

**Mood & Energy (AI-Inferred):**
- On save/“Get Insights”, AI analyzes text
- Assigns mood_label (12-enum) and energy_rating (1-10)
- User can override via dropdown
- Removes friction: just write, AI categorizes

**Summary Views:** Calendar, Map, List, Gallery

**Filtering:** Tags, location, date range, has photo, mood, energy range

---

### 4.3 AI Agent Architecture

### 4.3.1 Consolidated Agent System (4 Agents)

| Agent | Model | Scope |
| --- | --- | --- |
| **Pattern Analyst** | Claude 3.5 Sonnet | Background: energy forecasting, mood classification, metric calculations, weekly summaries |
| **Executive Coach** | Claude 3.5 Sonnet | Interactive: journal reflection, meeting prep, post-meeting analysis, DBT/ACT guidance |
| **Research Assistant** | Gemini 2.0 Flash | Speed: web research, summarization, quick task help |
| **Communications Coach** | Gemini 2.0 Flash | **Voice only**: Toastmasters, mock meetings, speech feedback |

**Rationale:**
- Claude = deep thinking, nuanced coaching
- Gemini = speed, voice capabilities
- Single “Executive Coach” persona more coherent than fragmented specialists

### 4.3.2 Executive Coach System Prompt

```
You are an executive coach with 25+ years experience. You have ADHD yourself and deeply understand executive function challenges, rejection sensitivity, and neurodivergent strengths.

Trained in: DBT, ACT, mindfulness, corporate leadership dynamics.

Style:
- Direct and warm—no fluff
- Celebrate wins explicitly
- One small step at a time
- Reference user patterns when relevant
- Never shame; always curious
- Reframe "failures" as data

Access to: journal history, mood/energy patterns, health metrics, task patterns, meeting history, self-compassion and values scores.
```

### 4.3.3 Pattern Analysis Engine

**Inputs:** Journal entries, Whoop data, TickTick data, calendar, assessments, cue interactions

**Outputs:**
- Energy Score (0-100%)
- Mood Classification (12-enum)
- Self-Compassion Adjustment (±1)
- Values Alignment %
- Time estimation calibration
- Weekly trend reports

### 4.3.4 Dashboard Metrics Calculation Logic

```tsx
// Energy (0-100%)energy = (whoopRecovery7DayAvg * 0.6) + (journalEnergy7DayAvg * 10 * 0.4)
// Mood (label)mood = await patternAnalyst.classifyMood(latestJournalEntry)
// Self-Compassion (1-10)baseScore = latestAssessment('self_compassion').scorelanguageAdjustment = await patternAnalyst.analyzeLanguage(recent7DaysJournals) // -1 to +1selfCompassion = clamp(baseScore + languageAdjustment, 1, 10)
// Values Alignment (0-100%)assessmentPct = latestAssessment('values_alignment').scorementionRatio = countValuesAlignedMentions(recentJournals) / totalMentions
valuesAlignment = assessmentPct * mentionRatio
```

### 4.3.5 AI + Encrypted Data Flow

```
1. User opens journal/meeting
2. Client fetches encrypted data from Supabase
3. Client decrypts locally (passphrase-derived key)
4. User views/edits plaintext
5. User clicks "Get Insights"
6. Client sends PLAINTEXT to AI via HTTPS
7. AI processes, returns insight
8. Client encrypts insight
9. Client stores encrypted insight in Supabase
```

**Security Note:** AI providers see plaintext during processing (required for analysis). Uses providers with no-training policies. Data encrypted in transit (TLS 1.3).

---

## 5. Technical Architecture

### 5.1 Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15 (App Router), shadcn/ui, Tailwind |
| AI | Vercel AI SDK (@ai-sdk/anthropic, @ai-sdk/google) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (cookie-based) + PIN |
| Encryption | Web Crypto API (client-side AES-256-GCM) |
| Storage | Supabase Storage |
| Hosting | Vercel |

### 5.2 Database Schema (Key Tables)

```sql
-- profiles: user settings, encryption_key_hash, core_values[]-- notes: including assessment_type, assessment_score for assessment notes-- journal_entries: encrypted content, AI-inferred mood_label, energy_rating-- meeting_notes: encrypted sensitive fields, unencrypted queryable fields-- health_metrics: Whoop data-- ai_insights: pattern analysis results-- cue_rules, cue_instances: intervention system-- integration_tokens: encrypted OAuth tokens
```

Full schema in Appendix A.

### 5.3 API Integrations

| Integration | Sync Pattern |
| --- | --- |
| Whoop | Daily (6 AM) |
| TickTick | Bidirectional, 15-min |
| Google Calendar | Webhook + hourly |
| Claude | On-demand |
| Gemini | On-demand |
| Whisper/AssemblyAI | Real-time stream |

---

## 6. Security

### 6.1 Encryption

- Journal content, meeting transcripts, coach feedback: Client-side AES-256-GCM
- OAuth tokens: Server-side encryption
- Mood labels, energy ratings, dates: Unencrypted (for analytics)

### 6.2 Key Management

- Passphrase → PBKDF2 → AES key (client-side)
- No server-side recovery

### 6.3 Retention

- Journal: Indefinite
- Meeting transcripts: 90 days
- Meeting audio: 30 days
- Health metrics: 2 years
- Cue instances: 6 months

---

## 7. Non-Functional Requirements

- Page load: < 2s
- AI streaming: < 500ms initiation
- Voice latency: < 300ms
- WCAG 2.1 AA
- Max 2 clicks to any action

---

## 8. Out of Scope (V1)

- Native mobile app
- Team features
- Real-time meeting coach
- Multi-language

---

## 9. Appendices

### A. Full Database Schema

See section 5.2 for table summaries. Complete SQL in build plan.

### B. Mood Enum

```tsx
type MoodLabel =
  | 'Threatened' | 'Stressed' | 'Unfocused' | 'Rejected'  | 'Creative' | 'Adventurous' | 'Angry' | 'Manic'  | 'Calm' | 'Content' | 'Socially Connected' | 'Romantic';
```

### C. Cost Structure

| Service | Monthly |
| --- | --- |
| Vercel | $0 |
| Supabase | $0 |
| Claude | ~$4-5 |
| Gemini | ~$1-2 |
| Transcription | ~$2-3 |
| **Total** | **~$7-10** |

---

*This PRD is a living document.*