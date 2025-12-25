# Agent Context Architecture

**Last Updated:** 2025-12-23

This document describes how context flows into each AI agent's responses. Use this as a reference when QA-ing agent behavior in production.

---

## Agent Overview

| Agent | Model | Purpose | Icon |
|-------|-------|---------|------|
| Executive Coach | claude-3-5-sonnet | Productivity coaching, meeting prep, work challenges | 🎯 |
| Therapist | claude-3-5-sonnet | Journal reflection, emotional processing, DBT/ACT skills | 💚 |
| Pattern Analyst | claude-3-5-sonnet | Background analysis of mood, energy, behavioral patterns | 📊 |
| Research Assistant | claude-3-5-sonnet | Quick research, summarization, fact-finding | 🔍 |

---

## Context Layer Architecture

Each agent receives context through 5 layers, configured per-agent in `lib/ai/context/types.ts`:

### Layer Definitions

| Layer | Description | Update Frequency |
|-------|-------------|------------------|
| **Static** | System prompt + custom instructions + core values | Rarely changes |
| **Persistent** | About Me files, saved memories, assessments, project memory | Changes infrequently |
| **Conversational** | Message history + conversation summaries | Per conversation |
| **Live** | Real-time data (health, tasks, calendar, journal, focus) | Real-time |
| **Reference** | Notes and documents retrieved on-demand | On-demand |

---

## Agent Context Configurations

### Executive Coach 🎯

| Layer | Enabled | Token Budget | Sources |
|-------|---------|--------------|---------|
| Static | ✅ | 800 | System prompt, custom instructions, core values |
| Persistent | ✅ | 1,200 | `about_me_files`, `saved_memories`*, `project_instructions`, `pattern_insights` |
| Conversational | ✅ | 2,000 | Up to 8 messages |
| Live | ✅ | 1,500 | All 11 sources (see below) |
| Reference | ✅ | 1,000 | `notes`, `folders` |

**Total Budget:** 7,500 tokens

---

### Therapist 💚

| Layer | Enabled | Token Budget | Sources |
|-------|---------|--------------|---------|
| Static | ✅ | 800 | System prompt, custom instructions, core values |
| Persistent | ✅ | 1,200 | `about_me_files`, `saved_memories`*, `assessments`, `project_instructions`, `pattern_insights` |
| Conversational | ✅ | 3,000 | Up to 10 messages |
| Live | ✅ | 1,500 | All 11 sources (see below) |
| Reference | ✅ | 1,000 | `notes`, `folders` |

**Total Budget:** 8,500 tokens

---

### Pattern Analyst 📊

| Layer | Enabled | Token Budget | Sources |
|-------|---------|--------------|---------|
| Static | ✅ | 800 | System prompt, custom instructions, core values |
| Persistent | ✅ | 800 | `about_me_files`, `assessments` |
| Conversational | ❌ | 0 | Background agent - no conversation |
| Live | ✅ | 2,000 | All 11 sources (see below) |
| Reference | ✅ | 1,000 | `notes`, `folders` |

**Total Budget:** 5,500 tokens

---

### Research Assistant 🔍

| Layer | Enabled | Token Budget | Sources |
|-------|---------|--------------|---------|
| Static | ✅ | 600 | System prompt, custom instructions, core values |
| Persistent | ✅ | 1,200 | `about_me_files`, `saved_memories`*, `project_instructions`, `pattern_insights` |
| Conversational | ✅ | 2,000 | Up to 6 messages |
| Live | ✅ | 1,500 | All 11 sources (see below) |
| Reference | ✅ | 1,500 | `notes`, `folders` |

**Total Budget:** 8,000 tokens

---

## Live Data Sources (All 11)

All agents with live layer enabled receive these data sources:

| Source | Data Provided | Database Table |
|--------|---------------|----------------|
| `recovery_score` | Today's Whoop recovery % | `health_metrics` |
| `sleep_data` | Sleep hours, quality | `health_metrics` |
| `health_trends` | Weekly recovery trend (up/down/stable) | `health_metrics` |
| `todays_tasks` | Pending tasks for today | `tasks` |
| `overdue_tasks` | Overdue task count | `tasks` |
| `upcoming_calendar` | Next 5 calendar events | `calendar_events` |
| `focus_session` | Active focus session info | `time_blocks` |
| `journal_recent` | Today's mood/energy | `journal_entries` |
| `mood_patterns` | Recent mood labels (7 days) | `journal_entries` |
| `energy_patterns` | Weekly energy trend | `journal_entries` |
| `task_patterns` | Task completion patterns | `tasks` |

---

## Project Instructions Architecture

### What Are Project Instructions?

Custom instructions that modify an agent's behavior for your specific needs. Similar to Claude Desktop's "Project Instructions" or ChatGPT's "Custom Instructions."

**Database:** `agent_instructions` table

| Column | Purpose |
|--------|---------|
| `user_id` | Owner of the instructions |
| `agent_type` | Which agent these apply to |
| `instructions` | The custom instruction text |
| `is_active` | Whether currently enabled |

### How They're Applied

