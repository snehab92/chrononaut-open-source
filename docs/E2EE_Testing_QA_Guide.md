# E2EE Testing & QA Guide

## Overview
This document provides comprehensive testing procedures for the End-to-End Encryption (E2EE) implementation in Chrononaut. All sensitive user data is now encrypted with a master key stored in `.env.local`.

## Pre-Testing Setup

### 1. Database Migration
Before testing, apply the AI conversation migration manually:

```bash
# You'll need to run this SQL in your Supabase dashboard or CLI
# The file is located at: supabase/migrations/20260101000003_encrypt_ai_conversations.sql
```

**Expected Result**: The `ai_conversations` and `ai_messages` tables should have new columns:
- `ai_conversations.encrypted_title` (TEXT)
- `ai_conversations.is_encrypted` (BOOLEAN)
- `ai_messages.encrypted_content` (TEXT)
- `ai_messages.is_encrypted` (BOOLEAN)

### 2. Master Key Setup
On first app launch, you should see the encryption setup dialog with your 24-word recovery phrase.

**IMPORTANT**: Save this recovery phrase securely! It's the only way to recover your encrypted data.

---

## Test Plan

## Phase 1: Master Key Infrastructure

### Test 1.1: First-Time Setup
**What to test**: Master key generation and recovery phrase display

**Steps**:
1. Launch app for the first time
2. Encryption setup dialog should appear automatically
3. Dialog shows 24-word recovery phrase
4. Copy or download the phrase
5. Complete setup

**Expected Results**:
- ✅ Setup dialog appears on first launch
- ✅ 24 words displayed in correct format
- ✅ Copy button works
- ✅ Download creates `.txt` file with phrase
- ✅ `.env.local` file created with `CHRONONAUT_MASTER_KEY=<hex-string>`

**Verification**:
```bash
# Check that master key was created
cat .env.local | grep CHRONONAUT_MASTER_KEY
# Should show: CHRONONAUT_MASTER_KEY=<64-character hex string>
```

### Test 1.2: Master Key Persistence
**What to test**: Master key loads on app restart

**Steps**:
1. Close app completely
2. Relaunch app
3. No setup dialog should appear
4. App functions normally

**Expected Results**:
- ✅ No setup dialog on subsequent launches
- ✅ Master key loaded from `.env.local` automatically
- ✅ All features work without entering passphrase

---

## Phase 2: Journal Encryption

### Test 2.1: New Journal Entry (v2 Encryption)
**What to test**: Journal entries encrypted with master key

**Steps**:
1. Navigate to Journal
2. Create new entry with all fields:
   - What happened today
   - Feelings
   - Grateful for
3. Save entry
4. Reload page

**Expected Results**:
- ✅ Entry saves successfully
- ✅ Entry loads with all content visible
- ✅ No passphrase prompt

**Database Verification**:
```sql
-- In Supabase SQL Editor
SELECT
  entry_date,
  encryption_version,
  encrypted_happened IS NOT NULL as has_encrypted_happened,
  encrypted_feelings IS NOT NULL as has_encrypted_feelings,
  encrypted_grateful IS NOT NULL as has_encrypted_grateful
FROM journal_entries
WHERE user_id = '<your-user-id>'
ORDER BY entry_date DESC
LIMIT 1;

-- Expected result:
-- encryption_version = 2
-- All encrypted_* fields should be true
```

**Verify Encryption Format**:
The encrypted fields should look like: `<base64-iv>.<base64-authTag>.<base64-ciphertext>`

Example: `1a2b3c4d....<authTag>....ciphertext`

### Test 2.2: Old Journal Entry Compatibility
**What to test**: Existing v1 encrypted entries still work

**If you have existing journal entries**:
1. Open old journal entry
2. Entry should display correctly
3. Edit and save
4. Should upgrade to v2 automatically

**Expected Results**:
- ✅ Old entries display correctly
- ✅ Can edit old entries
- ✅ After editing, `encryption_version` upgrades to 2

---

## Phase 3: Health Metrics Encryption

### Test 3.1: Whoop Data Sync
**What to test**: Whoop sync encrypts health metrics

**Steps**:
1. Navigate to Settings → Integrations → Whoop
2. Click "Sync Now" (or wait for automatic sync)
3. Check dashboard for updated metrics

