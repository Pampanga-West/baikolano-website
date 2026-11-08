# Sprint 1 UI/UX Usability Review

**Project:** Hope ERP (Baikolano)

**Review Date:** November 7, 2026

---

## 1. Overall Summary
The latest deployment delivers a major leap forward in functionality: all core Sprint 1 authentication and user management workflows are now fully implemented, functional, and interconnected. The registration flow features editable name inputs, password confirmation, real-time strength validation, and an administrator pending-approval state. The login system cleanly authenticates users, supports role routing, conditionally displays security alerts, and introduces a dedicated session sign-out button. Furthermore, User Management now includes working Add User and Edit User modals, live search filtering, role and status dropdowns, and an administrative security reset token generator. The remaining tasks are minor UI polish and keyboard accessibility refinements (color contrast on placeholders and modal `Escape`/focus-trap lifecycle).

---

## 2. Screen-by-Screen Interaction Check

| Screen/Route | Usability & Keyboard Findings (Focus, Tab Order, Forms) | Status |
| :--- | :--- | :--- |
| **Login** | • **Semantic submission:** Inputs are wrapped in a semantic `<form onSubmit={handleLogin}>`; pressing `Enter` in either the email or password field submits credentials naturally.<br>• **Conditional feedback:** The static "Blocked Account" banner has been removed. Error notices (`role="alert"`) only display dynamically upon failed authentication or when a blocked user attempts sign in.<br>• **Password toggle:** Eye toggle button has accessible `aria-label` (`"Show password"` / `"Hide password"`) and operates via keyboard.<br>• **Session management:** A dedicated "Sign out" button has been added to the workspace profile, completing the `S1-DEV-03` login/logout lifecycle.<br>• *Minor polish:* Modal lacks an `Escape` key listener and focus containment. | **Pass** |
| **Registration** | • **Fully editable inputs:** First and Last Name fields are now bound to state with active `onChange` handlers, resolving the previous input-locking issue.<br>• **Complete credentials:** Password and Confirm Password fields are implemented with character validation (min. 8 characters) and matching checks (`S1-DEV-02`).<br>• **Dynamic strength meter:** Real-time visual strength indicator evaluates character diversity and length (Weak, Fair, Good, Strong) with colored bars.<br>• **Pending approval workflow:** On successful submission, an accessible info banner (`role="status"`) explains that the new account is `PENDING` approval by an administrator, accompanied by a clean "Proceed to Sign In" transition button.<br>• *Minor polish:* Modal dismiss on `Escape` key remains to be wired. | **Pass** |
| **Set/Reset Password** | • **Reset request flow:** The `/reset` view includes email validation and triggers `requestPasswordReset()`, presenting user confirmation upon submission.<br>• **Token-based password setting:** The `/new-password` view accepts the security reset token, validates the new password against strength rules, and confirms matching inputs.<br>• **Token administration:** Administrators can view pending reset requests in User Management, generate security reset tokens (`password_reset_token`), and copy them to the clipboard with one click (`S1-DEV-04`).<br>• **Clean initial state:** Hardcoded "Link expired" banners have been removed in favor of conditional error handling. | **Pass** |
| **User Management** | • **Add & Edit User modals:** Clicking "Add User" opens a creation modal with name, email, temporary password, role, and status dropdowns (`rt.addUser`). Clicking row "Edit" opens a modal to modify existing user details (`rt.updateUser`) (`S1-DEV-05`).<br>• **Live search & filter:** The search bar is now an active `<input>` filtering users by name or email in real time, accompanied by working `<select>` dropdowns for Role and Status.<br>• **Superadmin safeguards & approval:** Michael Carter is protected as the last Superadmin; Superadmin accounts are hidden from Admin view; pending accounts feature an active "Approve" button, and regular users can be designated as Admin (`S1-DEV-06`).<br>• **Block / Unblock:** Toggle button immediately updates account status and badge with an operation confirmation banner. | **Pass** |
| **Rights Modal** | • **Complete 5-module matrix:** Customer Management, Product Management, Human Resources, Sales, and Reports are present with individual action checkboxes (`S1-DEV-07`).<br>• **Batch controls & progress:** "All" and "None" bulk toggle buttons operate smoothly per module group; live counter (`X of 36 rights selected`) and animated progress bar update instantaneously.<br>• **State persistence:** Saving rights updates user permissions and closes the modal cleanly.<br>• *Minor polish:* Missing `Escape` key dismissal, focus trap, and explicit `:focus-visible` ring on the custom styled checkboxes. | **Pass** |

---

## 3. Contrast & Visual Readability

