# Sprint 4 - Test Cases: Reports Module — All Seven Reports (S4-TST-03)

## Overview
Test suite validating all seven reports in `ReportsPage.tsx`, including data accuracy, date range filtering (`fromDate` / `toDate`), `Top N` ranking limits, employee filtering, per-report permission enforcement, and **Print / Save as PDF** output.

---

## Test Cases Specification

### TC-RPT-01: Product Master List (Current Price)
- **Objective:** Verify that the Product Master List displays every active catalog item with its current effective price from `pricehist`.
- **Preconditions:** User has the `Report - Product Master List` right.
- **Test Steps:**
  1. Open Reports and select **Product Master**.
  2. Verify soft-deleted products are excluded.
  3. Cross-check displayed prices against each product's latest effective price `<=` current date.
- **Expected Result:** All active products appear with accurate current effective prices and units of measure.

### TC-RPT-02: Active Employees vs. All Employees Reports
- **Objective:** Verify separation filtering between **Active Employees (Not Separated)** and **All Employees (Including Separated)**.
- **Test Steps:**
  1. Select **Active Employees** and confirm no employee with a non-null `Sep Date` is listed.
  2. Switch to **All Employees** and verify separated employees appear with their `Sep Date` column populated.
- **Expected Result:** Active Employees strictly excludes separated staff; All Employees shows the complete register including separation status.

### TC-RPT-03: Employee Job History Report & Employee Filter
- **Objective:** Verify effective-dated career and salary records across all employees and for a single selected employee.
- **Test Steps:**
  1. Select **Job History** (`Emp No`, `Employee`, `Eff Date`, `Job`, `Department`, `Salary`).
  2. Keep filter on `All Employees` and verify chronological ordering.
  3. Select a specific employee (e.g., `E-001 — Maria Santos`) from the employee filter dropdown.
- **Expected Result:** Table filters accurately to the selected employee's history rows with matching job titles, departments, and formatted salaries.

### TC-RPT-04: Top Customers, Top Products, and Top Sales (Date Range & Top N)
- **Objective:** Verify ranking, date-range filtering, and `Top N` cap across the three sales analytics reports.
- **Test Steps:**
  1. Select **Top Customers by Sales**, **Top Products by Sales Amount**, and **Top Sales** in turn.
  2. Enter a date range (`fromDate` and `toDate`) and verify transactions outside the range (and soft-deleted sales) are excluded.
  3. Change `Top N` from default `25` to `3` and verify only the top 3 ranked rows appear in descending order of total sales amount.
  4. Test invalid date range (`fromDate > toDate`) or empty period.
- **Expected Result:** Rankings match active sales totals strictly within `[fromDate, toDate]`, row count respects `Top N`, and empty ranges render a clean empty state.

### TC-RPT-05: Per-Report Rights Enforcement
- **Objective:** Verify each of the seven reports is independently gated by its corresponding per-report right.
- **Test Steps:**
  1. Log in as a user granted only `Product Master` and `Active Employees` report rights.
  2. Navigate to Reports and verify only those two report tabs/cards are accessible.
  3. Attempt to access restricted reports (e.g., `Employee Job History` or `Top Sales`) directly or via API.
- **Expected Result:** Unauthorized reports are hidden in the UI and blocked server-side (`403 Forbidden`).

### TC-RPT-06: Print / Save as PDF Output
- **Objective:** Verify print layout and PDF export across all seven reports.
- **Test Steps:**
  1. Apply active filters (e.g., date range + `Top N = 5`) on a report and click **Print / Save as PDF**.
  2. Inspect the print preview layout.
- **Expected Result:** Browser print/PDF dialog triggers cleanly; sidebar/navigation chrome is hidden via print styles, and report title, active filter summary, and full table render legibly without clipping.
