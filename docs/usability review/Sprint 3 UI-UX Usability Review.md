# Sprint 3 UI/UX Usability Review

**Project:** Hope ERP (Baikolano)

**Review Date:** November 27, 2026

**Scope & Sprint Deliverables:**
- `S3-UIX-01`: Wireframes — Department and Job Screens
- `S3-UIX-02`: Wireframes — Employee and Profile Screens
- `S3-UIX-03`: Job Timeline Component Design (`Visual Timeline` Career Progression Redesign)
- `S3-UIX-04`: High-Fidelity Mockups & Developer Handoff Notes

---

## 1. Overall Summary
Sprint 3 expands Hope ERP into **Human Resources** and **Self-Service Account Management**, delivering interactive screens for **Department Management**, **Job Catalog**, **Employee Directory**, **Effective-Dated Job History & Career Timeline**, and **User Profile & Preferences**.

The Human Resources module (`HumanResourcesPage.tsx`) unifies `Employees`, `Jobs`, and `Departments` under a single persistent tab bar while preserving the Sprint 2 `EntityControls` toolbar pattern (`Active`, `Inactive`, `All` filter tabs, live search input, and primary `+ Add` action). Lookups (`Departments` and `Jobs`) enforce unique codes, inline audit provenance (`Stamp`), reversible soft deletion (`ConfirmDeleteModal`), and referential integrity guards (`BlockedDeleteModal`) when active employees or job history rows reference a record.

The Employee Directory manages personal attributes (`Emp No`, `Last Name`, `First Name`, `Gender`, `Birth Date`, `Hire Date`, `Separation Date`) with real-time temporal validation — blocking submission whenever `Separation Date` precedes `Hire Date`. Each employee row provides a `History` action launching the **Job History Sub-Ledger** modal, which supports switching between **Table View** and the redesigned **Visual Timeline** (`career-timeline`). The redesigned timeline upgrades flat grid rows into elevated milestone cards connected by a vertical progression rail, visually distinguishing the `Latest assignment` (royal blue node with outer glow ring, left accent bar, and `Latest assignment` pill) from historical `Career progression` steps, with full Light Mode, Dark Mode, and mobile support.

The **User Profile** screen (`ProfilePage.tsx`), accessed via the bottom-left sidebar profile card (`.side-profile` in `WorkspaceLayout.tsx`), separates **Personal Information**, **Security & Password Management** (with show/hide toggles, 8-character minimum validation, and a confirmation modal), and **Theme & Workspace Appearance** (`Light Mode` vs. `Dark Mode` persistence).

---

## 2. Screen-by-Screen Interaction Check

