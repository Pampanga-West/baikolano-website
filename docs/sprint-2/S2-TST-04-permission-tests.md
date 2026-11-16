# Sprint 2 - Test Cases: Per-Right Permission Tests (S2-TST-04)

## Overview
Test suite validating per-action rights and role enforcement across Customer and Product modules in accordance with the 36-right catalogue.

---

## Permission Matrix & Test Scenarios

### Customer Module Rights
1. **`Customer - View`**
   - User without right: Module tile hidden on Dashboard; direct URL `/customers` redirects with unauthorized toast.
   - User with right: Customer table visible with read-only view.
2. **`Customer - Add`**
   - User without right: "Add Customer" button hidden; direct POST request returns 403 Forbidden.
   - User with right: Add Customer modal opens and form submissions are accepted.
3. **`Customer - Edit`**
   - User without right: Edit action icon hidden; direct PUT/PATCH request blocked.
   - User with right: Edit modal enabled, field changes accepted.
4. **`Customer - Delete`**
   - User without right: Delete icon omitted; DELETE endpoints blocked.
   - User with right: Confirm/Blocked delete modals render appropriately.

### Product Module Rights
1. **`Product - View`**
   - User without right: Products page inaccessible; API requests rejected.
   - User with right: Product inventory and pricing lists viewable.
2. **`Product - Add / Edit / Delete`**
   - Verify granular button states and backend check for each mutation right.
3. **`Product - View / Edit Price History`**
   - Verify non-authorized users cannot view or modify price history timelines or submit new price points.

### Role Hierarchies
- **Superadmin:** Possesses all module rights implicitly; bypasses restrictions.
- **Admin:** Possesses rights assigned in Rights modal; cannot alter Superadmin accounts.
- **Member / User:** Strictly limited to explicit `user_permission` records.
