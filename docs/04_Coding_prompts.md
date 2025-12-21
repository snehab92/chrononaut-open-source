Coding QA and Implementation Prompts:

***December 20th, 2025 - Focus Screen***

**Context:** I have completed a QA pass of the current focus build. Below is a prioritized list of fixes, UI updates, and logic changes required. Please address these point-by-point.

**Architectural Question**

**Refactoring:** Regarding `task-list`, `calendar-context`, and `note-editor`: These containers are replicated across screens. Would it be simpler to source these from a single component file so enhancements (like the badge update mentioned above) automatically propagate everywhere? If so, please refactor or explain the constraint.

#### **I. Critical Bugs & Logic Fixes**

1. **Session Persistence (Priority):**
* **Issue:** Session state is not persisting across page navigation. (e.g., I loaded an AI-insight note, navigated to the Notes screen, and when I returned, the session was gone).
* **Fix:** Ensure session state persists correctly when navigating between views.


2. **Meeting Notes Routing:**
* **Current Behavior:** UX breaks when returning to a meeting that already has a note created.
* **Fix:** Once a meeting note is created, link it to the calendar event.
* **Update:** Change the action button from "Start Meeting Note" to "Open Meeting Note" if a note exists, and route directly to that note in the Focus screen.
**Update:** "Start Meeting Notes" -> "Start Meeting Note". It should be singular.


3. **Note Editor Functionality:**
* **Issue:** The `folder` and `document type` buttons in the Focus screen note editor are currently non-functional. Please fix.



#### **II. UI/UX Improvements**

**A. Task List & Dashboard**

* **Badges:**
* **Logic:** Show *both* List and Section badges on tasks. (Hide the section badge only if the list has no sections).
* **Styling:** Color each list and section badge distinctly to aid visual scanning.
* **Consistency:** Replicate these badge updates on the **Dashboard screen** task list as well (currently missing there).



**B. Quick Start Card (Redesign for Dopamine/Focus)**

* **Objective:** Redesign this card to be a high-dopamine, low-friction entry point. It should feel "gamified" and rewarding to click.
* **Layout & Interaction:**
* **Make it clickable:** The *entire* card (especially the title) should be the trigger. Remove the generic "AI Help" button and text.
* **Micro-interactions:** Add a "tactile" feel. On hover, the card should lift slightly or glow. On click, it should depress or ripple to provide instant confirmation (gratification) before the action executes.
* **Visuals:** Use a clean, high-contrast design. Use a warm, energizing accent color for the active elements to distinguish them from the rest of the interface, but keep the text concise to avoid cognitive load.
* **Remove Duplicate:** Remove the specific "Start Timer" button from this card (since it exists on the task card). The card itself is the "Start" action.



**C. Timer & Header**

* **Session Timer Design:** Visually connect the session timer to the chosen session type.
* *Example:* If I select "Writing," show the timer immediately next to it with a small "End" button.


* **Task Timer Layout:**
* Place the task timer to the right of the session timer.
* Allow the task title to wrap so the full text is readable.
* **Controls:** Make Pause/Abandon/Done buttons small and subtle (remove the bright green coloring to reduce visual noise).



**D. Notes Interface**

* **Toolbar Parity:** Ensure the Focus screen note editor toolbar is 1:1 with the main Notes screen.
* *Specific:* Display the Label name visibly (do not just show a "+1" icon).


* **Note Tabs & Navigation (New Design):**
* Keep the Search Notes bar and "New Note" (+) button static at the top of the container.
* Remove the duplicate "New Note" action button inside the loaded note.
* **Feature:** When a new note is selected from the search, open it as a **tab** within the note editor. This allows toggling between multiple active documents without losing context.

 
#### **III. General Inquiry**

* Are "Focus Cues" currently live in this build? If so, how can I test them?

