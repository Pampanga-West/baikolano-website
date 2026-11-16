# Sprint 2 - Test Cases: Product & Price History (S2-TST-02)

## Overview
Test suite validating Product catalog operations and historical pricing workflows for Sprint 2.

---

## Test Cases Specification

### TC-PROD-01: Product Catalog Display & Fields
- **Objective:** Verify product list renders product code, description, unit of measure, unit price, stock quantity, and status.
- **Preconditions:** User has `Product - View` rights.
- **Expected Result:** Products appear with correct effective pricing as of current date.

### TC-PROD-02: Product Search by Code & Description
- **Objective:** Test search bar responsiveness on product catalogue.
- **Expected Result:** Filter matches substring of both product code and description instantly.

### TC-PROD-03: Create & Edit Product Validation
- **Objective:** Validate constraint checking (e.g. positive pricing, valid unit).
- **Expected Result:** Reject negative prices or blank product codes; successful saves update database and log audit record.

### TC-PROD-04: Price History Timeline & Effective Date Lookup
- **Objective:** Verify price history records (Add, Edit, Delete price) and price lookup as of a specific date.
- **Expected Result:** Effective price is determined by the most recent effective date prior to or equal to transaction date. Duplicate effective dates are rejected.