1. User sets instructions via the chat drawer settings (per agent)
2. Instructions are fetched in `buildStaticLayer()` in base-builder.ts
3. Appended to system prompt as `## Custom Instructions` section
4. Applied on every message to that agent

### Example Use Cases

| Agent | Example Instruction |
|-------|---------------------|
| Executive Coach | "I work best with body doubling. Always suggest this for hard tasks." |
| Therapist | "I'm working on self-compassion. Gently call out when I'm being harsh with myself." |
| Research Assistant | "I prefer bullet points over paragraphs. Keep summaries under 200 words." |

### UI Location

Chat Drawer → Settings icon → "Custom Instructions" textarea (per agent)

---

## Memory Architecture

### Saved Memories (`saved_memories`) - Agent-Specific

**Scope:** Agent-specific (like Claude Desktop project memory)

When you save a message to memory in the chat drawer, it's stored linked to that conversation's agent type. Each agent only sees memories saved within its own conversations.

**How it works:**
1. User clicks "Save to Memory" on an assistant message
2. Message stored with `saved_to_memory=true` in `ai_messages`
3. Query joins with `ai_conversations` to filter by `agent_type`

```
Executive Coach → sees only Executive Coach saved memories
Therapist → sees only Therapist saved memories
Research Assistant → sees only Research Assistant saved memories
```

**Implementation:** `ai_messages` joined with `ai_conversations` filtered by `agent_type`

**Key difference from Claude Desktop:** Manual saving vs automatic extraction. Claude Desktop auto-extracts facts; Chrononaut requires explicit save action.

### Pattern Insights (`pattern_insights`) - User-Wide

**Scope:** User-wide (shared across agents)

**Purpose:** Cross-agent trend analysis from Pattern Analyst, NOT Claude Desktop-style memory.

This is output from the Pattern Analyst background agent:
- Daily/weekly summaries of your patterns
- Detected correlations (mood ↔ sleep, energy ↔ tasks)
- Recommendations based on trends

**Database Table:** `ai_insights`

**Why user-wide?** Pattern Analyst synthesizes data across your entire usage - journal entries, health metrics, task completion. These insights help ALL agents understand your current state and trends.

**Relationship:** `pattern_insights` (source name in code) → queries `ai_insights` (Supabase table). No duplication - same data, just different naming layers.

---

## Persistent Sources Summary

| Source | Description | Scope | DB Table | Agents Using |
|--------|-------------|-------|----------|--------------|
| `about_me_files` | User-uploaded context files | User-wide | `about_me_files` | All 4 |
| `saved_memories` | Manually saved chat messages | **Agent-specific** | `ai_messages` | EC, Therapist, RA |
| `assessments` | Strengths Profile quadrant data | User-wide | `strength_assessments` | PA, Therapist |
| `project_instructions` | Custom agent instructions | **Agent-specific** | `agent_instructions` | EC, Therapist, RA |
| `pattern_insights` | Pattern Analyst insights & trends | User-wide | `ai_insights` | EC, Therapist, RA |

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/ai/agents.ts` | Agent definitions, system prompts, model assignments |
| `lib/ai/context/types.ts` | Context layer interfaces, agent configurations |
| `lib/ai/context/builders/base-builder.ts` | Context building logic, database queries |
| `lib/ai/context/cache.ts` | Response and context caching |
| `lib/ai/model-selector.ts` | Model selection based on task complexity |

---

## QA Checklist

When testing agent responses, verify:

1. **Static Layer**
   - [ ] System prompt personality is correct for agent
   - [ ] Custom instructions (if set) are being applied
   - [ ] Core values appear in context

2. **Project Instructions**
   - [ ] Setting instructions for Executive Coach only affects Executive Coach
   - [ ] Instructions persist across conversations
   - [ ] Disabling instructions removes them from context

3. **Persistent Layer**
   - [ ] About Me files are accessible to appropriate agents
   - [ ] Saved memories are agent-specific (not cross-pollinating)
   - [ ] Assessments show for Therapist and Pattern Analyst
   - [ ] Pattern insights flow from Pattern Analyst to other agents

4. **Memory Isolation Test**
   - [ ] Save a memory in Executive Coach conversation
   - [ ] Switch to Therapist - memory should NOT appear
   - [ ] Switch back to Executive Coach - memory SHOULD appear

5. **Live Layer**
   - [ ] Today's recovery score appears in context
   - [ ] Today's tasks are listed
   - [ ] Upcoming meetings are shown
   - [ ] Current mood/energy from journal is reflected

6. **Reference Layer**
   - [ ] Relevant notes are retrieved based on conversation keywords

7. **Pattern Analyst Insights**
   - [ ] Daily insights are generating from journal + health data
   - [ ] Patterns are being detected across time
   - [ ] Insights flow into other agents via `pattern_insights`

---

## Debugging Tips

- Check `ai_insights` table for Pattern Analyst output
- Check `ai_messages` with `saved_to_memory=true` for saved memories
- Check `agent_instructions` for custom per-agent instructions
- Token budgets prevent context overflow but may truncate data
