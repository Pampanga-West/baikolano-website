# Sprint 4 - Test Cases: Sales Transaction & Price-as-of-Date (S4-TST-01)

## Overview
Test suite validating the Sales module (`SalesPage.tsx`), including sales transaction list and search, New Sale header creation with auto-numbered transaction IDs, sale detail line items (add/edit/delete), automatic unit price resolution from `pricehist` as of the sales date, soft delete/restore, and per-action Sale/Sale Detail rights.

---

## Test Cases Specification

### TC-SALE-01: Sales List View & Search Filtering
- **Objective:** Verify that the Sales list renders all required columns and filters accurately.
- **Preconditions:** User is logged in with `Sales - View` rights.
- **Test Steps:**
  1. Navigate to the Sales page (`/sales` or via sidebar).
  2. Verify columns: Transaction No., Sales Date, Customer, Salesperson, Total Amount, Status, and Actions.
  3. Search by Transaction No. (e.g., `T-001`), Customer Name, and Salesperson Name.
  4. Clear search query.
- **Expected Result:** Active sales display accurately; deleted sales (e.g., `T-004`) are hidden from standard users and visible with a `DELETED` badge + `Restore` action for Admins/Superadmins.

### TC-SALE-02: Create New Sale Header (`SaleForm`)
- **Objective:** Verify auto-numbered transaction creation with valid Customer and Salesperson dropdowns.
- **Test Steps:**
  1. Click "New Sale" to open `SaleForm`.
  2. Verify Transaction No. is auto-generated and read-only.
  3. Attempt to submit without selecting a Customer, Salesperson, or Sales Date.
  4. Select an active Customer, active Salesperson, and valid Sales Date, then save.
- **Expected Result:** Missing required fields trigger validation errors; valid submission creates the sale header, appears in the sales list, and records an entry in `audit_log`.

### TC-SALE-03: Add Line Item & Automatic Price-as-of-Date Lookup (`LineForm`)
- **Objective:** Verify unit price auto-fills from `pricehist` using the latest effective date on or before the transaction's Sales Date.
- **Preconditions:** Product `P-001` has price history entries: `$12.00` effective `2026-01-01`, `$13.75` effective `2026-06-01`, and `$15.00` effective `2026-11-01`.
- **Test Steps:**
  1. Open `SaleDetails` for a transaction dated `2026-10-01`.
  2. Click "Add Line Item", select `P-001`, and enter Quantity `4`.
  3. Inspect the read-only `Unit Price` field and calculated `Line Total`.
  4. Repeat for a transaction dated `2026-03-15`.
- **Expected Result:**
  - For `2026-10-01`: Unit Price auto-fills as `$13.75` (ignoring the future `2026-11-01` price); Line Total = `$55.00`.
  - For `2026-03-15`: Unit Price auto-fills as `$12.00`; Line Total = `$48.00`.
  - Unit Price field is read-only (`auto-filled`) so users cannot manually tamper with historical pricing.

### TC-SALE-04: Edit & Delete Line Items & Transaction Total Recalculation
- **Objective:** Verify line item updates and deletions recalculate the transaction total accurately.
- **Test Steps:**
  1. Edit an existing line item's quantity (e.g., from `4` to `10`) and save.
  2. Attempt to enter a zero or negative quantity.
  3. Delete a line item from `SaleDetails`.
- **Expected Result:** Zero/negative quantities are rejected; valid edits and deletions immediately recalculate both the line total and the parent transaction total.

### TC-SALE-05: Sales Soft Delete, Child-Record Guard & Restore
- **Objective:** Verify soft delete rules for sales with details/payments and restoration with status/stamp.
- **Test Steps:**
  1. Attempt to delete a sales transaction that has active line items or recorded payments.
  2. Soft-delete an eligible transaction, verify status changes to `DELETED` with audit stamp, then click `Restore`.
- **Expected Result:** Delete rules enforce child-record checks (`BlockedDeleteModal` when active details/payments block deletion); soft-deleted sales restore cleanly to `Active` and log to `audit_log`.

### TC-SALE-06: Sale & Sale Detail Per-Action Rights Enforcement
- **Objective:** Verify granular permission enforcement for `Sale` (View/Add/Edit/Delete) and `Sale Detail` (Add/Edit/Delete).
- **Test Steps:**
  1. Log in with `Sale - View` only and verify "New Sale", "Edit", "Delete", and line-item mutation buttons are hidden/blocked.
  2. Grant `Sale - Add` without `Sale Detail - Delete` and verify only permitted actions are enabled.
- **Expected Result:** UI buttons and server/database checks strictly align with assigned rights.