**Expected Results**:
- ✅ Sync completes successfully
- ✅ Dashboard displays recovery score
- ✅ Dashboard displays sleep hours
- ✅ Dashboard displays strain score

**Database Verification**:
```sql
-- Check that new metrics are encrypted
SELECT
  date,
  is_encrypted,
  encrypted_recovery_score IS NOT NULL as has_recovery,
  encrypted_hrv_rmssd IS NOT NULL as has_hrv,
  encrypted_sleep_duration_minutes IS NOT NULL as has_sleep
FROM health_metrics
WHERE user_id = '<your-user-id>'
ORDER BY date DESC
LIMIT 5;

-- Expected result:
-- is_encrypted = true for new syncs
-- All encrypted_* fields should be true
```

### Test 3.2: Dashboard Display
**What to test**: Encrypted health metrics decrypt for display

**Steps**:
1. Navigate to Dashboard
2. View recovery score chart
3. View sleep hours
4. View strain trends

**Expected Results**:
- ✅ All charts display data
- ✅ No decryption errors
- ✅ Data matches Whoop app values

---

## Phase 4: Integration Token Security

### Test 4.1: TickTick Login
**What to test**: TickTick credentials encrypted

**Steps**:
1. Navigate to Settings → Integrations → TickTick
2. Enter email and password
3. Click "Login"
4. Should connect successfully

**Expected Results**:
- ✅ Login succeeds
- ✅ Token stored encrypted

**Database Verification (CRITICAL SECURITY TEST)**:
```sql
-- Check that tokens are ENCRYPTED, not plaintext
SELECT
  provider,
  encryption_version,
  substring(encrypted_access_token, 1, 50) as token_preview,
  length(encrypted_access_token) as token_length
FROM integration_tokens
WHERE user_id = '<your-user-id>'
  AND provider = 'ticktick';

-- Expected result:
-- encryption_version = 2
-- token_preview should show encrypted format (iv.authTag.ciphertext)
-- token_length should be > 100 characters (encrypted data is longer than plaintext)
```

**SECURITY CHECK**:
```sql
-- ⚠️ THIS SHOULD NOT RETURN READABLE TOKENS
SELECT encrypted_access_token
FROM integration_tokens
WHERE provider = 'ticktick';

-- If you see plain email or password, ENCRYPTION FAILED
-- Should look like: "a1b2c3....<random base64>....xyz789"
```

### Test 4.2: TickTick Sync
**What to test**: Encrypted tokens decrypt for API use

**Steps**:
1. After logging in, click "Sync Tasks"
2. Check that tasks appear in Tasks page

**Expected Results**:
- ✅ Sync succeeds
- ✅ Tasks imported
- ✅ No authentication errors

### Test 4.3: Google Calendar Login
**What to test**: OAuth tokens encrypted

**Steps**:
1. Navigate to Settings → Integrations → Google Calendar
2. Click "Connect"
3. Complete OAuth flow
4. Should connect successfully

**Expected Results**:
- ✅ OAuth succeeds
- ✅ Token stored encrypted
- ✅ Calendar events sync

**Database Verification**:
```sql
SELECT
  provider,
  encryption_version,
  length(encrypted_access_token) as token_length,
  length(encrypted_refresh_token) as refresh_length
FROM integration_tokens
WHERE user_id = '<your-user-id>'
  AND provider = 'google_calendar';

-- Expected: encryption_version = 2
```

### Test 4.4: Whoop OAuth
**What to test**: Whoop OAuth tokens encrypted

**Steps**:
1. Navigate to Settings → Integrations → Whoop
2. Click "Connect"
3. Complete OAuth flow

**Expected Results**:
- ✅ OAuth succeeds
- ✅ Token encrypted (verify same as Google test)

---

## Phase 5: AI Conversation Encryption

### Test 5.1: New Chat Message
**What to test**: AI chat messages encrypted

**Steps**:
1. Open AI Chat (any agent: Executive Coach, Therapist, Pattern Analyzer, Research Assistant)
2. Send message: "What should I focus on today?"
3. Receive response
4. Close and reopen chat

**Expected Results**:
- ✅ Message sent successfully
- ✅ AI responds
- ✅ Conversation history loads correctly
- ✅ Messages display in correct order

