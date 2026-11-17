# Sprint 3 - Test Cases: Department and Job Modules (S3-TST-01)

## Overview
Test suite validating CRUD operations, search/filter behavior, child-record delete protection, and permission enforcement for the **Department** and **Job** tabs inside the Human Resources module (`HumanResourcesPage.tsx`).

---

## Test Cases Specification

### TC-DEPT-01: Department List View & Active Filtering
- **Objective:** Verify that the Departments tab renders all department records accurately.
- **Preconditions:** User is logged in with `HR - View` / `Department - View` rights.
- **Test Steps:**
  1. Navigate to Human Resources and select the `Departments` tab.
  2. Verify table columns: Department Code, Department Name, Status, and Actions.
  3. Toggle active/deleted view if Admin/Superadmin.
- **Expected Result:** Active departments render cleanly; soft-deleted departments are hidden from standard users.

### TC-DEPT-02: Create & Edit Department Validation
- **Objective:** Validate creating and updating department records.
- **Test Steps:**
  1. Click "Add Department" and attempt to submit with an empty Department Name or duplicate Department Code.
  2. Enter a valid Department Code (e.g., `D-005`) and Department Name (e.g., `Quality Assurance`).
  3. Edit the newly created department name and save.
- **Expected Result:** Empty or duplicate fields are rejected with inline validation errors; valid saves persist and record an entry in `audit_log`.

### TC-DEPT-03: Department Delete Blocked by Active Employees
- **Objective:** Verify referential integrity when deleting a department assigned to employees or job history records.
- **Preconditions:** Department `D-001` has active employee or job history references.
- **Test Steps:**
  1. Click Delete on `D-001`.
- **Expected Result:** `BlockedDeleteModal` is displayed preventing deletion while active child records exist.

---

### TC-JOB-01: Job Catalogue List & Search
- **Objective:** Verify Job list rendering and search responsiveness.
- **Preconditions:** User is logged in with `HR - View` / `Job - View` rights.
- **Test Steps:**
  1. Switch to the `Jobs` tab in Human Resources.
  2. Verify columns: Job Code, Job Title, Status, Actions.
  3. Search by Job Code (`J-001`) and by partial Job Title.
- **Expected Result:** Table filters dynamically without page reload; clearing search restores all visible rows.

### TC-JOB-02: Create & Edit Job Title
- **Objective:** Verify creating and editing job definitions.
- **Test Steps:**
  1. Click "Add Job", leave Job Title blank, and attempt submit.
  2. Fill valid Job Code and Title, then save.
  3. Edit the Job Title and save changes.
- **Expected Result:** Blank titles are rejected; valid creations and updates persist and log to `audit_log`.

### TC-JOB-03: Job Soft Delete, Child Guard, and Restore
- **Objective:** Verify soft delete and restore behavior for Job records.
- **Test Steps:**
  1. Attempt to delete a Job currently referenced by an active employee or job history entry.
  2. Delete an unreferenced Job, then restore it as Admin/Superadmin.
- **Expected Result:** Referenced Job deletion is blocked (`BlockedDeleteModal`); unreferenced Job soft-deletes cleanly and restores back to `Active`.