```
### **QA Prompt #2**

## QA Checklist - December 20th Focus Screen Fixes

### I. Critical Bugs & Logic Fixes

#### 1. Session Persistence
- [x] Start a focus session (click "Start Focus") - delete duplicate start focus on action button on top bar top right 
- [x] Select a task and start the timer
- [x] Open a note in the editor
- [x ] Navigate to Notes screen (or any other screen)
- [x] Return to Focus screen
- [x] **Expected**: Session timer, task timer, and note should all still be there. **Actual**: yes it persisted. However, I had a blank page open and it didn't prompt me with the "save or delete" message 
- [ ] Close browser tab, reopen Focus screen
- [ ] **Expected**: Session should restore (timer continues from where it left off). **Actual**: yes!

#### 2. Meeting Notes Routing
- [ ] Open Focus screen with Google Calendar connected
- [ ] Click on a calendar event that has NO existing note
- [ ] **Expected**: Button says "Start Meeting Note" (singular, not "Notes"). **Actual**: yes!
- [ ] Click "Start Meeting Note" → note should create and open
- [ ] Close the note, click the SAME calendar event again
- [ ] **Expected**: Button now says "Open Meeting Note". **Actual**: yes!
- [ ] Click "Open Meeting Note"
- [ ] **Expected**: Opens the existing note (not creating a duplicate). **Actual**: yes!
**CALENDAR CONTEXT CONTAINER: this QA made me realize that the calendar list is locked to today. Please implement a route to a calendar modal that allows me to pick the day (action button is calendar icon) -> displays events that day in list. Additionally, implement arrow buttons that allow me to flip the event list day by day.

#### 3. Note Editor Folder/Type Buttons
- [ ] Open or create a note in Focus screen
- [ ] Look at the toolbar above the editor
- [ ] **Expected**: Folder button shows folder NAME (e.g., "Unfiled" or actual folder name). **Actual**: yes! but the button is non-functional for foldering the page.
- [ ] **Expected**: Type button shows FULL label (e.g., "📄 Document" not just "📄"). **Actual**: yes! but the button is non-functional for changing the category.
- [ ] **Expected**: Labels button shows first label name + count (e.g., "work +2") or "Labels" if none. **Actual**: yes but I do not want this UI. Please mirror the UI from the notes screen. When I select a label, it shows the badge with the color right next to the title of the page. when you implement the refactor for shared components, this should be fixed.
- [ ] Click each button
- [ ] **Expected**: Dropdowns/popovers open and function correctly. **Actual** - folder, note type buttons are nonfunctional.

---

### II. UI/UX Improvements

#### A. Task List Badges (Focus Screen)
- [ ] Open Focus screen, look at task list in left drawer
- [ ] Find a task that has a TickTick List assigned
- [ ] **Expected**: Colored badge with folder icon + list name (e.g., purple "📁 Inbox"). 
- [ ] Find a task that has BOTH List AND Section
- [ ] **Expected**: TWO separate badges - colored List badge + gray Section badge
- [ ] **Expected**: Different lists have different badge colors. **Actual**: I see the list icons, and they are colored. I do not see the section badges.

#### B. Task List Badges (Dashboard Screen)
- [ ] Navigate to Dashboard
- [ ] Look at tasks in the task list
- [ ] **Expected**: Same colored badges appear as in Focus screen
- [ ] **Expected**: Badge colors match between screens for same list names. *Actual**: yes!

#### C. Quick Start Card - looks great, no updates needed here!
- [ ] Start a focus session
- [ ] Select a task (don't start timer yet)
- [ ] **Expected**: Quick Start card appears with amber/orange gradient border
- [ ] **Expected**: Card shows task title and "Click for AI-powered task guidance"
- [ ] Hover over the card
- [ ] **Expected**: Card lifts slightly (subtle shadow/translate effect)
- [ ] Click anywhere on the card
- [ ] **Expected**: AI help starts generating (bouncing dots, then content appears)
- [ ] **Expected**: NO separate "AI Help" button or "Start Timer" button inside the card

#### D. Timer & Header Layout
- [ ] Start a focus session
- [ ] **Expected**: Mode selector (e.g., "Writing") shows with session timer RIGHT NEXT to it
- [ ] **Expected**: Small "End" button appears next to session timer (subtle, not bright)
- [ ] Start a task timer
- [ ] **Expected**: Task timer appears in header, SEPARATE from session timer. **Actual**: please move the task timer to the immediate right of the session timer.
- [ ] **Expected**: Task title can wrap/truncate but is readable. **Actual**: title is not wrapped, it is clipped.
- [ ] **Expected**: Pause/Abandon/Done buttons are SUBTLE (no bright green "Done" button)
- [ ] Check the Done button specifically
- [ ] **Expected**: Should be ghost/subtle style with green text on hover, not solid green background

Additional ask: task card UI is now visually cluttered. Please space out and format the elements in a visually appealing way. 
---

### III. General Checks

#### Focus Cues Status
- [ ] Look for bell icon in Focus header
- [ ] Click it to toggle
- [ ] **Expected**: Toggles between filled/unfilled bell (UI only - no actual cues fire yet)
- [ ] **Note**: This is expected - Focus Cues are not yet implemented

#### No Regressions
- [ ] Task list views (Today/Week/All) still work
- [ ] AI sorting/analysis still works
- [ ] Creating new notes works
- [ ] Completing tasks syncs to TickTick
- [ ] Calendar events still load correctly

---

### Bug Report Template

If you find issues, note:
```
**Issue**: [Brief description]
**Location**: [Screen / Component]
**Steps to Reproduce**: 
1. 
2. 
3. 
**Expected**: 
**Actual**: 
**Screenshot**: [if applicable]
```