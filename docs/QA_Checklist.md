# Chrononaut QA Checklist

## Dashboard Screen

### Calendar Widget
- [ ] Events display correctly with time and title
- [ ] Today's events are highlighted appropriately
- [ ] All-day events display correctly (no time shown)
- [ ] Multi-day events appear on each relevant day
- [ ] Clicking an event shows event details
- [ ] Events from all Google Calendar accounts appear (not just primary)
- [ ] Cancelled events are hidden or marked appropriately

### Task Widget
- [ ] Tasks load from TickTick
- [ ] Task checkboxes toggle completion state
- [ ] Completed tasks are styled differently (strikethrough/fade)
- [ ] Due dates display correctly
- [ ] Overdue tasks show visual indicator
- [ ] Task priorities display (!high, !med, !low)
- [ ] Clicking a task allows editing

### Sync Status
- [ ] Sync button appears when integrations connected
- [ ] Manual sync (click button) triggers sync
- [ ] 60-second auto-sync polling works
- [ ] Page focus triggers sync
- [ ] Sync spinner animates during sync
- [ ] "Last synced" time updates after sync
- [ ] Initial sync happens on page load

### Meeting Notes Button
- [ ] "Open Meeting Note" button appears for events with linked notes
- [ ] Button shows active state when note exists
- [ ] Clicking button navigates to Notes screen with correct note open
- [ ] "< Back to [Folder]" card appears at top for navigation back
- [ ] If note has no folder, shows "< Back to Unfiled"

### Habits Section
- [ ] Sleep card displays WHOOP data correctly
- [ ] Sleep card has aligned bottom divider
- [ ] Meditation card displays streak/progress
- [ ] Meditation card divider aligns with other cards
- [ ] Exercise card displays workout data
- [ ] Exercise card divider aligns with other cards
- [ ] Growth section displays reading/learning metrics
- [ ] Mood section captures mood entries
- [ ] Compass section shows values alignment

---

## Quick Task Modal

### Triggering
- [ ] `/t` keyboard shortcut opens modal
- [ ] Shortcut works from any page (dashboard, focus, notes, journal)
- [ ] Shortcut doesn't trigger when focused in text input/textarea
- [ ] Global nav button shows `/t` hint (not Cmd+T)
- [ ] Clicking nav button opens modal

### Task Input
- [ ] Text input field is auto-focused on open
- [ ] Enter key submits task
- [ ] Escape key closes modal without saving
- [ ] X button closes modal

### Priority Shorthand
- [ ] `!high` sets high priority
- [ ] `!med` sets medium priority
- [ ] `!low` sets low priority
- [ ] Priority badge appears in preview when set

### Due Date Shorthand
- [ ] `today` sets due date to today
- [ ] `tomorrow` sets due date to tomorrow (NOT today)
- [ ] `monday` through `sunday` sets due date to next occurrence
- [ ] Date badge appears in preview when set
- [ ] Dates respect local timezone (noon local time)

### List Picker
- [ ] List picker dropdown button visible
- [ ] Default shows "Inbox"
- [ ] Clicking dropdown shows all TickTick projects
- [ ] Selecting a project updates button display
- [ ] Task is created in selected list

### Instruction Text
- [ ] Shows `!high !med !low today tomorrow monday`
- [ ] No longer shows `#list` or `^section`

### Task Creation
- [ ] Task successfully creates in TickTick
- [ ] Task appears in dashboard after sync
- [ ] Error states handled gracefully

---

## Focus Screen

### Focus Calendar Widget
- [ ] Shows events for selected time period
- [ ] Event cards display correctly
- [ ] Time blocks align properly

### Focus Task List
- [ ] Priority tasks display at top
- [ ] Tasks can be checked off
- [ ] Due dates respected

### Focus Note Editor
- [ ] Rich text editor loads
- [ ] Can create/edit focus notes
- [ ] Notes save automatically

---

## Notes Screen

### Folder Navigation
- [ ] Folder list displays in sidebar
- [ ] Clicking folder shows folder contents
- [ ] "Unfiled" section accessible
- [ ] "All Notes" view available

