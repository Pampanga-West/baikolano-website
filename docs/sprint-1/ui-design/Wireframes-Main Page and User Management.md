# Hope ERP Dashboard & User Management Wireframes

## Task information

| Item | Details | 
| ----- | ----- | 
| **Task ID** | S1-UIX-03 | 
| **Task name** | Wireframes: Dashboard, User List, Rights & Admin Modals | 
| **Role** | UI/UX Designer | 
| **Assignee** | Phil Emmanuel Hitalia | 

## UX Strategy & Architecture

These wireframes define the core navigation hub (Dashboard) and the administrative control center (User Management) for the Hope ERP system. 
* **The Dashboard** employs a widget-based layout to surface high-level metrics and quick actions, minimizing clicks to primary workflows.
* **User Management** utilizes a robust data-table pattern paired with contextual overlay modals. This ensures administrators can manage permissions, block users, and edit profiles without navigating away from the list context, preserving their search and filter states.

---

## 1. Dashboard Screen

![alt text](<wireframe 6.png>)

### Behavioral Specifications
* **Role-Based Navigation:** The sidebar items and "Quick Actions" cards must dynamically render based on the active user's permissions. If a user lacks HR rights, that card/link should not be visible or should be explicitly disabled.
* **Sticky Layout:** The left sidebar and top navigation bar must remain fixed (`sticky`) while the main content area scrolls vertically.

---

## 2. User Management List

![alt text](<wireframe 7.png>)

### Behavioral Specifications
* **Search & Filter:** The search input should filter the table in real-time (debounce 300ms). The Role and Status dropdowns act as compound filters.
* **Action Protection:** As per the ERP guide, Superadmin accounts cannot be edited or blocked by standard Admins. The "Block" and "Rights" actions must be conditionally hidden or disabled based on the viewer's role vs. the target's role.

---

## 3. Contextual Modals (Add / Edit / Block User)

![alt text](<wireframe 8.png>)

![alt text](<wireframe 11.png>)

![alt text](<wireframe 10.png>)

### Add / Edit User Modal Specifications
* **Focus Management:** Auto-focus the "First Name" field upon modal open.
* **Dropdown Behavior:** The "Role" (and "Status" in Edit mode) fields must use native or highly accessible select dropdowns.
* **Destructive Action (Block User):** The Block User modal requires explicit confirmation. The primary action button ("Block User") must utilize the system's "Danger/Red" color token to indicate a destructive action. The modal copy must dynamically inject the target user's email and role for clear context.

---

## 4. Rights Management Modal

![alt text](<wireframe 9.png>)

### Behavioral Specifications
* **Cascading Selection:** Clicking "All" next to a module header must check all nested permissions beneath it. Clicking "None" must clear them.
* **Indeterminate State:** If a module has some (but not all) rights selected, its parent toggle/checkbox should display an indeterminate state (a dash `[-]`).
* **Live Counter:** The "X of 36 rights selected" counter in the subheader and footer must update reactively as boxes are checked/unchecked.

---
