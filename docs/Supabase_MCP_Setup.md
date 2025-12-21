# Supabase MCP Setup in Cursor

This guide explains how to connect your Supabase database to Cursor using the Model Context Protocol (MCP), enabling AI-assisted database queries and operations directly within your development workflow.

## ⚠️ Security Warning

**Your Supabase Personal Access Token grants full access to your Supabase projects.** 

- **Never commit tokens to version control** - `.cursor/mcp.json` is already in `.gitignore`
- **Prefer environment variables** over storing tokens in files
- **Use development/staging projects** for MCP connections, not production
- **Rotate tokens regularly** and revoke unused ones
- **Use tokens with minimal required permissions** when possible

See the [Security Best Practices](#security-best-practices) section below for detailed guidance.

## What is MCP?

Model Context Protocol (MCP) is a standard that enables AI assistants to interact directly with services like Supabase. By connecting your Supabase project to Cursor via MCP, the AI can:

- Query your database using natural language
- Understand your schema and relationships
- Help with database operations during development
- Answer questions about your data structure
- Assist with migrations and schema changes

## Prerequisites

- **Node.js**: Version 16 or higher
  ```bash
  node -v  # Verify installation
  ```
  If not installed, download from [nodejs.org](https://nodejs.org/)

- **Supabase Project**: An active Supabase project

- **Personal Access Token (PAT)**: Required for authentication

## Step 1: Generate Supabase Personal Access Token

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Click on your profile icon (top right)
3. Navigate to **Account Settings** → **Tokens** (or **Access Tokens**)
4. Click **Generate New Token**
5. Give it a descriptive name (e.g., "Cursor MCP - Chrononaut")
6. Copy the token immediately (you won't be able to see it again!)

   **Important:** Store this token securely. You'll add it to `.env.local` in the next step.

## Step 2: Add Token to .env.local (Recommended)

Since you're already using `.env.local` for other integration tokens, this is the simplest and most consistent approach.

1. **Add the token to `.env.local`:**
   ```bash
   echo "SUPABASE_ACCESS_TOKEN=your-actual-token-here" >> .env.local
   ```
   
   Or manually edit `.env.local` and add:
   ```
   SUPABASE_ACCESS_TOKEN=your-actual-token-here
   ```

2. **Create the MCP configuration file:**
   - Copy the example file: `.cursor/mcp.json.example` to `.cursor/mcp.json`
   ```bash
   cp .cursor/mcp.json.example .cursor/mcp.json
   ```
   
   The configuration is already set up to automatically read from `.env.local` - no further editing needed!

3. **Verify the setup:**
   - The `.cursor/mcp.json` file will use a shell command that sources `.env.local` before starting the MCP server
   - Your token stays in `.env.local` (which is already in `.gitignore`)
   - No token appears in the MCP configuration file

### Alternative Options

<details>
<summary><strong>Option B: System Environment Variable</strong> (if you prefer global environment)</summary>

1. **Set the token in your system environment:**
   
   **macOS/Linux:**
   ```bash
   # Add to ~/.zshrc or ~/.bashrc
   export SUPABASE_ACCESS_TOKEN="your-actual-token-here"
   source ~/.zshrc  # or ~/.bashrc
   ```

2. **Update `.cursor/mcp.json`** to reference the system environment:
   ```json
   {
     "mcpServers": {
       "supabase": {
         "command": "sh",
         "args": [
           "-c",
           "SUPABASE_ACCESS_TOKEN=\"$SUPABASE_ACCESS_TOKEN\" npx -y @supabase/mcp-server-supabase"
         ]
       }
     }
   }
   ```
</details>

<details>
<summary><strong>Option C: Direct Token</strong> (not recommended)</summary>

If you must store it directly (not recommended), at minimum ensure:
- ✅ `.cursor/mcp.json` is in `.gitignore` (already configured)
- ✅ Never commit this file
- ✅ Use a token with minimal permissions
- ✅ Rotate tokens regularly
</details>

## Step 3: Restart Cursor

After adding the token to `.env.local` and creating `.cursor/mcp.json`, **restart Cursor** to load the MCP configuration.

**Note:** The MCP server will automatically read `SUPABASE_ACCESS_TOKEN` from your `.env.local` file when it starts.

## Step 4: Verify the Connection

After restarting Cursor, the MCP server should automatically connect. You can verify it's working by:

1. Asking the AI assistant a question about your database:
   - "What tables are in my Supabase database?"
   - "Show me the schema for the users table"
   - "How many journal entries are in the database?"

2. The AI should be able to query your database and provide answers directly.

## Using MCP in Your Workflow

### Natural Language Queries

You can now ask the AI questions about your database in natural language:

- **Schema Questions:**
  - "What columns does the journal_entries table have?"
  - "Show me the relationships between tables"
  - "What indexes are defined on the notes table?"

- **Data Questions:**
  - "How many users signed up this week?"
  - "What's the average mood score in journal entries?"
  - "Show me recent tasks that are overdue"

- **Development Assistance:**
  - "Help me write a query to find all notes created in the last 7 days"
  - "What's the structure of the ai_conversations table?"
  - "Check if there are any foreign key constraints on the tasks table"

### During Code Development

When you're writing code that interacts with Supabase, the AI can:

- Verify table structures match your code
- Suggest proper column names and types
- Help debug database-related issues
- Understand relationships when writing joins
- Assist with RLS (Row Level Security) policies

### Example Interactions

**You:** "What's the structure of my journal_entries table?"

**AI (via MCP):** *[Queries your database and responds with the actual schema]*

**You:** "How many journal entries have a mood_label of 'anxious'?"

**AI (via MCP):** *[Runs the query and returns the count]*

**You:** "Help me write a query to get all notes with their folder names"

**AI (via MCP):** *[Understands your schema and writes the correct JOIN query]*

## Security Best Practices

### 1. Use Development/Staging Environments

- **Avoid connecting MCP to production databases** with sensitive data
- Use development or staging environments for MCP connections
- Production data should be accessed through your application's secure API

### 2. Token Security

- **Never commit `.cursor/mcp.json` to version control** (it's in `.gitignore`)
- **Prefer environment variables** over storing tokens in files
- Store your Personal Access Token in system environment variables when possible
- Rotate tokens periodically
- Use tokens with minimal required permissions
- Consider using a password manager or secure vault for token storage

### 3. Read-Only Mode (Recommended)

Consider using read-only access for MCP connections:

- Prevents accidental data modifications
- Reduces security risk
- Still enables schema exploration and querying

### 4. Project Scoping

- Ensure MCP is configured for the correct Supabase project
- Double-check project selection during setup
- Use separate tokens for different projects/environments

### 5. Regular Audits

- Review MCP access logs in Supabase dashboard
- Monitor for unexpected queries or operations
- Rotate tokens if you suspect any compromise

## Troubleshooting

### MCP Server Not Connecting

1. **Verify Node.js is installed:**
   ```bash
   node -v  # Should show v16 or higher
   ```

2. **Check the token:**
   - Ensure the token in `.cursor/mcp.json` is correct
   - Verify the token hasn't expired or been revoked
   - Generate a new token if needed

3. **Check Cursor logs:**
   - Open Cursor's Output panel (`View → Output`)
   - Look for MCP-related error messages

4. **Restart Cursor:**
   - Close and reopen Cursor completely
   - MCP servers load on startup

### AI Can't Query Database

1. **Verify MCP is active:**
   - Check if the MCP server is running (should be automatic)
   - Look for connection errors in Cursor's output

2. **Test with a simple query:**
   - Ask: "What tables are in my database?"
   - If this fails, check token permissions

3. **Check Supabase project:**
   - Ensure the project is active and accessible
   - Verify your account has access to the project

### Token Issues

- **Token expired:** Generate a new token in Supabase dashboard
- **Invalid token:** Double-check you copied the full token
- **Token permissions:** Ensure the token has database read permissions

## Advanced Configuration

### Multiple Projects

You can configure multiple Supabase projects by adding additional entries:

```json
{
  "mcpServers": {
    "supabase-dev": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "--access-token",
        "dev-token-here"
      ]
    },
    "supabase-staging": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "--access-token",
        "staging-token-here"
      ]
    }
  }
}
```

### Project-Specific Configuration

You can scope MCP to a specific project by adding the project reference:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "--access-token",
        "your-token",
        "--project-ref",
        "your-project-ref"
      ]
    }
  }
}
```

## Benefits Over SQLTools

While SQLTools provides manual SQL querying, MCP offers:

- **AI-Native Integration:** The AI assistant can query your database directly
- **Natural Language:** Ask questions in plain English, not SQL
- **Context-Aware:** AI understands your schema when helping with code
- **Workflow Integration:** Seamless database access during development
- **No Manual Queries:** AI handles the SQL generation and execution

## Additional Resources

- [Supabase MCP Documentation](https://supabase.com/docs/guides/getting-started/mcp)
- [Supabase MCP Server GitHub](https://github.com/supabase-community/supabase-mcp)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)

## Migration from SQLTools

If you were previously using SQLTools:

1. The SQLTools configuration in `.vscode/settings.json` can be removed (optional)
2. You can keep SQLTools installed if you want manual SQL querying
3. MCP complements SQLTools by adding AI-assisted capabilities
4. Consider using both: SQLTools for manual queries, MCP for AI assistance

