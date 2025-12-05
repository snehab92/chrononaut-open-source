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

*None yet*

---

## 🟢 Low Priority (Nice to have)

*None yet*

---

## ✅ Resolved

*None yet*
