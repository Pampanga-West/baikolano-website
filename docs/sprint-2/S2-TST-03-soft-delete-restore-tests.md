# Sprint 2 - Test Cases: Soft Delete & Restore Workflows (S2-TST-03)

## Overview
Test suite validating data integrity rules for soft deletion and restoration across Customer and Product entities, with special focus on blocking deletion when active child dependencies exist.

---

## Test Cases Specification

### TC-DEL-01: Soft Deletion of Customer without Orders
- **Objective:** Verify soft deletion marks record as deleted without hard removal.
- **Preconditions:** Customer has no active orders/transactions.
- **Expected Result:** Customer `deleted_at` timestamp is set; record disappears from active view but remains in audit/database.

### TC-DEL-02: Block Customer Deletion with Active Child Transactions
- **Objective:** Verify integrity guard blocks deletion of a customer who has pending/active sales orders.
- **Preconditions:** Customer `CUST-002` has active transactions.
- **Action:** Attempt to delete customer via UI button.
- **Expected Result:** `BlockedDeleteModal` triggers displaying: *"Cannot delete this customer because active child transactions exist."* HTTP 409 Conflict returned by API.

### TC-DEL-03: Soft Deletion of Product without Sales Lines
- **Objective:** Verify deletion of product without sales records succeeds with soft-delete flag.
- **Expected Result:** Status changes to `Inactive` or soft-deleted flag set; UI shows success alert.

### TC-DEL-04: Block Product Deletion with Order Line Items
- **Objective:** Verify product referenced in line items cannot be soft-deleted.
- **Expected Result:** System prevents deletion, raises constraint warning modal, and prevents orphan referential states.

### TC-DEL-05: Record Restoration Workflow
- **Objective:** Verify restoration of soft-deleted customer/product restores visibility.
- **Expected Result:** Restored item reappears in active table; `deleted_at` reset to `null`; logged in `audit_log`.
