/**
 * Shared Anthropic provider for the AI SDK.
 *
 * Why this exists:
 * Claude for Desktop (and Claude Code) inject ANTHROPIC_API_KEY="" and
 * ANTHROPIC_BASE_URL="https://api.anthropic.com" into the shell environment.
 * When Next.js starts via `npm run dev`, it inherits these empty values, which
 * OVERRIDE the real key in `.env.local` (shell env takes precedence over dotenv).
 *
 * This module creates an Anthropic provider with the key explicitly resolved:
 *   1. process.env.ANTHROPIC_API_KEY (if non-empty)
 *   2. Falls back to parsing .env.local directly
 *
 * All files should import `anthropic` from here instead of from "@ai-sdk/anthropic".
 */

import { createAnthropic } from "@ai-sdk/anthropic";

function resolveApiKey(): string {
  // First try the environment variable (non-empty)
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey && envKey.length > 0) {
    return envKey;
  }

  // Shell env may have overridden .env.local with an empty value.
  // Parse .env.local directly to get the real key.
  // Use dynamic require to avoid Turbopack bundling issues with fs/path.
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const fs = require("fs");
    const path = require("path");
    /* eslint-enable @typescript-eslint/no-require-imports */

    const envPath = path.resolve(process.cwd(), ".env.local");
    const content = fs.readFileSync(envPath, "utf-8");

    // Simple .env parser: find ANTHROPIC_API_KEY=value
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || !trimmed) continue;

      const match = trimmed.match(/^ANTHROPIC_API_KEY\s*=\s*(.+)$/);
      if (match) {
        let value = match[1].trim();
        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (value.length > 0) {
          // Also set it in process.env so downstream code (e.g., raw Anthropic SDK) works
          process.env.ANTHROPIC_API_KEY = value;
          return value;
        }
      }
    }
  } catch {
    // File not found or fs unavailable — fine in production or edge runtime
  }

  console.warn(
    "[anthropic] ANTHROPIC_API_KEY is empty. " +
    "If running inside Claude Code/Claude Desktop, the shell env overrides .env.local. " +
    "Set the key via a non-conflicting env var or restart the dev server outside of Claude."
  );
  return "";
}

const apiKey = resolveApiKey();

/**
 * Configured Anthropic provider instance.
 * Import this instead of the default `anthropic` from "@ai-sdk/anthropic".
 */
export const anthropic = createAnthropic({
  apiKey: apiKey || undefined,
});

/**
 * Get the resolved API key. Useful for code using the raw @anthropic-ai/sdk.
 */
export function getAnthropicApiKey(): string {
  return apiKey;
}
