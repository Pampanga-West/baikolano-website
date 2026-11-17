# Sprint 3 - Test Cases: Job History Tests (S3-TST-03)

## Overview
Test suite validating employee Job History promotions and transfers, effective date uniqueness constraints, salary recording, Table/Timeline views, and soft delete/restore behavior in `HumanResourcesPage.tsx` (`JobHistory` & `HistoryForm`).

---

## Test Cases Specification

### TC-JH-01: Job History Modal Views (Table View & Timeline View)
- **Objective:** Verify that an employee's job history displays accurately in both Table View and Timeline View.
- **Preconditions:** User is logged in with `HR - View Job History` rights; employee has at least 2 historical job records.
- **Test Steps:**
  1. Open the Job History modal for an employee.
  2. Verify Table View columns: Effective Date, Job, Department, Salary, Status, and Actions.
  3. Switch to `Timeline View`.
- **Expected Result:** Both views render chronological job progression (promotions/transfers) with matching job titles, departments, effective dates, and salaries.

### TC-JH-02: Add Promotion / Transfer & Effective Date Uniqueness
- **Objective:** Verify adding a new job history entry and enforcing unique effective dates per employee.
- **Test Steps:**
  1. Click "Add History" in the Job History modal.
  2. Enter an `Effective Date` that already exists for that employee and attempt to save.
  3. Change to a unique `Effective Date`, select a new Job and Department, enter a valid positive `Salary`, and save.
- **Expected Result:** Duplicate effective date is rejected with: *"A history row already exists on this effective date."* Unique entry saves, updates the employee's current job/department if it is the latest effective date, and logs to `audit_log`.

### TC-JH-03: Edit Job History & Salary Validation
- **Objective:** Verify editing an existing job history entry and rejecting invalid salary values.
- **Test Steps:**
  1. Open Edit Job History for an existing row.
  2. Enter a negative or non-numeric salary and attempt to save.
  3. Enter a valid updated salary and save.
- **Expected Result:** Negative or invalid salary values are rejected; valid updates persist immediately and recalculate current job/salary if applicable.

### TC-JH-04: Soft Delete & Restore Job History Entry
- **Objective:** Verify soft deletion and restoration of job history rows.
- **Test Steps:**
  1. Soft-delete a job history record as an authorized user.
  2. Verify standard users only see `Active` entries, while Admin/Superadmin can view and restore deleted rows.
- **Expected Result:** Deleted history row is hidden from non-admin views and restores cleanly to `Active` status.
