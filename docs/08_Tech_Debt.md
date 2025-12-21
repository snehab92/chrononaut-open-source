# Tech Debt Tracker

Track shortcuts and hacks that need fixing before production.

---

## 🔴 High Priority (Must fix before launch)

### 1. Integration Token Encryption
**File:** `app/api/integrations/ticktick/callback/route.ts`  
**Issue:** OAuth tokens stored as plaintext in `encrypted_access_token` and `encrypted_refresh_token` fields  
**Risk:** Security vulnerability - tokens could be exposed if database is compromised  
**Fix:** Implement server-side AES-256 encryption before storing tokens  
**Added:** 2025-12-05

---

## 🟡 Medium Priority (Fix before public release)

### 1. TickTick Sections Not Syncing Properly
**Files:** `lib/ticktick/sync.ts`, `lib/ticktick/client.ts`
**Issue:** Task sections (columns) from TickTick not showing in task badges despite sync code updates
**Background:**
- TickTick's `batch/check` API endpoint doesn't return `columnId` for tasks
- Updated sync to fetch project data separately via `getProjectData()` to get columnId
- Created `taskColumnMap` to map task IDs to their column IDs
- Sections/columns are fetched correctly, but tasks in database still have `ticktick_section_name: null`
**Investigation needed:**
- Check if columnId mapping is working correctly during sync
- Verify section names are being looked up from the `sectionNameMap`
- May need to debug actual API responses from TickTick
**Workaround:** Section badges don't show on tasks, users can still see sections in TickTick
**Added:** 2025-12-21

---

## 🟢 Low Priority (Nice to have)

*None yet*

---

## ✅ Resolved

*None yet*
