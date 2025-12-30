# Database Backup & Restore Guide

## Overview

Chrononaut uses an automated backup system that:
- Runs **daily at 2 AM UTC** via GitHub Actions
- Exports all 32 Supabase tables to JSON format
- Stores backups in a **private GitHub repository**
- Retains **30 days** of rolling backups (auto-deletes older backups)
- Preserves **end-to-end encrypted data** as ciphertext
- Provides **manual trigger** option for on-demand backups

## Why This Approach?

**GitHub Actions vs Supabase Pro Backups**:
- **Cost**: $0-4/month vs $25/month for Supabase Pro
- **Control**: Full access to backup files for inspection/analysis
- **Independence**: Backups survive even if Supabase has issues
- **Portability**: JSON format is easy to migrate to other systems

## Storage Requirements

- **Per backup**: ~15-30MB (all 32 tables)
- **30 days retention**: ~450-900MB total
- **GitHub free tier**: 1GB (may need paid tier at $4/month for 50GB)
- **Backup format**: JSON files + metadata

## How Backups Work

### Automated Daily Backups

The GitHub Actions workflow runs automatically every day at 2 AM UTC:

1. Connects to Supabase using secret key
2. Exports all 32 tables to JSON files
3. Creates `backup-metadata.json` with row counts and timestamp
4. Commits backup to `/backups/YYYY-MM-DD/` folder
5. Deletes backups older than 7 days
6. Uploads backup as GitHub Actions artifact (7-day retention)

### What Gets Backed Up

**All 32 tables**, including:
- **User data**: profiles, notes, tasks, folders
- **Journal entries**: E2E encrypted (preserved as ciphertext)
- **Meeting notes**: E2E encrypted (preserved as ciphertext)
- **Health metrics**: Whoop sync data, workouts, meditation
- **Calendar events**: Google Calendar sync
- **AI data**: conversations, messages, insights
- **Assessments**: strength, self-compassion, executive function, values alignment
- **Logs**: token usage, cue instances, audit logs

### Encryption Handling

**Critical**: Encrypted fields are backed up as-is (ciphertext).

- **Journal entries**: encrypted_happened, encrypted_feelings, encrypted_grateful, encrypted_ai_insights
- **Meeting notes**: encrypted_prep_notes, encrypted_meeting_notes, encrypted_transcript, encrypted_ai_summary, encrypted_coach_feedback

**What this means**:
- Backups do NOT require your encryption passphrase
- Restored data remains encrypted (passphrase still needed to read journals)
- Backups are safe to store in private GitHub repo

## How to Trigger a Manual Backup

If you need to create a backup outside the daily schedule:

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select **Daily Database Backup** workflow (left sidebar)
4. Click **Run workflow** button (right side)
5. Select branch: `main`
6. Click **Run workflow**

The workflow will:
- Run immediately (no waiting for 2 AM UTC)
- Create a backup in `/backups/YYYY-MM-DD/`
- Upload as downloadable artifact

## How to Restore from Backup

### Prerequisites

- Node.js 20+ installed
- Supabase credentials (URL + secret key)
- Backup files in `/backups/YYYY-MM-DD/` directory

### Step 1: Choose a Backup Date

List available backups:

```bash
ls backups/
```

You should see folders like:
```
2025-01-08/
2025-01-09/
2025-01-10/
```

### Step 2: Dry Run (Recommended)

Always test with a dry run first to verify the backup is valid:

```bash
npx tsx scripts/restore-supabase.ts 2025-01-10 --dry-run
```

This will:
- Check that backup files exist
- Verify metadata
- Show how many rows would be restored per table
- **NOT make any changes** to the database

### Step 3: Set Environment Variables

Create a `.env.local` file (if not already present) with:

```bash
SUPABASE_URL=https://zowuxypexkjhjwupbrcu.supabase.co
SUPABASE_SECRET_KEY=your_service_role_key_here
```

**Important**: Use the **secret key**, not the publishable key.

Get your secret key from:
- Supabase Dashboard → Settings → API → service_role key

### Step 4: Run the Restore

⚠️ **WARNING**: This is DESTRUCTIVE! All existing data will be deleted.

