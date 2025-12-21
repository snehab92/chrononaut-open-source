# Chrononaut Dictionary

## Project Terms

| Term | Definition |
|------|------------|
| **Focus Mode** | Deep work session with timer, task tracking, and note-taking |
| **Energy Score** | Derived metric combining Whoop recovery with other factors |
| **Task Sync** | Bidirectional sync between local tasks and TickTick |
| **Quick Start** | AI-generated session recommendation based on patterns |

---

## Claude Code Reference

### Keyboard Shortcuts

| Shortcut | Description |
|----------|-------------|
| `Ctrl+C` | Cancel current input or generation |
| `Ctrl+D` | Exit Claude Code session |
| `Ctrl+L` | Clear terminal screen (keeps history) |
| `Ctrl+R` | Reverse search command history |
| `Ctrl+V` / `Alt+V` | Paste image from clipboard |
| `Up/Down arrows` | Navigate command history |
| `Esc` + `Esc` | Rewind code/conversation to previous point |
| `Shift+Tab` or `Alt+M` | Toggle permission modes (Auto-Accept, Plan Mode) |
| `Option+P` / `Alt+P` | Switch model without clearing prompt |

### Multiline Input

| Method | Shortcut |
|--------|----------|
| Quick escape | `\` + `Enter` |
| macOS default | `Option+Enter` |
| After terminal setup | `Shift+Enter` |
| Control sequence | `Ctrl+J` |

### Quick Prefixes

| Prefix | Purpose |
|--------|---------|
| `#` | Add to CLAUDE.md memory |
| `/` | Slash command |
| `!` | Bash mode (run command directly) |
| `@` | File path autocomplete |

### Essential Slash Commands

| Command | Purpose |
|---------|---------|
| `/init` | Initialize project with CLAUDE.md |
| `/memory` | Edit CLAUDE.md memory files |
| `/config` | Open settings interface |
| `/clear` | Clear conversation history |
| `/compact` | Compact conversation to save context |
| `/context` | Visualize context usage |
| `/cost` | Show token usage |
| `/model` | Change AI model |
| `/hooks` | Manage hook configurations |
| `/mcp` | Manage MCP servers |
| `/resume` | Resume previous session |
| `/rewind` | Rewind conversation/code |
| `/todos` | List current TODO items |
| `/review` | Request code review |

---

## CLAUDE.md Skill Files

### What is CLAUDE.md?

CLAUDE.md is your project's memory file. Claude automatically loads it at session start to understand your project context, coding standards, and workflows.

### Memory Hierarchy (Load Order)

| Priority | Location | Purpose |
|----------|----------|---------|
| 1 | Enterprise policy | Organization-wide rules |
| 2 | `./CLAUDE.md` | Team-shared project instructions |
| 3 | `.claude/rules/*.md` | Modular topic-specific rules |
| 4 | `~/.claude/CLAUDE.md` | Personal preferences (all projects) |
| 5 | `./CLAUDE.local.md` | Personal project-specific (gitignored) |

### Best Practices for CLAUDE.md

**1. Be Specific**
```markdown
# Good
- Use 2-space indentation for TypeScript
- Always use `const` unless reassignment is needed

# Bad
- Format code properly
```

**2. Include Frequently Used Commands**
```markdown
## Build Commands
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run lint` - Run ESLint
```

**3. Document Architecture Patterns**
```markdown
## Project Structure
- `/app` - Next.js App Router pages
- `/components` - React components
- `/lib` - Utilities and clients
```

**4. Add Team Workflows**
```markdown
## Git Workflow
- Branch from main: `feature/description`
- Always run tests before commit
- Use conventional commits
```

**5. Note Common Pitfalls**
```markdown
## Watch Out For
- Supabase client must be created server-side for auth
- TickTick sync uses status=2 for completed tasks
```

### Using @imports

Reference other files directly in CLAUDE.md:
```markdown
See @README.md for project overview
API documentation: @docs/API.md
```

### Modular Rules (.claude/rules/)

For larger projects, organize into topic files:
```
.claude/
  CLAUDE.md              # Main instructions
  rules/
    code-style.md        # Coding standards
    testing.md           # Test conventions
    security.md          # Security requirements
