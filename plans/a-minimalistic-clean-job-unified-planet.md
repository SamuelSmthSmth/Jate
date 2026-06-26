# Job Application Tracker Dashboard — Round 3: Social & Final Touches

## Context
Build a light-mode, minimalistic job application tracker dashboard. The user wants a left sidebar for navigation, a friend-code input section, a main area with job cards displaying status tags (Interviewing, Applied, Rejected), sign-up deadlines, and an "Add Job" button. No charts or complex visualizations.

## Aesthetic Stance

**Committed stance: Data-informed minimalism with monospace type for labels.**  
Clean white ground, structured layout, information-forward but well-spaced. Pulling from the MCP suggestion of "monospace-as-display" for status tags and metadata — fits a tracker perfectly.

- **Display/UI font**: Geist (sans-serif) — modern, neutral, purpose-built for dashboards
- **Mono font**: Geist Mono — for status tags, deadlines, job IDs
- **Palette**: Pure white background, near-black text (#0f0f0f), warm-gray sidebar (#f5f4f2), thin `rgba(0,0,0,0.08)` borders
- **Accent**: Slate-blue (#4f6ef7) for interactive elements and primary actions
- **Status tag colors**: Interviewing → blue-tinted; Applied → amber; Rejected → muted red — all low-saturation, tasteful
- **Radius**: 6px — subtle rounding, not pill-shaped

## Token Updates (`src/styles/theme.css`)

Update `:root` values only (preserve `.dark` block and `@theme inline` mapping):
```
--background: #ffffff
--foreground: #0f0f0f
--card: #ffffff
--card-foreground: #0f0f0f
--primary: #4f6ef7
--primary-foreground: #ffffff
--secondary: #f5f4f2
--secondary-foreground: #0f0f0f
--muted: #f0efed
--muted-foreground: #7a7a7a
--accent: #eef0fe
--accent-foreground: #3451d1
--border: rgba(0,0,0,0.08)
--radius: 0.375rem
```

## Font Import (`src/styles/fonts.css`)

```css
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap');
```

## Component Architecture (`src/app/App.tsx`)

Single file, all state in one component. No routing needed.

### Data Model
```ts
type Job = {
  id: string
  company: string
  role: string
  status: "Applied" | "Interviewing" | "Rejected" | "Offer"
  deadline: string       // ISO date string
  location: string
  notes?: string
  appliedDate: string
}
```

### State
- `jobs: Job[]` — pre-seeded with 6-8 realistic entries
- `activeNav: "my-jobs" | "shared-lists" | "settings"` — sidebar nav
- `friendCode: string` — input value for friend code section
- `showAddModal: boolean` — toggle add-job form
- `filter: "All" | "Applied" | "Interviewing" | "Rejected"` — filter tabs above job list
- `newJob: Partial<Job>` — form state for adding

### Layout
```
+------------------+----------------------------------------+
|  SIDEBAR (240px) |  MAIN AREA                             |
|  Logo            |  Header: "My Jobs"  [+ Add Job]        |
|  ─────────────── |  Filter tabs: All | Applied | ...      |
|  My Jobs         |  ─────────────────────────────────     |
|  Shared Lists    |  Job Card                               |
|  Settings        |  Job Card                               |
|  ─────────────── |  Job Card                               |
|  Friend Code     |  ...                                    |
|  [input] [Join]  |                                         |
+------------------+----------------------------------------+
```

### Sidebar
- Top: small "Jobtrack" wordmark in Geist, weight 600
- Nav items: icon + label, active state = accent background + accent text
- Bottom: "Friend Code" section with a small label, single-line text input, and "Join" button
- Use Lucide icons: `Briefcase`, `Users`, `Settings`, `Link2`

### Main Area
- Header row: page title left, `+ Add Job` button right
- Filter tab row (pill tabs): All · Applied · Interviewing · Rejected · Offer
- Job card list — each card:
  - Left: company initial avatar (colored circle), company name + role title
  - Right side top: status tag (monospace font, small, colored bg)
  - Metadata row: deadline date (Geist Mono), location, applied date
  - Hover: subtle shadow lift, `cursor-pointer`
  - Thin bottom border between cards (no box-shadow on cards, flat)
- Empty state when filter returns nothing

### Add Job Modal
- Triggered by `+ Add Job` button
- Simple form: Company, Role, Location, Status (select), Deadline (date), Notes (textarea)
- "Add" and "Cancel" buttons
- Uses `@radix-ui/react-dialog` for accessible modal

### Realistic Seed Data
6-8 jobs across all status types: e.g. Google SWE, Stripe Product Designer, Figma Engineer, Airbnb Data Analyst, etc. Real deadlines (dates in 2025-2026 range), real locations.

### Status Tag Colors (inline via className lookup)
```ts
const statusStyles = {
  Applied: "bg-amber-50 text-amber-700 border border-amber-200",
  Interviewing: "bg-blue-50 text-blue-700 border border-blue-200",
  Rejected: "bg-red-50 text-red-500 border border-red-200",
  Offer: "bg-green-50 text-green-700 border border-green-200",
}
```

## Files to Edit
1. `src/styles/fonts.css` — add Geist + Geist Mono Google Fonts import
2. `src/styles/theme.css` — update `:root` token values (preserve rest)
3. `src/app/App.tsx` — full implementation

---

## Round 8: CSV fix, Calendar view, Firestore-backed Social layer

### Context
Three major features: (1) the existing CSV export uses wrong Firestore field names; (2) the Calendar nav shows a placeholder — needs a real `react-big-calendar` implementation; (3) Friends & Shared Lists are local seed-data only — need full Firestore backing with real queries, a `useSocial.ts` hook, and dedicated tab components.

---

### Step 0 — Install packages
```
pnpm add react-big-calendar @types/react-big-calendar
```
`date-fns` is already installed.

---

### Step 1 — Fix CSV export (`src/app/App.tsx`)

Update `exportCSV` to use the actual Firestore field schema (matching `JobCard.jsx`):
- `job.company`, `job.title ?? job.role`, `job.status`
- `job.isPaid ? "Yes" : "No"`, `job.salary ?? ""`
- `job.deadlines?.signup ?? job.deadline ?? ""`
- `job.deadlines?.interview ?? job.interviewDate ?? ""`
- `job.url ?? job.postingUrl ?? ""`
- `job.notes ?? ""`

Use fallbacks so both the old `App.tsx` add-job schema and the JobCard.jsx save schema are handled.

---

### Step 2 — Calendar component (`src/app/components/JobCalendar.tsx`)

```tsx
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales: { "en-US": enUS } });
```

Props: `jobs: any[]`

Event parsing logic:
```ts
const events = [];
jobs.forEach(job => {
  const label = job.company ?? "";
  if (job.deadlines?.signup) {
    events.push({
      title: `📅 ${label} — Deadline`,
      start: new Date(`${job.deadlines.signup}T12:00:00`),
      end:   new Date(`${job.deadlines.signup}T12:00:00`),
      allDay: true,
      type: "deadline",
    });
  }
  if (job.deadlines?.interview) {
    events.push({
      title: `🎤 ${label} — Interview`,
      start: new Date(`${job.deadlines.interview}T12:00:00`),
      end:   new Date(`${job.deadlines.interview}T12:00:00`),
      allDay: true,
      type: "interview",
    });
  }
  // also handle flat schema fallbacks
  if (job.deadline && !job.deadlines?.signup) { ... }
  if (job.interviewDate && !job.deadlines?.interview) { ... }
});
```

`eventPropGetter`: deadline events → red (`#ef4444` bg), interview events → blue (`#3b82f6` bg).

Render `<Calendar>` with `defaultView={Views.MONTH}`, `style={{ height: "100%" }}`.

Wire into App.tsx: replace the calendar placeholder section with:
```tsx
{activeNav === "calendar" && (
  <div className="flex-1 overflow-hidden px-6 md:px-8 pb-8 pt-2">
    <JobCalendar jobs={typedJobs} />
  </div>
)}
```

---

### Step 3 — `src/hooks/useSocial.ts`

Exports four things:

**`useFriends(userId)`**
```ts
// Listens to users/{userId}.friends (array of UIDs)
// Then fetches each friend's user doc
// Returns { friends: FriendProfile[], loading }
```
Uses `onSnapshot` on `doc(db, "users", userId)` to watch the `friends` array, then `getDocs` on each UID to get profile data (`displayName`, `friendCode`, `photoURL`).

**`useSharedLists(userId)`**
```ts
// Queries shared_lists where members array-contains userId
// Returns { sharedLists: SharedListDoc[], loading }
type SharedListDoc = { id: string; name: string; members: string[]; createdBy: string; createdAt: string; }
```
Uses `onSnapshot` with `where("members", "array-contains", userId)`.

**`useSharedJobs(sharedListId)`**
```ts
// Queries jobs where sharedListId == sharedListId
// Returns { jobs, addJob, updateJob, deleteJob }
```
Similar to `useJobs.js` but filters by `sharedListId` not null.

**`addFriendByCode(currentUserId, friendCode)`** (async util, not a hook)
```ts
// 1. Query users where friendCode == friendCode (limit 1)
// 2. Get target UID
// 3. arrayUnion target UID into users/{currentUserId}.friends
// 4. arrayUnion currentUserId into users/{targetUid}.friends
// Returns the friend's profile, or throws if code not found
```

**`createSharedList(name, memberUids, createdByUid)`** (async util)
```ts
// addDoc to shared_lists collection
// { name, members: [createdByUid, ...memberUids], createdBy: createdByUid, createdAt: ISO }
// Returns new doc ID
```

---

### Step 4 — `src/app/components/FriendsTab.tsx`

Replaces the inline friends section in App.tsx. Uses `useFriends` and `addFriendByCode` from `useSocial.ts`.

Props: `userId: string`

State: `codeInput`, `adding` (loading), `error`

Layout (same visual as current App.tsx friends section, but Firestore-backed):
- "Add a Friend" card with input + Add button
  - On submit: calls `addFriendByCode(userId, codeInput)`, shows loading/error
- "Connected Friends" list from `useFriends(userId)`
  - Each row: avatar initials, displayName, friendCode, remove button
  - Remove: `arrayRemove` from both users' `friends` arrays

---

### Step 5 — `src/app/components/SharedListsTab.tsx`

Replaces the inline shared lists section. Uses `useSharedLists` and `createSharedList` from `useSocial.ts`. Also uses `useFriends` to populate the checklist.

Props: `userId: string`

State: `showCreate`, `newListName`, `selectedMembers: string[]`

Layout:
- List of shared list cards (from `useSharedLists`) — clicking one sets `activeListId`
- When `activeListId` is set: show `useSharedJobs(activeListId).jobs` in a job list below (or in a modal/sub-view)
- "Create New List" button opens inline form:
  - Group name input
  - Checkbox list of friends (from `useFriends`)
  - "Create" button calls `createSharedList(name, selectedUids, userId)`

---

### Step 6 — Wire everything into `src/app/App.tsx`

- Remove `SEED_FRIENDS`, `SEED_LISTS`, and all local friends/shared-lists state
- Remove `handleAddFriend`, `handleRemoveFriend`, `toggleListMember`, `handleCreateList`
- Import `FriendsTab` and `SharedListsTab`
- Replace `activeNav === "friends"` section with `<FriendsTab userId={user.uid} />`
- Replace `activeNav === "shared-lists"` section with `<SharedListsTab userId={user.uid} />`
- Replace calendar placeholder with `<JobCalendar jobs={typedJobs} />`
- Remove `newFriendCode`, `newListName`, `newListMembers`, `friends`, `sharedLists` state

---

### Files to create/edit
| File | Action |
|---|---|
| `src/app/components/JobCalendar.tsx` | Create |
| `src/hooks/useSocial.ts` | Create |
| `src/app/components/FriendsTab.tsx` | Create |
| `src/app/components/SharedListsTab.tsx` | Create |
| `src/app/App.tsx` | Edit — CSV fix, wiring, state cleanup |

### Verification
- Export CSV: downloads file with Company, Title, Status, Paid, Salary, Deadline, Interview, URL, Notes columns
- Calendar: Month view shows red deadline events and blue interview events, clicking navigates months
- Friends: entering a real 6-digit code from another account adds both users to each other's lists; Firestore `users` docs update
- Shared Lists: creating a list writes a `shared_lists` document; clicking a list fetches its jobs via `useSharedJobs`

---

## Round 7: Fix friends page crash, rich JobCard, editable display name

### Context
Three bugs found on localhost:
1. `SectionLabel` component was removed during Round 5 cleanup but is still referenced in the Friends page → `ReferenceError` → blank white page
2. `JobCard.jsx` uses a mismatched Firestore schema (`job.title`, `job.deadlines.signup`, `job.url`, `job.isPaid`) while Firestore actually stores `job.role`, `job.deadline`, `job.postingUrl`, `job.salaryType` → all fields undefined → bare minimal cards
3. Settings display name is read-only but user wants to edit it

---

### Fix 1 — Restore `SectionLabel` in `src/app/App.tsx`

Re-add the removed helper above the Loading/Login screens:

```tsx
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2.5"
       style={{ fontFamily: "'Geist Mono', monospace" }}>
      {children}
    </p>
  );
}
```

---

### Fix 2 — Create `src/app/components/JobCard.tsx` (supersedes `JobCard.jsx`)

TypeScript takes precedence over JS in Vite resolution, so creating `JobCard.tsx` makes `JobCard.jsx` invisible to the build without deleting it.

The new component receives the same props (`job`, `updateJob`, `deleteJob`) but:
- Uses the **correct field names** matching Firestore: `job.role`, `job.deadline`, `job.appliedDate`, `job.location`, `job.postingUrl`, `job.portalUrl`, `job.salary`, `job.salaryType`, `job.interviewDate`, `job.notes`
- **Collapsed view** matches the original rich design:
  - Company initial avatar (colored circle, same `avatarColors` lookup)
  - Company name + role subtitle
  - Status tag using `statusStyles` record (matching the 6 statuses: Waiting/Applied/Assessment/Interviewing/Rejected/Offer)
  - Metadata row: location, due date, applied date — all Geist Mono
  - Chevron toggle (opacity-0, group-hover:opacity-100)
- **Expanded accordion** via `grid-template-rows` CSS transition:
  - Status `<select>` (STATUSES array)
  - Date pickers: Due Date, Applied Date, Interview Date (conditional on Interviewing)
  - Links: Posting URL, Application Portal URL
  - Compensation: Paid/Volunteer segmented toggle + salary amount input
  - Notes textarea
  - Action row: Save Changes (calls `updateJob`), Delete (calls `deleteJob`), Collapse
- Local `editState` initialized from `job` on first expand
- `handleSave` calls `updateJob(job.id, { ...editState fields })` then leaves expanded (matches original UX)
- Separated from App.tsx concerns — self-contained

**Status styles and avatar colors**: define them locally in `JobCard.tsx` (duplicate of what was in App.tsx, now removed) so the component is self-contained.

---

### Fix 3 — Editable display name in `src/app/App.tsx` Settings section

Replace the read-only display name row with an inline editable pattern:

- Add state: `const [editingName, setEditingName] = useState(false)` and `const [nameInput, setNameInput] = useState(user.displayName ?? "")`
- When not editing: show display name + a small pencil icon button
- When editing: show a text input with Save / Cancel buttons
- On Save:
  1. `import { updateProfile } from "firebase/auth"` + `import { auth, db } from "../firebase"` + `import { doc, updateDoc } from "firebase/firestore"`
  2. Call `await updateProfile(auth.currentUser!, { displayName: nameInput.trim() })`
  3. Call `await updateDoc(doc(db, "users", user.uid), { displayName: nameInput.trim() })`
  4. `setEditingName(false)`

---

### Files to edit
- `src/app/App.tsx` — restore `SectionLabel`, add editable display name to Settings
- `src/app/components/JobCard.tsx` — new file (supersedes JobCard.jsx)

### Verification
- Friends page renders correctly (no blank screen)
- Job cards show: company avatar, role, status tag, location, deadline, applied date
- Expanding a card shows full edit form with correct field values
- Settings: clicking pencil next to Display name enables editing; Save updates it visibly
- Dark mode applies correctly to all elements in all three areas

---

## Round 6: Email/password sign-in

### Context
Google Sign-In is already wired. The user has now enabled Email auth in the Firebase Console and wants the login screen to support email + password (both sign-in and registration). `useAuth.js` cannot be edited (JS file hook), so email auth is added via a new TypeScript hook and LoginScreen UI changes only.

---

### 1. Create `src/hooks/useEmailAuth.ts`

Exports two async functions using `firebase/auth`:
```ts
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const auth = getAuth();

export async function registerWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}
```

`onAuthStateChanged` in `useAuth.js` already picks up both methods — a new email user gets a Firestore user document + friendCode generated automatically on first sign-in.

---

### 2. Update `LoginScreen` in `src/app/App.tsx`

**UI: two-tab login form**

```
┌─────────────────────────────────────────────┐
│  J   JATE · Job Application Tracker         │
│                                             │
│  [ Google ]  [ Email ]   ← toggle tabs      │
│                                             │
│  — Google tab (default) —                   │
│  [G] Sign in with Google                    │
│                                             │
│  — Email tab —                              │
│  Email:    [________________________]       │
│  Password: [________________________]       │
│                                             │
│  [ Sign In ]                                │
│  Don't have an account? Create one ↗        │
│  ← toggle switches label/mode to Sign Up    │
│                                             │
│  [ Create Account ]                         │
│  Already have one? Sign in ↗                │
└─────────────────────────────────────────────┘
```

**State added to LoginScreen:**
- `tab: "google" | "email"` (default `"google"`)
- `emailMode: "signin" | "register"` (default `"signin"`)
- `email: string`, `password: string`
- `authError: string | null`, `signing: boolean` (already present)

**Error handling** — map Firebase codes to plain English:
| Code | Message |
|---|---|
| `auth/configuration-not-found` | Enable Google in Firebase Console |
| `auth/invalid-email` | Invalid email address |
| `auth/wrong-password` / `auth/invalid-credential` | Incorrect email or password |
| `auth/user-not-found` | No account with that email |
| `auth/email-already-in-use` | An account with this email already exists |
| `auth/weak-password` | Password must be at least 6 characters |
| `auth/popup-closed-by-user` | (silent) |

**Props change:** `LoginScreen` receives both `onGoogleLogin` and `onEmailLogin`/`onEmailRegister` as separate props, or a single object. Clean approach: pass the two email functions directly.

**`App` component change:** Import `loginWithEmail`, `registerWithEmail` from `../hooks/useEmailAuth` and pass them to `LoginScreen`.

---

### Files to create/edit
- `src/hooks/useEmailAuth.ts` — new file
- `src/app/App.tsx` — LoginScreen component + App import

### Verification
- Google tab: existing Google sign-in still works
- Email tab: can register a new account and sign in with it
- Wrong password / unknown email shows a readable error message inline
- Toggling between Sign In and Sign Up modes changes the button label and submit behaviour

---

## Round 5: JobCard component integration + real Firebase credentials

### Context
The user has created `src/app/components/JobCard.jsx` (handles its own accordion expansion, local form state, save to Firebase, and delete) and provided real Firebase project credentials. The task is to wire these into the app: update `firebase.js` with real config, then replace the large inline card rendering in App.tsx with `<JobCard>` and remove the state/handlers it now owns.

---

### 1. Update `src/firebase.js`

Replace all placeholder `"YOUR_*"` values with real credentials:
```js
apiKey: "AIzaSyCv-jOCxLQhHPqhpfQGEALj5qcEhIydZk8",
authDomain: "jate-cb4e1.firebaseapp.com",
projectId: "jate-cb4e1",
storageBucket: "jate-cb4e1.firebasestorage.app",
messagingSenderId: "272724556404",
appId: "1:272724556404:web:d4e16d6f1e72302e43ef21"
```
Keep the existing `auth`, `provider`, `db` exports unchanged.

---

### 2. Update `src/app/App.tsx`

**Remove** (JobCard now owns these):
- `expandedJobId` state
- `editStates` state
- `handleToggleExpand()` function
- `updateEdit()` function
- `handleSave()` function
- `handleDelete()` function

**Keep** (still needed by App):
- `addJob`, `updateJob`, `deleteJob` from `useJobs` hook (pass `updateJob`/`deleteJob` as props to JobCard)
- `handleAddJob()` (used by the Add Job modal)

**Replace** the `filtered.map(...)` block (the large inline accordion block inside the job list div) with:
```jsx
<div className="border border-border rounded-lg overflow-hidden">
  {filtered.map(job => (
    <JobCard key={job.id} job={job} updateJob={updateJob} deleteJob={deleteJob} />
  ))}
</div>
```

The empty-state block (`filtered.length === 0`) stays as-is above this.

---

### Files to Edit
- `src/firebase.js`
- `src/app/App.tsx`

### Verification
- App loads, Firebase initialises without "invalid API key" error
- Job list renders using JobCard components
- Expanding a card shows JobCard's own edit form
- Save and Delete work (write through to Firestore via `updateJob`/`deleteJob`)
- Add Job modal still works via `handleAddJob` → `addJob`

---

## Round 4: Spec Alignment

### Context
The user provided a precise two-screen spec to lock in the design. Four gaps were identified between the current build and the spec: sidebar nav order, Screen 2 page title, group creation being a modal (should be inline card), and Friends + Shared Lists being separate pages (should be one combined page). All changes are in `src/app/App.tsx` only.

---

### Changes Required

#### 1. Sidebar nav order (swap Friends ↔ Shared Lists)
Spec order: My Jobs → Calendar → Friends → Shared Lists → Settings.

Current `navItems` array has Shared Lists at index 2 and Friends at index 3. Swap them.

#### 2. Merge "Friends" and "Shared Lists" into one page: "Friends & Shared Groups"
The spec's Screen 2 is a single page titled "Friends & Shared Groups" containing:
- **Top section** — friend code input (labelled "Enter 6-digit Friend Code") + add button + connected friends list
- **Bottom section** — inline create-group card (NOT a modal): group name input, friend checklist, "Create Shared List" button
- **Below that** — existing shared lists displayed as cards

The "Shared Lists" nav item will now navigate to the same combined page but render just the existing shared list cards (no creation form, since creation lives on the Friends page). OR — simpler: make "Friends" the primary combined page and keep "Shared Lists" as a read-only list view. The `activeNav === "friends"` renders the full "Friends & Shared Groups" layout.

#### 3. Group creation: inline card, not modal
Remove the Radix Dialog for group creation. Replace with a permanent inline card section on the Friends & Shared Groups page:

```
┌─ Create a Shared Group ──────────────────────────────────┐
│  Group Name: [Design Internships 2026______________]     │
│                                                          │
│  Invite Friends                                          │
│  ☑ Maya Patel        ☐ Jordan Lee     ☑ Sam Rivera      │
│                                                          │
│  [Create Shared List]                                    │
└──────────────────────────────────────────────────────────┘
```

State for this is already present (`newListName`, `newListMembers`). Just render it as a card instead of inside a Dialog.

Remove `showNewList` state and all Dialog imports/usage for this feature. Remove the "New Shared List" button from the Shared Lists header.

#### 4. Friend code input label
Change placeholder from "Enter friend code (e.g. jt-mx71p)" to "Enter 6-digit Friend Code".

#### 5. "Shared Lists" nav page
Keep the "Shared Lists" nav item. When active, render a clean list of existing shared lists (the same card layout already in use). No create button — creation lives on the Friends page.

---

### Files to Edit
- `src/app/App.tsx` only

### Verification
- Sidebar nav order: My Jobs, Calendar, Friends, Shared Lists, Settings ✓
- Clicking "Friends" → page titled "Friends & Shared Groups" ✓
- Friends page: code input with "Enter 6-digit Friend Code" label, friend list, inline create card ✓
- Creating a group from the inline card adds it and resets the form ✓
- Shared Lists page shows existing lists without a create button ✓
- My Jobs page unchanged: Waiting tag, sort chips, Export CSV ✓

---

## Round 3 Additions

### Context
Four new features layered onto the existing dashboard: (1) a "Waiting" status tag, (2) CSV export, (3) a Friends directory page with add/view friends, and (4) a Shared Lists page with a create-group modal that pulls from the friends list. All changes are isolated to `src/app/App.tsx`.

---

### 1. "Waiting" Status Tag

**Type changes**
- Add `"Waiting"` to the `Status` union: `type Status = "Applied" | "Waiting" | "Interviewing" | "Rejected" | "Offer"`
- Add to `statusStyles`:
  ```ts
  Waiting: "bg-gray-50 text-gray-400 border border-dashed border-gray-300 dark:bg-gray-900/30 dark:text-gray-500 dark:border-gray-700"
  ```
- Add `"Waiting"` to `FILTERS` array and `STATUSES` array
- Add to `counts` computation

**Visual treatment**: dashed border, muted gray text — signals "no action needed from me yet."

---

### 2. Export to CSV

**Placement**: A small `[ ↓ Export ]` button added to the right of the two sort chips in the filter/sort row.

**Implementation**: Pure client-side, no library needed.
```ts
function exportCSV(jobs: Job[]) {
  const headers = ["Company","Role","Status","Location","Deadline","Applied Date","Salary","Notes"];
  const rows = jobs.map(j => [
    j.company, j.role, j.status, j.location,
    j.deadline, j.appliedDate,
    j.salary ? `$${j.salary}` : "",
    (j.notes ?? "").replace(/,/g, ";"),
  ]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "jate-jobs.csv"; a.click();
  URL.revokeObjectURL(url);
}
```
Button: `<button onClick={() => exportCSV(filtered)}>↓ Export</button>` — styled like the sort chips (mono font, bordered, muted).

---

### 3. Friends Directory Page

**New nav item**: Add `{ id: "friends", label: "Friends", icon: UserPlus }` to `navItems` — placed between Shared Lists and Settings. Nav type becomes `"my-jobs" | "calendar" | "friends" | "shared-lists" | "settings"`.

**New state**:
```ts
type Friend = { id: string; name: string; code: string; avatar: string /* initials */; color: string };

const SEED_FRIENDS: Friend[] = [
  { id: "f1", name: "Maya Patel", code: "jt-mx71p", avatar: "MP", color: "bg-purple-100 text-purple-700" },
  { id: "f2", name: "Jordan Lee", code: "jt-jl39k", avatar: "JL", color: "bg-teal-100 text-teal-700" },
  { id: "f3", name: "Sam Rivera", code: "jt-sr22v", avatar: "SR", color: "bg-orange-100 text-orange-700" },
];

const [friends, setFriends] = useState<Friend[]>(SEED_FRIENDS);
const [newFriendCode, setNewFriendCode] = useState("");
```

**Friends page layout**:
```
┌─ Add Friend ─────────────────────────────────────────────┐
│  [Enter friend code...]  [Add]                           │
└──────────────────────────────────────────────────────────┘
┌─ Connected Friends ──────────────────────────────────────┐
│  [MP avatar]  Maya Patel     jt-mx71p   [Remove]         │
│  [JL avatar]  Jordan Lee     jt-jl39k   [Remove]         │
│  [SR avatar]  Sam Rivera     jt-sr22v   [Remove]         │
└──────────────────────────────────────────────────────────┘
```

**Add friend logic**: Clicking "Add" with a non-empty code generates a friend entry with a fake name (derived from code or placeholder "Friend [code]") and adds to list. Real apps would do a lookup — here we simulate it.

**Remove**: Each row has a small `UserMinus` icon button that filters out that friend.

---

### 4. Shared Lists with Create Modal

**New types**:
```ts
type SharedList = {
  id: string;
  name: string;
  memberIds: string[]; // friend ids
  createdAt: string;
};
```

**New state**:
```ts
const [sharedLists, setSharedLists] = useState<SharedList[]>([
  { id: "sl1", name: "Sweaty SWE Grinds 2026", memberIds: ["f1", "f2"], createdAt: "2026-06-15" },
]);
const [showNewList, setShowNewList] = useState(false);
const [newListName, setNewListName] = useState("");
const [newListMembers, setNewListMembers] = useState<Set<string>>(new Set());
```

**Shared Lists page layout**:
```
Header: "Shared Lists"   [+ New Shared List]

┌─ Sweaty SWE Grinds 2026 ────────────────────────────────┐
│  Members: [MP] [JL]   Created Jun 15, 2026              │
└──────────────────────────────────────────────────────────┘
```

Each list card shows name, member avatars, and creation date.

**Create modal** (Radix Dialog):
```
┌─ New Shared List ────────────────────────────────────────┐
│  Name: [_____________________________]                   │
│                                                          │
│  Add Members                                             │
│  ☑ Maya Patel      jt-mx71p                              │
│  ☑ Jordan Lee      jt-jl39k                              │
│  ☐ Sam Rivera      jt-sr22v                              │
│                                                          │
│                          [Cancel]  [Create]              │
└──────────────────────────────────────────────────────────┘
```

Checkboxes iterate over `friends` state. "Create" disabled if name is empty. On submit: push to `sharedLists`, reset form, close modal.

---

### Sidebar note
The existing "Friend Code" input at the bottom of the sidebar can stay as-is (quick-join shortcut). The new Friends page handles the full directory.

---

## Files to Edit
- `src/app/App.tsx` — only file changed

## Verification
- "Waiting" tag appears in filter tabs, can be assigned in Add Job modal and expanded card status select
- Export button downloads a valid `.csv` file with all visible (filtered) jobs
- Friends page shows seed friends, add input works, remove button removes a friend
- Shared Lists page shows seed list, "+ New Shared List" opens modal, friends checklist renders, Create adds a new list card
- Dark mode applies correctly to all new elements