```bash
npx tsx scripts/restore-supabase.ts 2025-01-10
```

The script will:
1. Show backup metadata (date, row counts, schema version)
2. Prompt for confirmation: `Are you sure you want to continue? (yes/no):`
3. Delete all existing data
4. Restore data from backup in dependency order
5. Verify row counts match metadata
6. Report success/failure

Type `yes` and press Enter to proceed.

### Step 5: Verify Restoration

After restore completes:

1. Check the summary output for row count mismatches
2. Log into your app and verify key data is present:
   - Dashboard loads correctly
   - Notes are accessible
   - Journal entries decrypt properly (with your passphrase)
   - Tasks and calendar events show up

## Backup File Structure

Each backup is organized as follows:

```
backups/
  2025-01-10/
    backup-metadata.json    # Metadata: timestamp, row counts, schema version
    profiles.json           # User profiles
    notes.json              # Notes data
    tasks.json              # TickTick tasks
    journal_entries.json    # E2E encrypted journals
    meeting_notes.json      # E2E encrypted meeting notes
    health_metrics.json     # Whoop health data
    calendar_events.json    # Google Calendar events
    ai_conversations.json   # AI chat conversations
    ai_messages.json        # AI chat messages
    ... (all 32 tables)
```

### Metadata File Example

```json
{
  "backupDate": "2025-01-10",
  "timestamp": "2025-01-10T02:00:15.234Z",
  "schemaVersion": "20251224120000",
  "totalTables": 32,
  "totalRows": 12457,
  "tables": {
    "profiles": { "rowCount": 1 },
    "notes": { "rowCount": 243 },
    "journal_entries": { "rowCount": 365 },
    "tasks": { "rowCount": 156 },
    ...
  },
  "errors": []
}
```

## Troubleshooting

### Backup Failed

**Check GitHub Actions logs**:
1. Go to GitHub → Actions tab
2. Click on the failed workflow run
3. Expand failed step to see error details

**Common issues**:
- **Invalid credentials**: Verify `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in GitHub Secrets
- **Network timeout**: Supabase may be temporarily unavailable (retry later)
- **Disk space**: Unlikely with current data size, but check GitHub storage limits

### Restore Failed Mid-Process

**Symptoms**: Some tables restored, others didn't

**Recovery**:
1. Check error message in console output
2. Note which table failed
3. Options:
   - Fix the issue (e.g., schema mismatch) and re-run restore
   - Restore from a different backup date
   - Contact for help if unsure

**Database state**: May be inconsistent (partial data). Recommend re-running restore from a known-good backup.

### Row Count Mismatch After Restore

**Symptoms**: Restore completes but shows warnings like:
```
⚠️  notes: restored 240 rows (expected 243)
```

**Possible causes**:
- Backup was taken while data was being written (rare)
- Schema changed between backup and restore
- Data corruption in backup file

**Action**:
- If mismatch is small (1-5 rows): Likely okay, verify app works
- If mismatch is large (>10 rows): Try restoring from a different backup date

### Encrypted Data Won't Decrypt After Restore

**Symptoms**: Journal entries show garbled text or decryption errors

**Cause**: This is **NOT a backup issue**. Encrypted data is restored exactly as it was.

**Possible reasons**:
- Wrong encryption passphrase entered
- Encryption key changed (unlikely unless you reset it)
- Browser cache cleared (encryption key stored in browser)

**Action**:
- Verify you're using the correct passphrase
- Check browser console for encryption errors
- If key is truly lost, encrypted data is unrecoverable (by design)

## Quarterly Restore Drill (Recommended)

**Why**: Backups are only useful if they work. Test regularly to ensure you can actually restore.

**Procedure** (every 3 months):

1. Set up a **test Supabase project** (free tier is fine)
2. Get test project credentials (URL + secret key)
3. Download latest backup from GitHub
4. Run restore on test project:
   ```bash
   SUPABASE_URL=<test-url> SUPABASE_SECRET_KEY=<test-key> \
   npx tsx scripts/restore-supabase.ts 2025-01-10
   ```
5. Verify row counts match
6. Spot-check: View tables in Supabase dashboard to confirm data looks correct
7. **Delete test project** after verification

**Set calendar reminder**: Every 3 months (March, June, September, December)

## Security Considerations

### Backup Storage Security

- **Private GitHub repo**: Only you have access (requires authentication)
- **GitHub 2FA**: Enable two-factor authentication on your GitHub account
- **Secret key**: Stored as GitHub Secret (encrypted at rest, not visible in logs)
- **Encrypted fields**: Remain encrypted in backups (even if GitHub is compromised, journals are unreadable)

### Best Practices

1. **Never commit** `.env.local` to git (contains secret key)
2. **Use GitHub 2FA** to protect backup repository
3. **Rotate secret key** annually (update GitHub Secret)
4. **Test restores** quarterly to ensure backups work
5. **Keep encryption passphrase** in a password manager (NOT in code/backups)

## Future Enhancements (Not Implemented Yet)

### 1. Incremental Backups
**What**: Only backup changed rows (based on `updated_at` timestamps)

**Benefits**: Smaller backup size, faster uploads

**Status**: Deferred (current full backups are small enough)

### 2. Multi-Region Backups
**What**: Replicate backups to S3/Cloudflare R2 in addition to GitHub

**Benefits**: Geographic redundancy, faster restore from cloud storage

**Status**: Deferred (GitHub is sufficient for single-user app)

### 3. Point-in-Time Recovery
**What**: Backups every 6 hours (instead of daily)

**Benefits**: Recover from accidental deletion within a day

**Status**: Deferred (7-day daily backups are sufficient)

### 4. Selective Restore
**What**: Restore individual tables (not full database)

**Benefits**: Faster recovery for single-table issues

**Status**: Deferred (can be added if needed)

## FAQ

### Q: Can I download backups manually?

**A**: Yes! Backups are stored in your GitHub repository under `/backups/`.

You can:
- Clone the repo: `git clone https://github.com/your-username/chrononaut.git`
- Download directly from GitHub: Navigate to `/backups/YYYY-MM-DD/` and download individual files
- Download as artifact: GitHub Actions uploads each backup as a downloadable artifact (7-day retention)