```

**Path-Specific Rules** (with frontmatter):
```markdown
---
paths: src/api/**/*.ts
---

# API Rules
- All endpoints must validate input
- Use standard error response format
```

---

## Creating Custom Skills

### Skill Structure

```
.claude/skills/my-skill/
  SKILL.md               # Main skill file (required)
  REFERENCE.md           # Optional documentation
  scripts/               # Optional helper scripts
```

### SKILL.md Format

```yaml
---
name: my-skill-name
description: What it does and when to use it
allowed-tools: Read, Grep, Glob
---

# My Skill

## Instructions
Step-by-step guidance for Claude.

## Examples
Concrete usage scenarios.
```

### Skills vs Slash Commands

| Aspect | Slash Commands | Agent Skills |
|--------|----------------|--------------|
| Invocation | Explicit (`/command`) | Automatic (context-based) |
| Structure | Single `.md` file | Directory with `SKILL.md` |
| Complexity | Simple prompts | Complex capabilities |
| Location | `.claude/commands/` | `.claude/skills/` |

---

## Hooks System

### Available Hook Events

| Event | When It Runs | Blocks |
|-------|--------------|--------|
| `PreToolUse` | Before tool calls | Yes |
| `PostToolUse` | After tool calls | No |
| `UserPromptSubmit` | User submits prompt | Yes |
| `SessionStart` | New/resumed session | No |
| `SessionEnd` | Session ends | No |
| `Stop` | Claude finishes response | No |

### Hook Configuration

Configured in `~/.claude/settings.json`:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{
          "type": "command",
          "command": "prettier --write"
        }]
      }
    ]
  }
}
```

### Common Hook Use Cases

- **Auto-format on save**: Run prettier after Edit/Write
- **Command logging**: Log all Bash commands
- **File protection**: Block edits to certain files
- **Custom notifications**: Desktop alerts on completion

---

## Recommended CLAUDE.md for Chrononaut

Here's a template for this project:

```markdown
# Chrononaut Project Context

## Tech Stack
- Next.js 15 (App Router)
- TypeScript with strict mode
- Supabase for database and auth
- Tailwind CSS with custom theme
- shadcn/ui components

## Build Commands
- `npm run dev` - Development server (localhost:3000)
- `npm run build` - Production build
- `npm run lint` - ESLint check

## Key Integrations
- TickTick: Task sync (lib/ticktick/)
- Whoop: Health metrics (lib/whoop/)
- Google Calendar: Events (lib/google-calendar/)

## Code Conventions
- Use `createClient` from `@/lib/supabase/server` for server components
- Use `createClient` from `@/lib/supabase/client` for client components
- Follow existing component patterns in `components/`

## Color Palette
- Primary: #1E3D32 (forest green)
- Secondary: #5C7A6B (sage)
- Background: #FDFBF7 (cream)
- Border: #E8DCC4 (tan)

## Database
- See supabase/migrations/ for schema
- Tasks table syncs with TickTick
- Health metrics from Whoop API

## Documentation
- PRD: docs/01_PRD.md
- Build Plan: docs/02_Build_Plan.md
- Decisions: docs/06_Decisions.md
- Tech Debt: docs/08_Tech_Debt.md
```

---

## Quick Reference

| Action | Command/Shortcut |
|--------|------------------|
| Start Claude Code | `claude` in terminal |
| Initialize memory | `/init` |
| View memory files | `/memory` |
| Check context usage | `/context` |
| Resume session | `/resume` |
| Search history | `Ctrl+R` |
| Switch model | `Option+P` / `Alt+P` |
| Toggle plan mode | `Shift+Tab` |
| Run bash directly | `! <command>` |
| Add file context | `@ <filepath>` |
| Add to memory | `# <note>` |

