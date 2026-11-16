# Sprint 2 - Test Cases: Customer Module (S2-TST-01)

## Overview
Comprehensive test suite covering the Customer module specifications for Sprint 2 of HOPE ERP, ensuring compliance with client requirements, search & filtering behavior, validation constraints, and role-based permissions.

---

## Test Cases Specification

### TC-CUST-01: Customer List View & Column Rendering
- **Objective:** Verify that the Customer List correctly renders all required fields.
- **Preconditions:** User is logged in with `Customer - View` rights.
- **Test Steps:**
  1. Navigate to Customers page (`/customers` or via sidebar).
  2. Verify table columns: Customer ID, Company / Customer Name, Contact Person, Email, Phone, Payment Terms, Status, Actions.
- **Expected Result:** Table displays active customers and active count matches database view.

### TC-CUST-02: Search & Filter Functionality
- **Objective:** Verify dynamic filtering by customer name, contact person, or payment terms.
- **Test Steps:**
  1. Enter search term matching a customer name.
  2. Filter by payment terms (`COD`, `Net 15`, `Net 30`, `Net 60`).
  3. Clear filters.
- **Expected Result:** Search query filters real-time; clearing restores default view without reloading.

### TC-CUST-03: Create Customer Validation
- **Objective:** Verify validation rules when creating a new customer.
- **Test Steps:**
  1. Click "Add Customer".
  2. Attempt submit with empty customer name.
  3. Enter invalid email format (e.g. `test@invalid`).
  4. Submit valid customer with valid `payTerms`.
- **Expected Result:** Form highlights required/invalid fields; valid customer created with status `Active` and logged in `audit_log`.

### TC-CUST-04: Edit Customer Information
- **Objective:** Verify editing existing customer details.
- **Test Steps:**
  1. Open Edit modal for customer `CUST-001`.
  2. Modify contact person and phone number.
  3. Save changes.
- **Expected Result:** Updates persist immediately and audit log records updated fields.
