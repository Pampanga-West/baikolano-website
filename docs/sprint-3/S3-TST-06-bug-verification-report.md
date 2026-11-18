# Sprint 3 - Bug Reports & Fix Verification (S3-TST-06)

## Overview
Bug tracking, reproduction steps, root cause analysis, and fix verification report for the Human Resources module (Departments, Jobs, Employees, Job History, and Salary Visibility) in Sprint 3.

---

## Bug Log & Verification Details

### BUG-S3-01: Separation Date Earlier Than Hire Date Accepted on Edit
- **Severity:** High
- **Description:** Editing an employee allowed saving a `Separation Date` earlier than the employee's `Hire Date`, creating an invalid employment timeline.
- **Root Cause:** Missing date comparison guard in `EmployeeForm` before form submission.
- **Resolution:** Added date validation check in `HumanResourcesPage.tsx` displaying: *"Separation Date cannot be earlier than Hire Date."*
- **Verification:** **PASSED**. Form blocks submission and displays inline validation error whenever `separationDate < hireDate`.

---

### BUG-S3-02: Duplicate Job History Effective Date Overwrote Prior Entry
- **Severity:** High
- **Description:** Submitting a new Job History promotion or transfer on an effective date that already existed for the same employee caused ambiguous current-job resolution.
- **Root Cause:** Effective date uniqueness was not validated client-side before submission.
- **Resolution:** Added duplicate effective date check in `HistoryForm` displaying: *"A history row already exists on this effective date."*
- **Verification:** **PASSED**. Duplicate effective dates are rejected on add while preserving edit of the same row.

---

### BUG-S3-03: Salary Figures Briefly Visible Before `View Job History` Right Evaluation
- **Severity:** Medium
- **Description:** Users without the `View Job History` right could see the Job History action column in the employee table when `historyRight` was false.
- **Root Cause:** Action column header/cells did not consistently check `(isAdmin || historyRight)` across all HR views.
- **Resolution:** Guarded `Actions` header, `Job History` modal button, and salary figures behind `historyRight` in `HumanResourcesPage.tsx` with a restricted-mode notice banner.
- **Verification:** **PASSED**. Both salary figures and Job History actions remain hidden when `View Job History` is restricted.
