# Hope ERP Workspace & User Management (High-Fidelity)

## Task information 
| Item | Details | 
| ----- | ----- | 
| **Task ID** | S1-UIX-04 | 
| **Task name** | High-Fidelity Mockups: Auth, Dashboard & User Management | 
| **Role** | UI/UX Designer | 
| **Assignee** | Phil Emmanuel Hitalia | 

## UX Strategy & User Flow Context

These high-fidelity mockups translate the foundational wireframes into a production-ready visual interface. The design language utilizes a clean, modern aesthetic with a dark sidebar and light content areas to maximize data legibility. The flow emphasizes administrative control and immediate feedback—such as persistent alerts for pending accounts and high-friction dialogs for destructive actions. By utilizing contextual overlays (modals) for user editing and permission management, administrators can make complex changes without losing their place in the primary data table.

## 1. Registration Screen

![alt text](<Hope Inc ERP registration form.png>)

### Layout and components
- **Information Architecture:** Expands the authentication card to accommodate "Full name", "Work email", "Password", and "Confirm password" fields.
- **Defensive Copy & Status:** Includes a distinct, lightly shaded callout box explicitly warning the user that their account starts in a "Pending" state and requires administrator approval before workspace access is granted.
- **Actions:** Integrates Terms of Service and Privacy Policy links directly above the primary, solid blue "Create account" button.

## 2. Sign In Screen

![alt text](<Hope Inc ERP sign-in screen.png>)

### Layout and components
- **Container & Background:** Centers a crisp white form card against a dark navy background to ensure focus, framed by subtle global footer and header navigation elements.
- **Form Fields:** Stacks the input fields with visible labels. The Password field features an integrated "Forgot password?" link and an inline visibility toggle (eye slash icon).
- **Actions:** Prioritizes the primary "Sign in" button, separated by a subtle "or" divider from the secondary, outlined "Continue with Google" button.

## 3. Dashboard

![alt text](<Hope Inc ERP dashboard.png>)

### Layout and components
- **Navigation:** Introduces a persistent dark sidebar for core module navigation (Workspace vs. Administration) and a top utility bar indicating the current "Preview role".
- **Dynamic Alerts:** Features a prominent blue callout within the hero section notifying the Admin that "One account is waiting for approval," paired with a direct action button.
- **KPI Metrics & Layout:** Displays a row of four metric cards (Customers, Products, Orders, Revenue) above a split-view lower section containing "Quick actions" on the left and a chronological "Recent activity" feed on the right.

## 4. User Management List

![alt text](<Hope Inc user management dashboard.png>)

### Layout and components
- **Alert Banner:** Anchors the top of the page with a full-width amber alert banner notifying the admin of pending account registrations requiring immediate review.
- **Data Table:** Implements a dense list view displaying user identity, stylized role badges (Superadmin, Admin, User), color-coded status pills (Active, Pending, Suspended), and last sign-in data.
- **Filtering & Actions:** Provides an integrated search bar and dropdown filters. Each row features a direct "Manage rights" link and a secondary overflow menu (...) for additional administrative actions.

## 5. Add User Modal

![alt text](<Hope Inc add user modal.png>)

### Layout and components
- **Contextual Overlay:** Uses a centered modal that dims the background table, keeping the administrator in context.
- **Input & Assignment:** Utilizes side-by-side name fields and a full-width email field. 
- **Role Selection:** Upgrades the standard dropdown into an expanded, descriptive role selector, clearly defining the exact access levels granted to User, Admin, and Superadmin roles.

## 6. Edit User Dialog

![alt text](<Hope Inc. edit user.png>)

### Layout and components
- **Profile Header:** Displays the target user's avatar, name, email, and current status badges directly at the top of the modal for immediate context.
- **Group Permissions:** Introduces a new "Group permissions" section with categorized checkboxes (Customer management, HR & employee records, etc.). This allows admins to make rapid, high-level access adjustments before diving into granular rights.

## 7. Block Confirmation Dialog

![alt text](<block confirmation dialog.png>)

### Layout and components
- **Destructive Action Guard:** Implements a specialized, high-friction modal to prevent accidental account suspension.
- **Target Identification:** Clearly displays a card identifying the specific user being blocked (Oliver Brown) and their current "Suspended" status to ensure accuracy.
- **Consequence Warning:** Uses a severe red alert box titled "Immediate restriction of active sessions" detailing the exact impact of the action, paired with a solid red "Confirm Block" button.

## 8. Manage User Rights

![alt text](<Hope Inc. permissions modal.png>)

### Layout and components
- **Granular Control Interface:** Expands into a wider modal to comfortably accommodate the full permission catalog, organized into distinct module cards (Customer, Product, HR, Sales, Reports).
- **Bulk Selection & Tracking:** Features a global "Select All / None" toggle at the top right, and a live counter (e.g., "24 of 36 permissions selected") to track active rights.
- **Visual Hierarchy:** Uses bold headers, individual card-level counters (e.g., "6 / 8 selected"), and distinct blue checkboxes to provide a highly scannable view of a user's exact system capabilities.

---