| Screen/Route | Usability & Keyboard Findings (Focus, Tab Order, Forms) | Status |
| :--- | :--- | :--- |
| **Department Management (`/hr` → `Departments` tab)** | • **Toolbar & Filtering:** Segmented status tabs (`Active`, `Inactive`, `All`), live search, and `+ Add Department` follow the established Sprint 2 interaction pattern.<br>• **Grid & Provenance:** Displays `Dept Code`, `Department Name`, `Status` badge, `Stamp` (`CREATED`, `EDITED`, `DELETED`), and `Edit` / `Delete` / `Restore` row actions.<br>• **Defensive Deletion:** Attempting to delete a department referenced by active employees or job history triggers `BlockedDeleteModal`, preventing orphaned foreign keys. | **Pass** |
| **Job Catalog (`/hr` → `Jobs` tab)** | • **Consistent Taxonomy UX:** Mirrors the Department Management table (`Job Code`, `Job Title`, `Status`, `Stamp`, `Actions`) so administrators learn one pattern for both HR lookup tables.<br>• **Validation & Restore:** Rejects blank titles or duplicate codes in Add/Edit modals; inactive jobs remain hidden from standard users and restorable by Admin/Superadmin. | **Pass** |
| **Employee Directory (`/hr` → `Employees` tab)** | • **Directory Scanning:** Displays `Emp No`, full name, `Gender`, `Birth Date`, `Hire Date`, `Separation Date`, `Status`, `Stamp`, and `History` / `Edit` / `Delete` (or `Restore`) actions.<br>• **Add / Edit Employee Modal (`EmployeeForm`):** 3-column form layout groups identity and date fields cleanly. Entering a `Separation Date` earlier than `Hire Date` immediately highlights `.input-error`, surfaces *"Separation Date cannot be earlier than Hire Date."*, and disables the primary submit button.<br>• *Minor polish:* Wide employee table relies on `.table-scroll` on narrow screens and benefits from `tabIndex={0}` for keyboard panning. | **Pass** |
| **Job History Sub-Ledger (`Table View`)** | • **Sub-Ledger Isolation:** Opening `History` launches a dedicated `history-modal` scoped to the selected employee (`Job History — E-001 (Maria Santos)`).<br>• **Effective-Date Uniqueness (`HistoryForm`):** Prevents duplicate entries on the same `Effective Date` with explicit inline feedback (*"A history row already exists on this effective date."*).<br>• **Admin Actions:** Supports inline `Edit`, `Delete` (`ConfirmDeleteModal`: *"Deactivate Job History Entry?"*), and `Restore` for inactive milestones. | **Pass** |
| **Job Timeline (`Visual Timeline` View)** | • **Visual Hierarchy:** Redesigned `.career-timeline` pairs a continuous vertical rail (`.timeline-rail`) with elevated `.timeline-card` containers.<br>• **Latest vs. Historical Distinction:** The top milestone (`index === 0`) receives `.is-latest` styling — solid `#2563eb` node with outer ring, 3px left brand border, `Latest assignment` pill, monospace `effdate` badge, and tabular `Annual salary` (`font-variant-numeric: tabular-nums`).<br>• **Empty State:** Displays `.timeline-empty` (*"No job history entries found"*) when an employee has no active milestones.<br>• *Minor polish:* Adding `aria-current="step"` on the latest milestone node will improve screen reader orientation. | **Pass** |
| **User Profile (`/profile` via bottom-left `.side-profile`)** | • **Navigation Cue:** Clicking the bottom-left sidebar profile card highlights `.side-profile.active` cleanly without leaving a module tab highlighted.<br>• **Personal Info & Password Forms:** Separates profile name updates from password changes; password inputs include show/hide visibility toggles, inline validation (current password required, ≥8 characters, confirmation match), and a pre-update confirmation modal.<br>• **Theme Switcher:** `Light Mode` / `Dark Mode` buttons apply `[data-theme="dark"]` immediately and display a 4-second confirmation notice. | **Pass** |

---

## 3. Accessibility & Contrast Check

| Element & State | Foreground / Background | Contrast Ratio | WCAG Status & Notes |
| :--- | :--- | :--- | :--- |
| **Timeline Effective Date Pill — Light Mode** (`.timeline-date`) | `#2563eb` / `#f8fafc` | **4.92:1** | **Pass** — Meets WCAG AA (≥4.5:1) for small monospace date text. |
| **Timeline Effective Date Pill — Dark Mode** (`[data-theme="dark"] .timeline-date`) | `#60a5fa` / `#0f172a` | **7.35:1** | **Pass** — High contrast sky-blue text on deep slate pill background. |
| **Latest Assignment Badge — Light Mode** (`.timeline-badge.latest`) | `#1d4ed8` / `#dbeafe` | **5.74:1** | **Pass** — Complies with WCAG AA for status pill text. |
| **Latest Assignment Badge — Dark Mode** (`[data-theme="dark"] .timeline-badge.latest`) | `#93c5fd` / `rgba(59, 130, 246, 0.2)` | **7.10:1** | **Pass** — Crisp light blue text on translucent dark blue badge. |
| **Timeline Job Title & Salary — Light Mode** (`.timeline-role b`, `.timeline-salary b`) | `#172033` / `#ffffff` | **16.12:1** | **Pass** — Maximum readability for role titles and tabular salary figures. |
| **Timeline Job Title & Salary — Dark Mode** (`[data-theme="dark"] .timeline-role b`, `.timeline-salary b`) | `#f8fafc` / `#1e293b` | **13.54:1** | **Pass** — High contrast white-slate typography on dark card surface. |
| **Timeline Department & Labels — Dark Mode** (`.timeline-role span`, `.timeline-salary small`) | `#94a3b8` / `#1e293b` | **5.85:1** | **Pass** — Exceeds WCAG AA threshold for secondary metadata. |
| **Active Node Indicator — Light & Dark** (`.timeline-item.is-latest .timeline-node`) | `#ffffff` / `#2563eb` | **5.17:1** | **Pass** — Clear step numeral contrast inside primary brand node. |
| **Inline Validation Error** (`.validation-error`) | `#b91c1c` (light) / `#f87171` (dark) | **5.30:1 / 6.14:1** | **Pass** — High-visibility red feedback for `Separation Date` and `Effective Date` errors. |
| **Profile Theme Cards & Form Inputs** (`.field-input`, `.btn-primary`) | `#172033` / `#ffffff` & `#ffffff` / `#2563eb` | **16.12:1 / 5.17:1** | **Pass** — All profile fields, password toggles, and action buttons pass WCAG AA. |

