# Chrononaut

A privacy-first productivity suite built with Next.js, Supabase, and AI. Chrononaut combines task management, journaling, meeting notes with live transcription, focus sessions, and an AI assistant.

## Features

- **Dashboard** — Unified view of tasks, calendar events, health metrics, and daily commitments
- **Focus Sessions** — Timed deep work with mode-specific AI agents (admin, research, writing, meeting prep, presentation)
- **Journal** — Daily entries with AI-powered reflection, mood tracking, and photo attachments
- **Notes** — Rich text editor with folders, templates, and AI-assisted writing
- **Meeting Notes** — Live transcription with speaker diarization (via Deepgram)
- **AI Chat** — Context-aware assistant powered by Claude (Anthropic)
- **Integrations** — Google Calendar sync, Whoop health data
- **Assessments** — Self-assessments for executive function, strengths, values alignment, and professional skills
- **Electron Desktop App** — Optional native wrapper with system tray

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: Vercel AI SDK + Anthropic Claude
- **Styling**: Tailwind CSS + shadcn/ui + Radix UI
- **Rich Text**: TipTap editor
- **Transcription**: Deepgram WebSocket API
- **Desktop**: Electron via electron-forge
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- A [Supabase](https://supabase.com) account and project
- An [Anthropic](https://console.anthropic.com) API key (for AI features)

### 1. Clone the repository

```bash
git clone https://github.com/snehab92/chrononaut-open-source.git
cd chrononaut-open-source
npm install
```

### 2. Set up Supabase

1. Create a new Supabase project at [database.new](https://database.new)
2. Run the migration files in order against your Supabase database. You can do this via the Supabase SQL Editor in the dashboard — paste each file from `supabase/migrations/` in chronological order.
3. Enable **Google OAuth** in Supabase Auth settings (Authentication > Providers) if you want Google Calendar integration.

### 3. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

See [`.env.example`](.env.example) for all required and optional variables.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Deploy to Vercel (optional)

1. Push your repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add your environment variables in the Vercel project settings
4. Set the `NEXT_PUBLIC_SITE_URL` to your Vercel deployment URL
5. Deploy

### 6. Electron Desktop App (optional)

Run the web app and Electron wrapper together:

```bash
npm run electron:dev
```

Package for distribution:

```bash
npm run electron:make
```

> Note: In production mode, set the `APP_URL` environment variable to point to your deployed web app URL.

## AI Model Configuration

Chrononaut uses centralized model constants in `lib/ai/model-selector.ts` to protect against LLM model sunsetting. When Anthropic (or any provider) retires a model ID, you only need to update it in one place.

**Default models:**
- `SONNET_MODEL` — Used for complex reasoning (executive coach, therapist, strategist agents)
- `HAIKU_MODEL` — Used for lightweight tasks (assessment extraction, cron jobs)

**Override via environment variables** (no code changes needed):

```bash
# In .env.local — override when models are deprecated
ANTHROPIC_SONNET_MODEL=claude-sonnet-4-20250514
ANTHROPIC_HAIKU_MODEL=claude-3-haiku-20240307
```

All AI routes import from `lib/ai/anthropic.ts` rather than directly from `@ai-sdk/anthropic`. This shared provider handles API key resolution and works around environment conflicts (see Known Issues below).

## Known Issues & Notes

### AI Chat and Claude Code / Claude Desktop

If you run `npm run dev` from within **Claude Code** or **Claude for Desktop**, the shell environment injects `ANTHROPIC_API_KEY=""` (empty string), which overrides your real key from `.env.local`. The app handles this automatically via `lib/ai/anthropic.ts`, which reads the key directly from `.env.local` when the environment variable is empty. No action needed — just be aware if you see empty AI responses while developing outside of this setup.

### Next.js Streaming and Proxy

The `proxy.ts` middleware (Supabase session management) excludes `/api/chat` from its matcher to avoid buffering streaming responses. If you add new streaming API routes, add them to the exclusion pattern in `proxy.ts`.

## Project Structure

```
app/
  (authenticated)/     # Protected routes (dashboard, focus, journal, notes, settings)
  api/                 # API routes (ai, calendar, integrations, transcription, cron)
  auth/                # Auth pages (login, sign-up, forgot-password)
  onboarding/          # First-time user setup
components/            # React components organized by feature
  ai/                  # AI chat interface
  dashboard/           # Dashboard widgets
  focus/               # Focus session components
  journal/             # Journal editor and widgets
  notes/               # Note editor and folder management
  settings/            # Settings and integrations
  ui/                  # Shared UI primitives (shadcn/ui)
lib/                   # Utilities, hooks, contexts, AI config
  ai/                  # AI providers, agents, model config, context builders
  assessments/         # Assessment question definitions and scoring
electron/              # Electron main process
supabase/
  migrations/          # SQL migration files (run in order)
```

## Integrations

### Google Calendar
Requires Google OAuth credentials. Set up a Google Cloud project, enable the Calendar API, and configure OAuth consent screen + credentials. Add the client ID/secret to your `.env.local`.

**Redirect URI**: `{NEXT_PUBLIC_SITE_URL}/api/integrations/google/callback`

### Whoop
Requires a Whoop developer account. Register your app and add credentials to `.env.local`.

**Redirect URI**: `{NEXT_PUBLIC_SITE_URL}/api/integrations/whoop/callback`

### Deepgram (Transcription)
Sign up at [deepgram.com](https://deepgram.com) and add your API key for live meeting transcription with speaker diarization.

## Data Security

Chrononaut uses Supabase Row Level Security (RLS) to ensure users can only access their own data. All data is encrypted at rest by Supabase's underlying PostgreSQL storage encryption.

## License

MIT