```
# UI/UX Terminology Quick Reference for Chrononaut

## 🎯 **Layout & Structure**

**Container** - Wrapper div that holds content (e.g., `max-w-4xl mx-auto`)
**Stack/Flex** - Vertical (`flex-col`) or horizontal (`flex-row`) arrangement
**Grid** - Multi-column layout (`grid grid-cols-3`)
**Spacing** - Gap between elements (`gap-4`, `space-y-2`)
**Padding** - Space inside a component (`p-4`)
**Margin** - Space outside a component (`m-4`)

## 🧩 **Component Anatomy**

**Props** - Data passed to a component (`<Button variant="outline">`)
**State** - Data that changes (`const [open, setOpen] = useState(false)`)
**Children** - Content between tags (`<Card>children here</Card>`)
**Slot** - Named position for content (shadcn Dialog has title/description slots)

## 🔄 **Interaction States**

**Hover** - Mouse over state (`hover:bg-gray-100`)
**Active** - Being clicked (`active:scale-95`)
**Focus** - Keyboard/tab navigation state (`focus:ring-2`)
**Disabled** - Non-interactive state (`disabled:opacity-50`)
**Loading** - Waiting for action (`<Spinner />`)

## 📱 **Common shadcn/ui Components**

**Dialog/Modal** - Overlay popup that blocks background
**Drawer** - Slide-in panel (e.g., your AI chat drawer)
**Sheet** - Same as Drawer in shadcn
**Popover** - Small contextual popup (doesn't block background)
**Tooltip** - Hover hint text
**Dropdown** - Click to reveal options
**Accordion** - Expandable/collapsible sections
**Tabs** - Switch between views without navigation
**Card** - Contained content block with header/body/footer
**Badge** - Small status indicator
**Avatar** - User profile circle
**Separator** - Visual divider line

## 🎨 **Visual Feedback**

**Toast** - Temporary notification (bottom/top of screen)
**Alert** - Persistent warning/info message
**Skeleton** - Loading placeholder that mimics content shape
**Spinner** - Rotating loading indicator
**Progress bar** - Shows completion percentage

## 🧭 **Navigation**

**Breadcrumbs** - Path showing where you are (Home > Dashboard > Focus)
**Sidebar** - Persistent side navigation
**Top nav** - Header navigation bar
**Back button** - Returns to previous screen
**Deep link** - Direct URL to specific screen/state

## 📐 **Responsive Design**

**Breakpoint** - Screen size where layout changes (`md:`, `lg:`)
**Mobile-first** - Default styles for phone, then add larger screens
**Hidden** - Show/hide at certain sizes (`hidden md:block`)

## 🔧 **Common Bug Report Terms**

Instead of: "The thing isn't working"
Use: "The [component] isn't [expected behavior] when I [action]"

**Examples:**
- "The Dialog closes when I click inside it" (should only close on outside click)
- "The Drawer doesn't persist state on navigation" (data disappears)
- "The Button shows hover state when disabled" (visual bug)
- "The Input loses focus after typing" (interaction bug)
- "The Card padding is inconsistent with the design system" (styling bug)

## 💬 **Chrononaut-Specific Shortcuts**

**Focus Screen** = Your main timer/task interface
**AI Drawer** = Sheet component with chat interface
**Task Card** = Individual task in TickTick sync
**Session Block** = Timed work period
**Energy/Mood Rating** = 1-10 scale inputs

## 📝 **Template for Clear Feedback**

```
**Screen:** Focus / Dashboard / Notes
**Component:** Button / Dialog / Input / etc.
**Expected:** Should do X when I do Y
**Actual:** Does Z instead
**Steps to reproduce:** 
1. Navigate to [screen]
2. Click [component]
3. Observe [bug]
```

## ⚡ **Priority Flags**

**P0 - Blocker:** Can't use the app
**P1 - Critical:** Feature doesn't work
**P2 - Important:** Works but wrong behavior
**P3 - Polish:** Enhancement/nice-to-have

---

**Quick translation guide:**

❌ "The popup thing closes weird"
✅ "The Dialog closes when clicking inside the content area (expected: only closes on backdrop click or X button)"

❌ "Timer looks off"  
✅ "The timer display font-size is too small on mobile (expected: larger text for at-a-glance visibility)"

❌ "Chat doesn't save"
✅ "AI Drawer messages don't persist after closing the Sheet (expected: conversation history remains on reopen)"

**Use this when describing bugs/enhancements and we'll iterate 3x faster.** 🚀