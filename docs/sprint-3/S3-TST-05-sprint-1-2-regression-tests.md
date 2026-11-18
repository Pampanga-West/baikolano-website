# Sprint 3 - Regression Test of Sprints 1-2 (S3-TST-05)

## Overview
Regression test report verifying that Sprint 3 Human Resources additions (Departments, Jobs, Employees, Job History, Salary Visibility) did not introduce regressions in Sprint 1 (Authentication, User Management, Rights, Safeguards) or Sprint 2 (Customer, Product, Price History, Soft Delete/Restore) modules.

---

## Regression Verification Matrix

### Sprint 1 Regression Scope
| Module / Area | Test Case Verified | Status | Notes |
| :--- | :--- | :---: | :--- |
| **Auth & Session** | Register (Pending), Login, Logout, Password Reset | **PASS** | Session state, blocked-user rejection, and token expiry behave as expected. |
| **User Management** | Add, Edit, Approve, Block/Unblock, Designate Admin | **PASS** | Admin cannot view/edit Superadmin accounts; pending approval flow intact. |
| **Safeguards** | Last-Superadmin Protection | **PASS** | System prevents demoting, blocking, or deleting the final active Superadmin. |
| **Rights & Audit** | 36 Per-Action Rights Modal & `audit_log` | **PASS** | Module checkboxes, All/None toggles, and audit logging operate cleanly. |

### Sprint 2 Regression Scope
| Module / Area | Test Case Verified | Status | Notes |
| :--- | :--- | :---: | :--- |
| **Customers** | List, Search, Filter (`payTerms`), Create, Edit | **PASS** | Validation constraints and search filtering remain responsive. |
| **Products** | Catalog Display, Search, Create, Edit | **PASS** | Unit constraints and positive price validation remain enforced. |
| **Price History** | Add/Edit/Delete Price & Effective Date Lookup | **PASS** | Latest effective price `<=` target date resolves accurately. |
| **Soft Delete / Restore** | Customer & Product Soft Delete + Child Guard | **PASS** | `BlockedDeleteModal` blocks deletion when active child records exist; restore works cleanly. |
| **Module Permissions** | Customer & Product Per-Action Rights | **PASS** | View/Add/Edit/Delete and Price History rights remain strictly enforced. |

## Conclusion
All Sprint 1 and Sprint 2 regression checks passed with zero regressions detected.
