# Sprint 3 - Test Cases: Employee Module (S3-TST-02)

## Overview
Test suite validating the Employee directory, search and filtering, create/edit form validation, soft delete/restore with separation date handling, and child-record dependency checks in `HumanResourcesPage.tsx`.

---

## Test Cases Specification

### TC-EMP-01: Employee Directory List, Search & Filter
- **Objective:** Verify Employee list rendering and real-time search/filter functionality.
- **Preconditions:** User is logged in with `HR - View` / `Employee - View` rights.
- **Test Steps:**
  1. Navigate to Human Resources (`Employees` tab).
  2. Verify columns: Employee No., Last Name, First Name, Middle Initial, Gender, Birth Date, Hire Date, Separation Date, Current Job, Department, Status, and Actions.
  3. Search by employee number (`E-001`), first/last name, or department.
  4. Filter by status (`Active`, `Separated`, or `Deleted` for Admin/Superadmin).
- **Expected Result:** Directory displays accurate employee records; search and status filters update the visible rows immediately.

### TC-EMP-02: Create Employee Form & Validation
- **Objective:** Verify required fields and format validation when adding a new employee.
- **Test Steps:**
  1. Click "Add Employee" to open `EmployeeForm`.
  2. Attempt submission with blank Last Name, First Name, or Hire Date.
  3. Enter an invalid Birth Date (e.g., after Hire Date) and submit.
  4. Fill valid employee details and submit.
- **Expected Result:** Invalid or missing fields display validation errors; valid submission creates the employee with status `Active` and logs the action in `audit_log`.

### TC-EMP-03: Edit Employee Profile & Separation Date
- **Objective:** Verify updating employee details and recording a separation date.
- **Test Steps:**
  1. Open Edit Employee modal for an existing active employee.
  2. Update contact/name fields and set a valid `Separation Date` (on or after Hire Date).
  3. Save changes.
- **Expected Result:** Updated fields persist; employee status reflects separation when applicable and changes are recorded in `audit_log`.

### TC-EMP-04: Employee Soft Delete, Child Guard, & Restore
- **Objective:** Verify soft delete protection when an employee is linked to sales transactions or active job history, and verify restore.
- **Test Steps:**
  1. Attempt to delete an employee who is referenced as a salesperson in active Sales transactions.
  2. Soft-delete an unreferenced employee, verify they are hidden from non-admin views, then restore them as Admin/Superadmin.
- **Expected Result:** Deleting a referenced employee is blocked via `BlockedDeleteModal`; unreferenced employees soft-delete and restore cleanly.