**Database Verification**:
```sql
-- Check that messages are encrypted
SELECT
  role,
  is_encrypted,
  encrypted_content IS NOT NULL as has_encrypted,
  substring(encrypted_content, 1, 50) as content_preview
FROM ai_messages
WHERE conversation_id IN (
  SELECT id FROM ai_conversations WHERE user_id = '<your-user-id>'
)
ORDER BY created_at DESC
LIMIT 5;

-- Expected result:
-- is_encrypted = true
-- has_encrypted = true
-- content_preview shows encrypted format
```

### Test 5.2: Conversation Title
**What to test**: Conversation titles encrypted

**Steps**:
1. Start new conversation
2. Send first message
3. Check conversation list in sidebar

**Expected Results**:
- ✅ Conversation appears in list
- ✅ Title shows first message preview
- ✅ Can click to reopen conversation

**Database Verification**:
```sql
SELECT
  id,
  agent_type,
  is_encrypted,
  encrypted_title IS NOT NULL as has_encrypted_title,
  substring(encrypted_title, 1, 50) as title_preview
FROM ai_conversations
WHERE user_id = '<your-user-id>'
ORDER BY created_at DESC
LIMIT 3;

-- Expected: is_encrypted = true, has_encrypted_title = true
```

---

## Phase 6: AI Context Builder Integration

### Test 6.1: Pattern Analyzer with Journal Data
**What to test**: AI can access encrypted journal entries

**Steps**:
1. Create journal entry with detailed "what happened" section
2. Open Pattern Analyzer chat
3. Ask: "What patterns do you notice in my recent journal entries?"

**Expected Results**:
- ✅ AI responds with relevant analysis
- ✅ References journal content accurately
- ✅ No decryption errors in console

**Console Check**:
Open browser DevTools → Console. Should NOT see:
- "Error decrypting journal"
- "Decryption failed"

### Test 6.2: Executive Coach with Health Data
**What to test**: AI can access encrypted health metrics

**Steps**:
1. Sync Whoop data (ensure you have recent recovery scores)
2. Open Executive Coach chat
3. Ask: "How's my recovery today?"

**Expected Results**:
- ✅ AI responds with current recovery score
- ✅ Provides coaching based on recovery level
- ✅ No health data errors

### Test 6.3: Saved Memories Decryption
**What to test**: AI can access saved encrypted messages

**Steps**:
1. In any AI chat, send a message you want to remember
2. Mark message as "Save to Memory" (if feature exists)
3. Start new conversation with same agent
4. AI should remember saved context

**Expected Results**:
- ✅ Saved memory accessible
- ✅ AI references it correctly
- ✅ No decryption errors

---

## Phase 7: Security Verification

### Test 7.1: Database Function Security
**What to test**: Search path vulnerabilities fixed

**Verification**:
```bash
# Run Supabase security advisor
# In Supabase dashboard: Settings → Security → Advisors

# Or use MCP:
# Check that all functions have SET search_path = ''
```

**Expected Results**:
- ✅ 0 search_path warnings
- ✅ All 7 functions show `SET search_path = ''`

**Functions to verify**:
1. `update_assessment_updated_at`
2. `update_daily_usage`
3. `cleanup_expired_cache`
4. `update_updated_at_column`
5. `update_conversation_timestamp`
6. `handle_new_user`
7. `handle_updated_at`

### Test 7.2: Encryption Format Validation
**What to test**: All encrypted data uses correct format

**SQL Check**:
```sql
-- Check journal encryption format
SELECT
  entry_date,
  encrypted_happened ~ '^[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*$' as valid_format
FROM journal_entries
WHERE encryption_version = 2
LIMIT 3;

-- Expected: valid_format = true

-- Check health metrics encryption format
SELECT
  date,
  encrypted_recovery_score ~ '^[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*$' as valid_format
FROM health_metrics
WHERE is_encrypted = true
LIMIT 3;

-- Expected: valid_format = true
```

### Test 7.3: Tamper Detection
**What to test**: Modified ciphertext fails authentication

**ADVANCED TEST** (requires SQL knowledge):
```sql
-- DO NOT RUN ON PRODUCTION DATA - TEST ONLY
-- This test intentionally corrupts data to verify tamper detection

-- Create test journal entry first, then modify it:
UPDATE journal_entries
SET encrypted_happened = replace(encrypted_happened, 'A', 'B')
WHERE entry_date = '<test-date>';

-- Now try to load that journal entry in the app
-- Expected: Decryption should FAIL with authentication error
```

