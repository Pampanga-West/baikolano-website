# Sprint 4 - End-to-End Integration Test Suite (S4-TST-04)

## Overview
Full-lifecycle end-to-end (E2E) integration test covering the complete HOPE ERP workflow across Authentication, User Management, Per-Action Rights, Sales, Payments, Reports, and Audit Logging:
**Register → Approve → Assign Rights → Login → Sell → Pay → Run Reports → Verify Audit Trail**.

---

## E2E Scenario Execution Steps

### Stage 1: User Registration (Pending Account)
- **Actor:** New Test User (`e2e.tester@hope.local`)
- **Steps:**
  1. Open Landing Page and click **Register**.
  2. Submit valid registration details and password.
  3. Attempt to **Sign In** immediately before approval.
- **Expected Result:** Account is created with `PENDING` status; immediate sign-in is blocked with a pending-approval message.

### Stage 2: Superadmin Approval & Rights Assignment
- **Actor:** Superadmin (`GN68` / team Superadmin)
- **Steps:**
  1. Sign in as Superadmin and open **User Management**.
  2. Locate `e2e.tester@hope.local` and click **Approve**.
  3. Open **Rights Dialog** (`RightsModal.tsx`) for `e2e.tester@hope.local`.
  4. Grant rights: `Sales - View/Add`, `Sale Detail - Add`, `Payment - Add/View`, `Reports - Top Customers`, `Reports - Top Sales` (leave HR and User Management unchecked).
  5. Save rights and sign out.
- **Expected Result:** User status updates to `Active`; selected rights persist in `user_permission`; rights assignment is logged in `audit_log`.

### Stage 3: Scoped User Login & Navigation Verification
- **Actor:** `e2e.tester@hope.local`
- **Steps:**
  1. Sign in with `e2e.tester@hope.local`.
  2. Inspect sidebar and dashboard tiles (`WorkspaceLayout.tsx`, `DashboardPage.tsx`).
- **Expected Result:** Only authorized modules (`Sales`, `Reports`) appear; unauthorized modules (`User Management`, `HR`, `Audit Log`) are hidden and blocked.

### Stage 4: Create Sale & Price-as-of-Date Line Items
- **Actor:** `e2e.tester@hope.local`
- **Steps:**
  1. Navigate to **Sales** (`SalesPage.tsx`) and click **New Sale**.
  2. Select an active Customer, active Salesperson, and Sales Date `2026-10-01`, then save the auto-numbered transaction (e.g., `T-E2E`).
  3. Open **Sale Details**, add a product line item with Quantity `5`, and verify the read-only `Unit Price` auto-fills from `pricehist` as of `2026-10-01`.
- **Expected Result:** Line total and transaction total calculate accurately (`5 × unitPrice`).

### Stage 5: Record Payment & Verify Balances
- **Actor:** `e2e.tester@hope.local`
- **Steps:**
  1. Open **Payments & Balance** for `T-E2E`.
  2. Record a partial payment (50% of total), verify `Remaining Balance` updates immediately.
  3. Record the remaining 50% payment and switch to **Customer Balance Summary**.
- **Expected Result:** Transaction balance reaches `$0.00` (`Paid`), receipt rows appear in `Payment History`, and Customer Balance Summary reflects the settled total.

### Stage 6: Run Authorized Reports & Export PDF
- **Actor:** `e2e.tester@hope.local`
- **Steps:**
  1. Navigate to **Reports** (`ReportsPage.tsx`).
  2. Confirm only granted reports (`Top Customers`, `Top Sales`) are available; ungranted reports (e.g., `Employee Job History`) are restricted.
  3. Filter **Top Sales** by date range covering `2026-10-01` and `Top N = 10`; verify `T-E2E` appears in the results.
  4. Click **Print / Save as PDF** and verify clean printable output.
- **Expected Result:** Newly recorded sale appears accurately in reports and prints/exports cleanly.

### Stage 7: End-to-End Audit Log Verification
- **Actor:** Superadmin
- **Steps:**
  1. Sign in as Superadmin and open **Audit Log** (`AuditLogPage.tsx`).
  2. Filter by actor/date for the E2E run.
- **Expected Result:** Complete chronological audit trail exists for registration, approval, rights assignment, sale creation, line item addition, and payment receipts.