### Note Editor
- [ ] Rich text editor loads correctly
- [ ] Bold, italic, underline work
- [ ] Headings work
- [ ] Lists (bulleted/numbered) work
- [ ] Code blocks work
- [ ] Links can be added
- [ ] Auto-save works

### Back Navigation
- [ ] When opening note via URL param, "< Back to [Folder]" appears
- [ ] Clicking back returns to correct folder view
- [ ] If note is unfiled, shows "< Back to Unfiled"

### Meeting Event Context
- [ ] Notes linked to calendar events show event badge
- [ ] Event details accessible from note

---

## Journal Screen

### Entry Creation
- [ ] Can create new journal entries
- [ ] Date picker works
- [ ] Rich text editor loads

### Entry List
- [ ] Previous entries display
- [ ] Entries sorted by date
- [ ] Can navigate between entries

---

## Integrations

### Google Calendar
- [ ] OAuth flow completes successfully
- [ ] Token refresh works when expired
- [ ] All calendars sync (not just primary)
- [ ] Hidden calendars included (reservations, etc.)
- [ ] Events appear within 7 days past to 30 days future
- [ ] Disconnect flow works

### TickTick
- [ ] OAuth flow completes successfully
- [ ] Token refresh works when expired
- [ ] All projects/lists accessible
- [ ] Tasks sync correctly
- [ ] Task creation works
- [ ] Task completion syncs back

### WHOOP
- [ ] OAuth flow completes successfully
- [ ] Sleep data syncs
- [ ] Recovery data syncs
- [ ] Workout data syncs

---

## Global Navigation

### App Shell
- [ ] Sidebar collapses/expands correctly
- [ ] Navigation links work (Dashboard, Focus, Notes, Journal)
- [ ] Active page highlighted
- [ ] User menu accessible
- [ ] Quick task button visible with `/t` hint
- [ ] Keyboard shortcuts work

### Keyboard Shortcuts
- [ ] `/t` opens quick task modal
- [ ] Other shortcuts don't conflict with browser

---

## Data & Sync

### Initial Load
- [ ] Integration connection status checks on mount
- [ ] Initial sync happens after connection verified
- [ ] Data loads without race conditions

### Polling
- [ ] 60-second polling interval maintained
- [ ] Polling doesn't duplicate if already syncing

### Error Handling
- [ ] API errors don't crash app
- [ ] User-friendly error messages displayed
- [ ] Retry logic for transient failures

---

## Performance

- [ ] Initial page load under 3 seconds
- [ ] Sync operations don't block UI
- [ ] Scrolling is smooth
- [ ] No memory leaks on navigation

---

## Debug Checklist (For Missing Events)

If a Google Calendar event isn't appearing:

1. **Check Console Logs During Sync**
   - [ ] Look for "Google API returned X calendars" - is the event's calendar listed?
   - [ ] Look for "Fetching events from X calendars" - is the calendar being queried?
   - [ ] Look for the event in "📅 [Calendar Name]: X events" section
   - [ ] Check for any "❌ Failed to fetch" errors

2. **Event Properties**
   - [ ] Is the event in the future (within 30 days)?
   - [ ] Is the event's status "confirmed" (not cancelled)?
   - [ ] Is the user the organizer or an attendee?

3. **Calendar Properties**
   - [ ] Is the calendar visible in Google Calendar?
   - [ ] What is the accessRole (owner/writer/reader)?

4. **Token Status**
   - [ ] Is the access token valid?
   - [ ] Has the refresh token expired?

---

## Recent Fixes Reference

| Issue | Fix Applied | Files Changed |
|-------|-------------|---------------|
| Quick task shortcut conflicts with browser | Changed from Cmd+Shift+T to /t | app-shell.tsx, quick-task-dialog.tsx |
| "tomorrow" parsed as today | Changed date format to local noon time | quick-add-parser.ts |
| #list shorthand not working | Replaced with list picker dropdown | quick-task-dialog.tsx |
| GCal only syncing primary calendar | Fetch from all calendars with read access | calendar.ts |
| Race condition in initial sync | Added force options for verified connections | combined-sync-status.tsx |
| Habits cards misaligned | Fixed flexbox structure with mt-auto footer | habits-section.tsx |
| Meeting note opens wrong note | Fixed URL param handling | notes/page.tsx |
