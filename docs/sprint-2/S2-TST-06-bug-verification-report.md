# Sprint 2 - Bug Reports & Fix Verification (S2-TST-06)

## Overview
Tracking, reproduction steps, resolution details, and fix verification reports for bugs encountered during Sprint 2 (Customer, Product, Price History, and Rights Enforcement).

---

## Bug Log & Verification Details

### 🐛 BUG-S2-01: Price History effective date ordering glitch
- **Severity:** High
- **Description:** When multiple prices were recorded for a single product, the UI occasionally ordered them alphabetically by date string rather than chronologically by timestamp, causing incorrect current-price display.
- **Root Cause:** Missing sort comparator in the price history slice selector before taking index 0.
- **Resolution:** Added sort helper `(a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()` ensuring latest price always takes precedence.
- **Verification:** **PASSED**. Current price now matches the latest effective date <= transaction date.

---

### 🐛 BUG-S2-02: Soft delete modal allowed dismissal on child error
- **Severity:** Medium
- **Description:** If a user attempted to delete a customer with orders, the blocked modal rendered but background state remained pending.
- **Root Cause:** Modal close event did not clear selected entity ID.
- **Resolution:** Updated `onClose` callback in `BlockedDeleteModal` to reset active delete target.
- **Verification:** **PASSED**. Entity state properly resets upon modal dismissal.

---

### 🐛 BUG-S2-03: PayTerms dropdown case mismatch
- **Severity:** Low
- **Description:** Form allowed `net 30` (lowercase) which violated backend database check constraint `('COD', 'Net 15', 'Net 30', 'Net 60')`.
- **Root Cause:** Free-form text input instead of strict select enumeration.
- **Resolution:** Standardized customer form to enforce select menu with canonical constraint values.
- **Verification:** **PASSED**. Invalid terms cannot be entered or submitted.