### Q: What if I accidentally delete my GitHub repository?

**A**: Your backups are gone (they're stored in the repo).

**Mitigations**:
- GitHub makes it hard to delete repos (requires typing repo name)
- Enable branch protection on `main` branch
- Consider periodic local downloads (clone repo monthly)

### Q: Can I restore to a different Supabase project?

**A**: Yes! Just use the new project's credentials when running restore:

```bash
SUPABASE_URL=<new-project-url> SUPABASE_SECRET_KEY=<new-key> \
npx tsx scripts/restore-supabase.ts 2025-01-10
```

**Important**: Schema must match (same migration version). Check `backup-metadata.json` for schema version.

### Q: How much does this cost?

**A**:
- **GitHub Actions**: Free (2,000 minutes/month, uses ~150 min/month)
- **GitHub Storage**: Free for first 1GB (uses ~210MB for 7 days)
- **Total**: **$0/month** (vs $25/month for Supabase Pro backups)

### Q: What if a backup fails?

**A**: GitHub Actions will:
- Send you an email notification (check your GitHub notification settings)
- Mark the workflow run as failed (red X in Actions tab)
- Retain previous backups (they won't be deleted)

You can manually trigger a backup after fixing the issue.

### Q: Can I change the backup schedule?

**A**: Yes! Edit `.github/workflows/backup-database.yml`:

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Change time here (UTC)
```

Examples:
- `0 6 * * *` = 6 AM UTC daily
- `0 2 * * 0` = 2 AM UTC every Sunday (weekly)
- `0 2 1 * *` = 2 AM UTC on 1st of month (monthly)

Commit and push to activate new schedule.

## Support

If you encounter issues:
1. Check this documentation first
2. Review GitHub Actions logs for error details
3. Verify Supabase credentials are correct
4. Try a dry-run restore to diagnose issues

For backup script bugs or feature requests, open an issue in the repository.

---

**Remember**: Backups are insurance. Test them regularly to ensure they work when you need them!
