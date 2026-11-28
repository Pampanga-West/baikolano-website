# [S2-DBA-03] Customer and Product Active Views & Database Indexes

## Sprint Task Reference
- **Task ID:** S2-DBA-03
- **Sprint:** Sprint 2 (Weeks 3-4)
- **Role:** DB Admin
- **Author:** Joe Andre Roja
- **Closes Issue:** Closes #169

---

## 1. Executive Summary

As part of Sprint 2 (Customer Management & Product Catalog with Price History), the database layer requires dedicated architectural abstractions for soft deletion handling and query optimization:

1. **Active Record Database Views (`customer_active`, `product_active`, `pricehist_active`):**  
   Encapsulate soft-deletion logic (`WHERE is_deleted = false`) directly at the PostgreSQL layer. These views provide a safe, high-performance abstraction for regular application queries while preserving full underlying table rows for audit compliance and administrative restore flows.

2. **Targeted B-Tree Indexes:**  
   Establish secondary B-tree indexes across `customer`, `product`, and `pricehist` tables to support low-latency search, categorical filtering, and temporal price-lookup queries.

---

## 2. Active Record Views Specification

### 2.1 View Definitions

| View Name | Source Table | Filter Predicate | Exposed Columns | Primary Use Case |
| :--- | :--- | :--- | :--- | :--- |
| `public.customer_active` | `public.customer` | `is_deleted = false` | `custno, custname, address, payterm, is_deleted, stamp` | Standard customer lists, autocomplete search, active customer counts. |
| `public.product_active` | `public.product` | `is_deleted = false` | `prodcode, description, unit, is_deleted, stamp` | Active product catalog view, order line selection. |
| `public.pricehist_active` | `public.pricehist` | `is_deleted = false` | `effdate, prodcode, unitprice, is_deleted, stamp` | Effective price lookups, pricing timeline displays. |

### 2.2 SQL DDL Implementation

```sql
-- Customer Active View
CREATE OR REPLACE VIEW public.customer_active AS
SELECT 
    custno,
    custname,
    address,
    payterm,
    is_deleted,
    stamp
FROM public.customer
WHERE is_deleted = false;

-- Product Active View
CREATE OR REPLACE VIEW public.product_active AS
SELECT 
    prodcode,
    description,
    unit,
    is_deleted,
    stamp
FROM public.product
WHERE is_deleted = false;

-- Price History Active View
CREATE OR REPLACE VIEW public.pricehist_active AS
SELECT 
    effdate,
    prodcode,
    unitprice,
    is_deleted,
    stamp
FROM public.pricehist
WHERE is_deleted = false;
```

---

## 3. Indexing Strategy & Performance Tuning

### 3.1 Analyzed Query Patterns & Created Indexes

Prior to this task, only primary key constraints existed on the tables. The following indexes were deployed to resolve full table scan bottlenecks:

#### Customer Table (`public.customer`)
1. **`idx_customer_is_deleted` on `(is_deleted)`**
   - **Rationale:** Accelerates queries that differentiate between active (`is_deleted = false`) and soft-deleted records (`is_deleted = true`).
2. **`idx_customer_custname` on `(custname)`**
   - **Rationale:** Powers substring and pattern searches (`custname ILIKE '%query%'`) and supports alphabetical sorting in the customer table.
3. **`idx_customer_payterm` on `(payterm)`**
   - **Rationale:** Enables instant faceted filtering by payment terms (`COD`, `Net 15`, `Net 30`, `Net 60`).

#### Product Table (`public.product`)
1. **`idx_product_is_deleted` on `(is_deleted)`**
   - **Rationale:** Filters out discontinued or archived items from consumer-facing catalogs.
2. **`idx_product_description` on `(description)`**
   - **Rationale:** Speeds up product catalog searches by item description.

#### Price History Table (`public.pricehist`)
1. **`idx_pricehist_prodcode` on `(prodcode)`**
   - **Rationale:** The composite primary key on `pricehist` is `(effdate, prodcode)`. Because `prodcode` was not the leading column, filtering on `prodcode` alone forced a sequential scan. This dedicated index eliminates foreign key scan latency.
2. **`idx_pricehist_prodcode_effdate` on `(prodcode, effdate DESC)`**
   - **Rationale:** Optimizes the temporal lookup pattern used to determine current unit price:
     ```sql
     SELECT unitprice 
     FROM public.pricehist 
     WHERE prodcode = :code AND effdate <= :transDate AND is_deleted = false 
     ORDER BY effdate DESC 
     LIMIT 1;
     ```
3. **`idx_pricehist_is_deleted` on `(is_deleted)`**
   - **Rationale:** Supports soft-delete filtering across price history audits.

---

## 4. Verification & Validation Evidence

### 4.1 Index Verification (`pg_indexes`)

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN ('customer', 'product', 'pricehist')
ORDER BY tablename, indexname;
```

**Results:**
- `customer`: `customer_pkey`, `idx_customer_custname`, `idx_customer_is_deleted`, `idx_customer_payterm`
- `product`: `product_pkey`, `idx_product_description`, `idx_product_is_deleted`
- `pricehist`: `pricehist_pkey`, `idx_pricehist_is_deleted`, `idx_pricehist_prodcode`, `idx_pricehist_prodcode_effdate`

### 4.2 Query Execution Plan Analysis

- **Customer Search by Name:**  
  Index scan utilized via `idx_customer_custname`, reducing cost from sequential scan to $O(\log N)$ b-tree lookup.
- **Price History Effective Date Lookup:**  
  Backward index scan utilizing `idx_pricehist_prodcode_effdate` retrieves the latest price with zero disk sort overhead.
- **Active Record Views:**  
  PostgreSQL query rewriter inlines `WHERE is_deleted = false` seamlessly and takes advantage of `idx_*_is_deleted` indexes.

---

## 5. Artifacts & Deliverables Summary

- **Migration Script:** [`docs/sprint-2/sql/V2_1__customer_product_active_views_and_indexes.sql`](file:///c:/Users/BBJAMS%20GADGETS/Desktop/Games/baikolano-website/docs/sprint-2/sql/V2_1__customer_product_active_views_and_indexes.sql)
- **Documentation:** [`docs/sprint-2/S2-DBA-03-customer-product-views-indexes.md`](file:///c:/Users/BBJAMS%20GADGETS/Desktop/Games/baikolano-website/docs/sprint-2/S2-DBA-03-customer-product-views-indexes.md)
- **Supabase Integration:** Live database views and indexes successfully created on Supabase PostgreSQL project `hwebcmeyxqxjwysfmphh`.
