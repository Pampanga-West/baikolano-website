# Sprint 3 - Test Cases: Salary Visibility & HR Per-Right Permission Tests (S3-TST-04)

## Overview
Test suite validating salary visibility restrictions controlled by the **View Job History** right and per-action HR permission enforcement across Employee, Department, Job, and Job History operations in `HumanResourcesPage.tsx`.

---

## Test Cases Specification

### TC-HR-PERM-01: Salary Visibility with `View Job History` Right Granted vs. Restricted
- **Objective:** Verify that salary figures and Job History actions are hidden when the `View Job History` right is restricted, and visible when granted.
- **Preconditions:** Test account has `HR - View` access to `HumanResourcesPage.tsx`.
- **Test Steps:**
  1. Log in as a user without `View Job History` right (or toggle `View Job History right` to `Restricted · salary hidden`).
  2. Inspect the Employee directory table and row actions.
  3. Grant `View Job History` right (`Granted · salary visible`) and refresh/re-check the table and Job History modal.
- **Expected Result:**
  - When restricted: Notice banner confirms *"Job History actions and salary figures are hidden"*; Job History modal trigger and salary figures are hidden/redacted; direct API queries for job history/salary are rejected.
  - When granted: Salary figures (`salary-value` / `timeline-salary`) and Job History modal actions render accurately.

### TC-HR-PERM-02: Employee Per-Right Enforcement (View, Add, Edit, Delete)
- **Objective:** Verify granular permission enforcement on the `Employees` tab.
- **Test Steps:**
  1. Test a user with `Employee - View` only: verify `Add Employee`, `Edit`, and `Delete` buttons are hidden and mutation calls fail with `403 Forbidden`.
  2. Grant `Employee - Add` and verify only creation is permitted.
  3. Grant `Employee - Edit` and `Employee - Delete` individually and verify each action button and endpoint matches the assigned right.
- **Expected Result:** UI controls and backend/Supabase checks strictly enforce each individual right.

### TC-HR-PERM-03: Department & Job Per-Right Enforcement
- **Objective:** Verify per-action rights (`View`, `Add`, `Edit`, `Delete`) on the `Departments` and `Jobs` tabs.
- **Test Steps:**
  1. Log in with read-only HR rights and switch between `Departments` and `Jobs` tabs.
  2. Verify Add/Edit/Delete controls are disabled or omitted.
  3. Log in with Admin/Superadmin-assigned `Add`/`Edit`/`Delete` rights and verify mutations succeed and log to `audit_log`.
- **Expected Result:** Unauthorized mutations are blocked on both UI and server layers.

### TC-HR-PERM-04: Job History Mutation Rights (`Add`, `Edit`, `Delete Job History`)
- **Objective:** Verify that viewing Job History does not grant permission to add, edit, or delete promotion/transfer entries without explicit mutation rights.
- **Test Steps:**
  1. Grant `View Job History` without `Add/Edit/Delete Job History` rights.
  2. Open Job History modal for an employee and verify `Add History`, `Edit`, and `Delete` controls are unavailable.
  3. Grant `Add/Edit/Delete Job History` rights and verify full CRUD works.
- **Expected Result:** Read-only Job History viewers cannot modify career/salary history.
