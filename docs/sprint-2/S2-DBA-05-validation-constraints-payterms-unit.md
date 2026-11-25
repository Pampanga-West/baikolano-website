# [S2-DBA-05] Validation Constraints: Payment Terms & Units of Measure

## Sprint Task Reference
- **Task ID:** S2-DBA-05
- **Sprint:** Sprint 2 (Weeks 3-4)
- **Role:** DB Admin
- **Author:** Joe Andre Roja
- **Closes Issue:** Closes #175

---

## 1. Executive Summary

During Sprint 2 development and testing (`S2-TST-01`, `S2-TST-02`, and `BUG-S2-03`), the database encountered two critical schema bottlenecks originating from legacy table configurations:

1. **Legacy Column Width Restrictions (`VARCHAR(3)`):**  
   Both `customer.payterm` and `product.unit` were constrained to `VARCHAR(3)`. This caused PostgreSQL to reject modern enterprise terms (e.g. `'Net 30'`, `'Prepaid'`, `'liter'`, `'meter'`, `'pair'`) with error code `22001 (value too long for type character varying(3))`.

2. **Restrictive Legacy Check Constraints:**  
   - `customer.pay_ck` only allowed `['COD', '30D', '45D']`.
   - `product.unit_ck` only allowed `['pc', 'ea', 'mtr', 'pkg', 'ltr']`.

This task upgrades the schema by:
- Widening `customer.payterm` and `product.unit` to `VARCHAR(20)`.
- Deploying the standardized `customer_payterm_check` constraint supporting all enterprise payment terms.
- Deploying the standardized `product_unit_check` constraint with case-insensitive validation (`lower(trim(unit))`).
- Enforcing non-negative price validation on `pricehist.unitprice`.

---

## 2. Validation Constraints Specification

### 2.1 Customer Payment Terms (`customer.payterm`)

| Attribute | Specification |
| :--- | :--- |
| **Constraint Name** | `customer_payterm_check` |
| **Column Type** | `character varying(20)` |
| **Allowed Values** | `'COD'`, `'30D'`, `'45D'`, `'60D'`, `'Net 15'`, `'Net 30'`, `'Net 45'`, `'Net 60'`, `'Prepaid'` |
| **Integrity Guard** | `trim(payterm) = ANY (...)` prevents whitespace padding bypass |
| **Rejection Behavior** | Raises `check_violation` (PostgreSQL error `23514`) on illegal or unrecognized terms |

### 2.2 Product Unit of Measure (`product.unit`)

| Attribute | Specification |
| :--- | :--- |
| **Constraint Name** | `product_unit_check` |
| **Column Type** | `character varying(20)` |
| **Allowed Values** | `'pc'`, `'pcs'`, `'ea'`, `'box'`, `'kg'`, `'liter'`, `'ltr'`, `'can'`, `'pair'`, `'meter'`, `'mtr'`, `'pack'`, `'pkg'`, `'set'`, `'roll'` |
| **Integrity Guard** | `lower(trim(unit)) = ANY (...)` ensures case-insensitive conformance |
| **Rejection Behavior** | Raises `check_violation` (PostgreSQL error `23514`) on unapproved unit codes |

### 2.3 Historical Unit Pricing (`pricehist.unitprice`)

| Attribute | Specification |
| :--- | :--- |
| **Constraint Name** | `pricehist_unitprice_check` |
| **Predicate** | `unitprice >= 0` |
| **Business Value** | Precludes negative sales rates and invalid billing entry |

---

## 3. SQL Implementation Details

```sql
-- 1. Column Width Alteration
ALTER TABLE public.customer ALTER COLUMN payterm TYPE character varying(20);
ALTER TABLE public.product ALTER COLUMN unit TYPE character varying(20);

-- 2. Customer Payterm Constraint
ALTER TABLE public.customer DROP CONSTRAINT IF EXISTS pay_ck;
ALTER TABLE public.customer DROP CONSTRAINT IF EXISTS customer_payterm_check;

ALTER TABLE public.customer
    ADD CONSTRAINT customer_payterm_check 
    CHECK (
        trim(payterm) = ANY (ARRAY[
            'COD', '30D', '45D', '60D', 
            'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Prepaid'
        ])
    );

-- 3. Product Unit Constraint
ALTER TABLE public.product DROP CONSTRAINT IF EXISTS unit_ck;
ALTER TABLE public.product DROP CONSTRAINT IF EXISTS product_unit_check;

ALTER TABLE public.product
    ADD CONSTRAINT product_unit_check 
    CHECK (
        lower(trim(unit)) = ANY (ARRAY[
            'pc', 'pcs', 'ea', 'box', 'kg', 'liter', 'ltr', 
            'can', 'pair', 'meter', 'mtr', 'pack', 'pkg', 'set', 'roll'
        ])
    );

-- 4. Price History Constraint
ALTER TABLE public.pricehist DROP CONSTRAINT IF EXISTS pricehist_unitprice_check;

ALTER TABLE public.pricehist
    ADD CONSTRAINT pricehist_unitprice_check 
    CHECK (unitprice >= 0);
```

---

## 4. Verification & Validation Evidence

### 4.1 Constraint Query (`pg_constraint`)

```sql
SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid IN ('public.customer'::regclass, 'public.product'::regclass, 'public.pricehist'::regclass)
  AND contype = 'c';
```

**Results:**
- `customer`: `customer_payterm_check` on `(TRIM(BOTH FROM payterm) = ANY (...))`
- `product`: `product_unit_check` on `(lower(TRIM(BOTH FROM unit)) = ANY (...))`
- `pricehist`: `pricehist_unitprice_check` on `(unitprice >= 0)`

### 4.2 Automated Test Execution Matrix

| Test Scenario | Input Data | Target Column | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Valid standard term | `'Net 30'` | `customer.payterm` | Insert accepted | Accepted | **PASS** |
| Valid COD term | `'COD'` | `customer.payterm` | Insert accepted | Accepted | **PASS** |
| Invalid term rejection | `'Bogus'` | `customer.payterm` | `check_violation` | `23514 check_violation` | **PASS** |
| Valid unit (case insensitivity) | `'Liter'`, `'liter'` | `product.unit` | Insert accepted | Accepted | **PASS** |
| Valid standard units | `'box'`, `'pair'`, `'pcs'` | `product.unit` | Insert accepted | Accepted | **PASS** |
| Invalid unit rejection | `'Bogus'` | `product.unit` | `check_violation` | `23514 check_violation` | **PASS** |
| Negative price rejection | `-15.00` | `pricehist.unitprice` | `check_violation` | `23514 check_violation` | **PASS** |

---

## 5. Artifacts Summary

- **SQL Migration:** [`docs/sprint-2/sql/V2_3__validation_constraints_payterms_unit.sql`](file:///c:/Users/BBJAMS%20GADGETS/Desktop/Games/baikolano-website/docs/sprint-2/sql/V2_3__validation_constraints_payterms_unit.sql)
- **Technical Documentation:** [`docs/sprint-2/S2-DBA-05-validation-constraints-payterms-unit.md`](file:///c:/Users/BBJAMS%20GADGETS/Desktop/Games/baikolano-website/docs/sprint-2/S2-DBA-05-validation-constraints-payterms-unit.md)
- **Live Database Status:** Constraints active and verified on Supabase PostgreSQL project `hwebcmeyxqxjwysfmphh`.