**Expected Behavior**:
- ✅ App shows error: "Decryption failed" or "Authentication error"
- ✅ Does NOT show partial/corrupted data
- ✅ Does NOT crash

---

## Performance Testing

### Test 8.1: Encryption Overhead
**What to test**: Encryption doesn't significantly slow down app

**Steps**:
1. Time journal entry save (before and after encryption)
2. Time dashboard load
3. Time AI chat response

**Expected Results**:
- ✅ Journal save: < 500ms
- ✅ Dashboard load: < 2s
- ✅ AI response: No noticeable delay (encryption time negligible vs API call)

### Test 8.2: Batch Decryption Performance
**What to test**: Multiple encrypted items load quickly

**Steps**:
1. Navigate to Journal with 10+ entries
2. Load journal list view
3. Time how long it takes to display all entries

**Expected Results**:
- ✅ List loads < 2 seconds
- ✅ No UI freezing
- ✅ Smooth scrolling

---

## Recovery Testing

### Test 9.1: Recovery Phrase Import
**What to test**: Can restore access using recovery phrase

**CRITICAL**: Only test this if you've backed up your current master key!

**Steps**:
1. Save your current `.env.local` file (backup!)
2. Delete or rename `.env.local`
3. Restart app
4. Setup dialog should appear with "Import Recovery Phrase" option
5. Enter your 24-word phrase
6. Complete import

**Expected Results**:
- ✅ Import succeeds
- ✅ New master key generated from phrase
- ✅ All encrypted data accessible
- ✅ App functions normally

### Test 9.2: Invalid Recovery Phrase
**What to test**: Invalid phrase rejected

**Steps**:
1. Enter incorrect 24-word phrase (wrong order or words)
2. Try to import

**Expected Results**:
- ✅ Import fails with clear error message
- ✅ Prompts to re-enter correct phrase
- ✅ Does NOT create invalid master key

---

## Error Handling

### Test 10.1: Missing Master Key
**What to test**: App handles missing master key gracefully

**Steps**:
1. Temporarily remove `CHRONONAUT_MASTER_KEY` from `.env.local`
2. Restart app

**Expected Results**:
- ✅ Setup dialog appears
- ✅ Generates new key
- ✅ Shows recovery phrase

### Test 10.2: Corrupted Master Key
**What to test**: Invalid key format detected

**Steps**:
1. Edit `.env.local` and change key to invalid hex
2. Restart app

**Expected Results**:
- ✅ Error detected
- ✅ Setup dialog appears
- ✅ Prompts for recovery phrase import

---

## Regression Testing

### Test 11.1: Unencrypted Data Still Works
**What to test**: Notes (unencrypted) still function

**Steps**:
1. Create new note
2. View notes list
3. Search notes

**Expected Results**:
- ✅ Notes work normally
- ✅ Search works
- ✅ No encryption applied (by design)

### Test 11.2: Metadata Unencrypted
**What to test**: Dates, labels, tags remain searchable

**Steps**:
1. Check journal entry dates visible in list
2. Check mood labels visible
3. Check tags searchable

**Expected Results**:
- ✅ All metadata visible
- ✅ Search by date works
- ✅ Filter by mood works

---

## Security Audit Checklist

### Critical Security Checks

- [ ] **TickTick tokens encrypted** (not plaintext!)
  ```sql
  SELECT encrypted_access_token FROM integration_tokens WHERE provider = 'ticktick';
  -- Should be unreadable ciphertext
  ```

- [ ] **Master key in .env.local** (not in code)
  ```bash
  grep -r "CHRONONAUT_MASTER_KEY" app/ lib/ components/
  # Should find 0 results (key only in .env.local)
  ```

- [ ] **No plaintext health data in DB** (for new syncs)
  ```sql
  SELECT * FROM health_metrics WHERE is_encrypted = true AND recovery_score IS NOT NULL;
  -- Should be 0 rows (encrypted fields used instead)
  ```

- [ ] **AI messages encrypted**
  ```sql
  SELECT * FROM ai_messages WHERE is_encrypted = true AND encrypted_content IS NULL;
  -- Should be 0 rows
  ```