| Element / Tailwind Class | Foreground / Background | Ratio | Finding |
| :--- | :--- | :--- | :--- |
| **Input placeholder** (`.input-wrap input::placeholder`) | `#a1a7b0` / `#ffffff` | **2.42:1** | **Fail** — Needs to be updated to `#64748b` (slate-500) to meet the 4.5:1 AA standard. |
| **Input placeholder on slate surface** (`.auth-modal input`) | `#a1a7b0` / `#f8fafc` | **2.32:1** | **Fail** — Below the 4.5:1 minimum threshold on light gray modal inputs. |
| **Default field border** (`border-slate-300` / `#d7d9dd`) | `#d7d9dd` / `#ffffff` | **1.48:1** | **Fail (WCAG 1.4.11)** — Boundary contrast is low if the border alone defines field edges. |
| **Primary button** (`.btn-primary` / `bg-blue-600`) | `#ffffff` / `#2563eb` | **5.17:1** | **Pass** — Meets WCAG AA requirements for normal text. |
| **Landing register button** (`.landing-register` / `bg-blue-500`) | `#ffffff` / `#3b82f6` | **3.68:1** | **Fail** — 14px bold button text requires 4.5:1; update to blue-600 (`#2563eb`). |
| **Muted body text** (`--muted` / `text-slate-500`) | `#64748b` / `#ffffff` | **4.76:1** | **Pass** — Passes WCAG AA 4.5:1 threshold on card backgrounds. |
| **Table header text** (`th` / `.text-slate-500`) | `#64748b` / `#f8fafc` | **4.55:1** | **Pass** — Complies with minimum contrast on light header background. |
| **Active status badge** (`.badge-active`) | `#15803d` / `#dcfce7` | **4.57:1** | **Pass** — Complies with WCAG AA for green status chip. |
| **Blocked status badge** (`.badge-blocked`) | `#b91c1c` / `#fee2e2` | **5.30:1** | **Pass** — Strong contrast for critical danger status indicator. |
| **Pending status badge** (`.badge-pending`) | `#b45309` / `#fef3c7` | **4.51:1** | **Pass** — Complies with WCAG AA for amber warning chip. |
| **Sidebar section label** (`.nav-label`) | `#687386` / `#111827` | **3.70:1** | **Fail** — 9px uppercase category labels ("MODULES", "ADMINISTRATION") fail on dark sidebar. |

---

## 4. Responsive Layout (Tailwind Breakpoints)

| Component | Mobile (<640px) | Tablet (640–1023px) | Desktop (≥1024px) | Notes for Devs |
| :--- | :--- | :--- | :--- | :--- |
| **User Filters** | Below 560px, controls stack cleanly in a column (`gap: 10px`); search input expands to full width (`100%`) with dropdowns stacked underneath. | Flex row layout with search bar and filter dropdowns aligned side by side. Fits comfortably. | Spans full card width in a flex row (`justify-content: space-between`). Generous spacing between search and dropdowns. | Fully functional. To improve cross-device consistency, standardize breakpoint queries to Tailwind's `sm:` (640px) rather than custom 560px. |
| **User Table** | Contained in `.table-scroll` (`overflow-x: auto`), allowing horizontal panning. Table headers and cells render without line breaking (`nowrap`). | Fits viewports above 768px without horizontal scrolling; smooth scrolling triggers below 720px. | Full-width display with balanced column widths, clean avatar chips, and responsive action button clusters. | Add `tabIndex={0}` to the `.table-scroll` container so keyboard users can scroll the table horizontally with arrow keys. |
| **User Panel (Modals)** | Fits on mobile viewports with `width: min(590px, 100%)` and `calc(100vh - 42px)` max-height. Form fields collapse to single column. | Centered modal dialog with two-column form grid (`1fr 1fr`). Action buttons anchored in sticky modal footer. | Clean, centered modal with comfortable padding, clear title hierarchy, and distinct primary/secondary action buttons. | Both Add User and Edit User modals render and scale smoothly across all screen sizes. |
| **Rights Modal** | Fits within `calc(100vh - 38px)`. Checkbox grid collapses to a clean single column (`grid-template-columns: 1fr`). Footer count hides to prioritize Cancel and Save buttons. | Below 800px, checkbox grid switches cleanly to 2 columns (`repeat(2, 1fr)`). Between 800px and 1023px, displays in 3 columns. | Centered modal (max-width `780px`) with a clean 3-column checkbox grid (`repeat(3, 1fr)`), scrollable body, and sticky header/footer. | Grid reflow is well-engineered across all breakpoints. |

---

## 5. UI Polish Tickets (To-Do List)

| ID | Issue Description | Priority | Recommended Fix |
| :--- | :--- | :--- | :--- |
| **UX-01** | **Modals do not dismiss via the `Escape` key** | **Med** | In `AuthModal.tsx`, `RightsModal.tsx`, and `ModalShell.tsx`, add a `useEffect` keydown listener for `e.key === "Escape"` calling the respective `close()` handler. |
| **UX-02** | **Keyboard focus is not trapped inside active dialogs** | **Med** | Implement focus trapping (e.g., Tab cycling constraint) in `ModalShell.tsx` and `AuthModal.tsx` so keyboard navigation cannot escape into background controls. |
| **UX-03** | **Input placeholder text fails WCAG AA contrast (2.32:1–2.42:1)** | **Med** | In `index.css`, update `.input-wrap input::placeholder` from `#a1a7b0` (slate-400) to `#64748b` (slate-500) to achieve a compliant 4.55:1 contrast ratio. |
| **UX-04** | **Landing hero register button fails WCAG AA contrast (3.68:1)** | **Med** | In `index.css`, change `.landing-register` background from `#3b82f6` (blue-500) to `#2563eb` (blue-600) to meet the 4.5:1 requirement for 14px bold text. |
| **UX-05** | **Action button touch targets in User Table are compact on mobile (~25px)** | **Low** | Increase row action button padding on mobile screens under 640px (`min-h-[36px]`, `px-3`), or bundle actions into an accessible kebab menu. |
| **UX-06** | **Rights Modal close button and module toggles lack accessible names** | **Low** | Add `aria-label="Close modal"` to `<button className="icon-button">` in `RightsModal.tsx`, and add contextual labels to group buttons (`aria-label="Select all Customer Management rights"`). |
| **UX-07** | **Custom checkboxes lack visible keyboard focus indicators** | **Low** | In `index.css`, add a visible outline or focus ring (`.right-check:focus-within`) so keyboard users can clearly track focus across permissions. |