---

## 4. Responsive Layout (Tailwind Breakpoints)

| Component | Mobile (<640px) | Tablet (640–1023px) | Desktop (≥1024px) | Notes for Devs |
| :--- | :--- | :--- | :--- | :--- |
| **HR Module Tabs (`Employees`, `Jobs`, `Departments`)** | Tabs sit in a compact horizontal strip with `EntityControls` stacking search (`100%` width) and `+ Add` button below. | Tabs, filter pills, search input, and action button align cleanly without wrapping collisions. | Full-width header with right-aligned module count badge and single-row control bar. | Consistent with Sprint 2 Customer/Product responsiveness. |
| **Employee & Lookup Tables** | Wrapped in `.table-scroll` (`overflow-x: auto`) so wide multi-column employee records scroll horizontally without breaking viewport width. | Department and Job tables fit without horizontal scroll; Employee table scrolls smoothly on narrower tablets. | All columns (`Emp No`, dates, `Status`, `Stamp`, `Actions`) render comfortably in one view. | Add `tabIndex={0}` on `.table-scroll` for keyboard-only horizontal panning. |
| **Employee & History Modals (`.record-form-three`)** | `.record-form-three` collapses to a single-column (`1fr`) stack; modal height caps at `calc(100vh - 42px)` with internal scroll. | Centered modal card with comfortable field spacing and full-width date inputs. | 3-column grid layout keeps `EmployeeForm` compact so all 7 fields fit without scrolling. | Validation errors wrap cleanly beneath the `Separation Date` input. |
| **Job Timeline (`.career-timeline`)** | Below `720px`, `.timeline-item` narrows rail column to `30px` (`grid-template-columns: 30px 1fr`), and `.timeline-card-body` stacks job/department above a full-width top-bordered salary block. | Cards display side-by-side job/department and right-aligned tabular salary with generous padding. | Spacious `38px` rail + card layout with `14px` vertical rhythm and clear left-border hierarchy. | Eliminates cramped text wrapping on small screens compared to the earlier flat grid. |
| **User Profile (`ProfilePage.tsx`)** | Personal Info, Password Management, and Theme cards stack vertically (`1fr`) with full-width inputs and buttons. | Balanced spacing across form sections; password visibility toggle buttons remain ≥36px touch targets. | Clean multi-card layout with bottom-left `.side-profile.active` indicator clearly visible in the sticky sidebar. | Theme notice banner announces updates without shifting layout. |

---

## 5. UI Polish Tickets (To-Do List)

| ID | Issue Description | Priority | Recommended Fix |
| :--- | :--- | :--- | :--- |
| **UX-16** | **Timeline view switcher lacks `role="tablist"` / `aria-pressed` semantics** | **Med** | In `HumanResourcesPage.tsx` (`.view-switch`), add `role="tablist"` (or `aria-pressed={view === "table"}` / `aria-pressed={view === "timeline"}`) to the `Table View` and `Visual Timeline` buttons so screen readers announce the active view state. |
| **UX-17** | **Latest milestone in `.career-timeline` lacks `aria-current="step"`** | **Low** | Add `aria-current={isLatest ? "step" : undefined}` to the `.timeline-item.is-latest` `<article>` element so assistive technologies identify the employee's current active assignment. |
| **UX-18** | **Password visibility toggle buttons need explicit `aria-label` updates** | **Med** | Ensure the eye-toggle buttons in `ProfilePage.tsx` dynamically announce `"Show password"` / `"Hide password"` with `aria-pressed={showPassword}`. |
| **UX-19** | **Employee `HistoryForm` duplicate effective-date error not tied via `aria-describedby`** | **Low** | Link the `Effective Date` input in `HistoryForm` to its validation error `<small>` using `aria-invalid` and `aria-describedby` for screen reader announcement. |
| **UX-20** | **Keyboard focus indicator on `.side-profile` footer button** | **Low** | Ensure `.side-profile` in `WorkspaceLayout.tsx` uses a native `<button>` (or `tabIndex={0}` with `:focus-visible` outline) so keyboard users can navigate directly to `/profile`. |