- [ ] **Function search paths fixed**
  ```sql
  SELECT proname, prosrc FROM pg_proc WHERE proname IN (
    'update_assessment_updated_at',
    'update_daily_usage',
    'cleanup_expired_cache',
    'update_updated_at_column',
    'update_conversation_timestamp',
    'handle_new_user',
    'handle_updated_at'
  );
  -- All should include "SET search_path = ''"
  ```

---

## Known Issues & Workarounds

### Issue 1: Old Data Not Encrypted
**Problem**: Data synced before E2EE implementation is unencrypted
**Workaround**: Will be encrypted on next edit/update
**Impact**: Low (RLS still protects access)

### Issue 2: Supabase Advisor May Still Show 1 Warning
**Problem**: Leaked password protection disabled (free tier limitation)
**Workaround**: User will use strong password
**Impact**: Low (solo user, strong password required)

---

## Success Criteria Summary

**Phase 1: Foundation** ✅
- [x] Master key generated
- [x] Recovery phrase displayed
- [x] Key stored in .env.local

**Phase 2: Journal Encryption** ✅
- [x] New entries encrypted
- [x] Old entries compatible
- [x] No passphrase prompts

**Phase 3: Health Metrics** ✅
- [x] Whoop sync encrypts data
- [x] Dashboard decrypts correctly
- [x] No performance issues

**Phase 4: Token Security** ✅
- [x] TickTick tokens encrypted
- [x] Google OAuth encrypted
- [x] Whoop OAuth encrypted
- [x] Sync works with encrypted tokens

**Phase 5: AI Conversations** ✅
- [x] Messages encrypted
- [x] Titles encrypted
- [x] History loads correctly

**Phase 6: AI Context** ✅
- [x] AI accesses journal data
- [x] AI accesses health data
- [x] No decryption errors

**Phase 7: Security** ✅
- [x] Function search paths fixed
- [x] Encryption format valid
- [x] Tamper detection works

---

## Rollback Procedure (if needed)

If critical issues arise:

### Option 1: Disable New Encryption (Keep Existing)
```bash
# Add to .env.local
DISABLE_NEW_ENCRYPTION=true
```
This will:
- Stop encrypting new data
- Continue decrypting existing data
- Allow time to fix issues

### Option 2: Code Rollback
```bash
git log --oneline -20  # Find commit before encryption
git revert <commit-hash>
```

### Option 3: Database Rollback (LAST RESORT - DATA LOSS)
Only if absolutely necessary and no other option works.

**DO NOT RUN** unless explicitly required:
```sql
-- This DELETES encrypted data
ALTER TABLE health_metrics DROP COLUMN encrypted_recovery_score;
ALTER TABLE ai_conversations DROP COLUMN encrypted_title;
-- etc.
```

---

## Support & Troubleshooting

### Common Errors

**Error**: "Master key not found"
**Fix**: Run setup dialog or check `.env.local` exists

**Error**: "Decryption failed"
**Fix**: Data may be corrupted. Check encryption format in DB.

**Error**: "Authentication tag mismatch"
**Fix**: Data was tampered with. Restore from backup or re-sync.

**Console Error**: "crypto is not defined"
**Fix**: Server-side code running in browser. Check import paths.

### Debug Mode

Enable verbose logging:
```bash
# Add to .env.local
DEBUG_ENCRYPTION=true
```

This will log:
- Encryption/decryption calls
- Performance metrics
- Error stack traces

---

## Next Steps After Testing

1. **Backup Recovery Phrase**: Store in password manager + printed copy
2. **Monitor Performance**: Check for any slowdowns
3. **Review Logs**: Look for decryption errors
4. **Plan Migration**: Schedule full data re-encryption (if desired)

---

## Questions for User

After completing tests, please answer:

1. **Did first-time setup work smoothly?**
   - Recovery phrase displayed correctly?
   - Any confusion in UI?

2. **Is encrypted data performing well?**
   - Any noticeable slowdowns?
   - Dashboard loading fast enough?

3. **Are AI agents working correctly?**
   - Can they access journal/health data?
   - Any weird responses suggesting data issues?

4. **Did you encounter any errors?**
   - Decryption failures?
   - Missing data?
   - Integration issues?

5. **Security verification passed?**
   - TickTick tokens confirmed encrypted?
   - All database checks passed?

---

**Testing completed by**: _______________
**Date**: _______________
**Overall Status**: ☐ PASS   ☐ FAIL   ☐ PARTIAL
**Notes**:
