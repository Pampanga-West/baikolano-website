# Sprint 4 - Test Cases: Payment & Balance Tests (S4-TST-02)

## Overview
Test suite validating payment recording, payment history tracking, transaction remaining balance calculations, and customer-level balance summaries in `SalesPage.tsx` (`Payments` modal).

---

## Test Cases Specification

### TC-PAY-01: Open Payments & Balance Modal (`Payment History` Tab)
- **Objective:** Verify that the Payments & Balance modal displays accurate transaction totals, total paid, remaining balance, and payment history rows.
- **Preconditions:** User has `Sales - View` / `Payment - View` rights; sales transaction `T-001` has line items totaling `$500.00` and one prior payment of `$200.00`.
- **Test Steps:**
  1. Open `Payments & Balance` for transaction `T-001`.
  2. Inspect the `balance-strip` summary (`Transaction Total`, `Total Paid`, `Remaining Balance`).
  3. Inspect the `Payment History` table (OR/Receipt No., Payment Date, Amount, Method/Notes).
- **Expected Result:** `Transaction Total` = `$500.00`, `Total Paid` = `$200.00`, `Remaining Balance` = `$300.00`, and existing payment receipt appears in `Payment History`.

### TC-PAY-02: Record Partial & Full Payment Against a Transaction
- **Objective:** Verify recording a partial payment and subsequently settling the remaining balance.
- **Test Steps:**
  1. In `Payments & Balance` for `T-001` (Remaining Balance `$300.00`), enter Payment Amount `$100.00` with a valid Payment Date and submit.
  2. Verify updated `Total Paid` and `Remaining Balance`.
  3. Record a second payment of `$200.00` to settle the transaction in full.
- **Expected Result:**
  - After partial payment: `Total Paid` = `$300.00`, `Remaining Balance` = `$200.00`.
  - After final payment: `Total Paid` = `$500.00`, `Remaining Balance` = `$0.00` (Paid in full).
  - Each payment generates a receipt record and logs an entry in `audit_log`.

### TC-PAY-03: Payment Input Validation (Zero, Negative, and Overpayment)
- **Objective:** Verify invalid payment amounts and dates are rejected.
- **Test Steps:**
  1. Attempt to submit a payment of `$0.00` or `-50.00`.
  2. Attempt to submit a payment exceeding the `Remaining Balance` (e.g., `$350.00` when balance is `$300.00`).
  3. Attempt to submit with a missing payment date.
- **Expected Result:** Form blocks submission with clear validation errors; database balance remains unchanged.

### TC-PAY-04: Customer Balance Summary Tab
- **Objective:** Verify aggregated balance per customer across multiple active transactions.
- **Preconditions:** Customer `C-001` has two active sales: `T-001` (Total `$500.00`, Paid `$200.00`) and `T-002` (Total `$300.00`, Paid `$300.00`), plus one soft-deleted sale `T-004`.
- **Test Steps:**
  1. Switch to the `Customer Balance Summary` tab in `Payments & Balance`.
  2. Locate `C-001` and verify Total Billed, Total Paid, and Outstanding Balance.
- **Expected Result:** `Total Billed` = `$800.00`, `Total Paid` = `$500.00`, `Outstanding Balance` = `$300.00`. Soft-deleted transaction `T-004` is excluded from active customer balance totals.

### TC-PAY-05: Payment Rights Enforcement & Audit Logging
- **Objective:** Verify that users without payment recording rights cannot submit payments.
- **Test Steps:**
  1. Log in as a user with `Sales - View` only (without `Record Payment` right).
  2. Open `Payments & Balance` modal.
- **Expected Result:** Payment history and balances are viewable in read-only mode, while the payment submission form/button is hidden or disabled and unauthorized POST calls return `403 Forbidden`.
