# [S2-DBA-04] Query: Current Price as of a Given Date

## Sprint Task Reference
- **Task ID:** S2-DBA-04
- **Sprint:** Sprint 2 (Weeks 3-4)
- **Role:** DB Admin
- **Author:** Joe Andre Roja
- **Closes Issue:** Closes #173

---

## 1. Executive Summary

In enterprise sales and inventory systems (HOPE ERP), product pricing changes over time. When creating sales orders, auditing historical invoices, or displaying product catalogs, the database must accurately resolve the **effective price as of a given transaction date** rather than merely fetching the latest price or a static column value.

This task delivers:
1. **`public.get_price_as_of_date(prodcode, as_of_date)`:** A PostgreSQL database function returning the single effective `unitprice` for a specific product as of a transaction date.
2. **`public.get_product_prices_as_of_date(as_of_date)`:** A parameterized table function returning the full active catalog with effective prices as of any date.
3. **`public.product_current_price` View:** A real-time database view exposing active products with their current effective pricing as of `CURRENT_DATE`.
4. **Sub-millisecond Performance Tuning:** Leveraging the composite index `idx_pricehist_prodcode_effdate` (`prodcode, effdate DESC`) to achieve $0.079\text{ ms}$ query execution without disk sorting.
5. **Frontend Client Integration:** Helper functions in `frontend/src/backend/supabaseClient.ts` invoking the PostgREST RPC endpoint (`/rpc/get_price_as_of_date`).

---

## 2. Business Logic & Query Design

### 2.1 The Effective Date Principle
When resolving unit price for product $P$ on date $D$:
- **Candidate Pool:** All non-deleted rows in `pricehist` where `prodcode = P` and `effdate <= D`.
- **Precedence Rule:** If multiple price changes predate $D$, the record with the latest effective date ($\max(\text{effdate})$) is the active price.
- **Edge Cases Handled:**
  - **Date predates all price history:** Returns `NULL`, alerting the application to specify a base price.
  - **Exact date match:** The entry on date $D$ immediately takes effect.
  - **Soft-deleted price adjustments:** Ignored (`is_deleted = false`).
  - **Multiple price changes in catalog:** The function uses `DISTINCT ON (prodcode)` with `ORDER BY prodcode, effdate DESC`.

---

## 3. Database Implementation

### 3.1 Function: `get_price_as_of_date`

```sql
CREATE OR REPLACE FUNCTION public.get_price_as_of_date(
    p_prodcode character varying,
    p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
    SELECT unitprice
    FROM public.pricehist
    WHERE prodcode = p_prodcode
      AND effdate <= p_as_of_date
      AND is_deleted = false
    ORDER BY effdate DESC
    LIMIT 1;
$$;
```

### 3.2 Function: `get_product_prices_as_of_date`

```sql
CREATE OR REPLACE FUNCTION public.get_product_prices_as_of_date(
    p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    prodcode character varying,
    description character varying,
    unit character varying,
    unitprice numeric,
    effdate date
)
LANGUAGE sql
STABLE
AS $$
    SELECT DISTINCT ON (p.prodcode)
        p.prodcode,
        p.description,
        p.unit,
        ph.unitprice,
        ph.effdate
    FROM public.product p
    LEFT JOIN public.pricehist ph 
        ON p.prodcode = ph.prodcode 
       AND ph.effdate <= p_as_of_date 
       AND ph.is_deleted = false
    WHERE p.is_deleted = false
    ORDER BY p.prodcode, ph.effdate DESC;
$$;
```

### 3.3 View: `product_current_price`

```sql
CREATE OR REPLACE VIEW public.product_current_price AS
SELECT DISTINCT ON (p.prodcode)
    p.prodcode,
    p.description,
    p.unit,
    COALESCE(ph.unitprice, 0) AS current_price,
    ph.effdate AS price_effdate
FROM public.product p
LEFT JOIN public.pricehist ph 
    ON p.prodcode = ph.prodcode 
   AND ph.effdate <= CURRENT_DATE 
   AND ph.is_deleted = false
WHERE p.is_deleted = false
ORDER BY p.prodcode, ph.effdate DESC;
```

---

## 4. Query Execution Plan & Verification

### 4.1 Benchmark Analysis (`EXPLAIN ANALYZE`)

Query executed on Supabase PostgreSQL with production dataset:

```sql
EXPLAIN (ANALYZE, COSTS, BUFFERS)
SELECT unitprice
FROM public.pricehist
WHERE prodcode = 'AM0001'
  AND effdate <= '2010-09-01'::date
  AND is_deleted = false
ORDER BY effdate DESC
LIMIT 1;
```

**Plan Output:**
```text
Limit  (cost=0.14..1.79 rows=1 width=10) (actual time=0.023..0.024 rows=1 loops=1)
  Buffers: shared hit=2
  ->  Index Scan using idx_pricehist_prodcode_effdate on pricehist  (cost=0.14..3.45 rows=2 width=10) (actual time=0.022..0.022 rows=1 loops=1)
        Index Cond: (((prodcode)::text = 'AM0001'::text) AND (effdate <= '2010-09-01'::date))
        Filter: (NOT is_deleted)
        Buffers: shared hit=2
Planning Time: 0.573 ms
Execution Time: 0.079 ms
```

- **Index Used:** `idx_pricehist_prodcode_effdate` (composite on `prodcode, effdate DESC`).
- **Buffers:** `shared hit=2` (zero disk I/O, 100% memory hit).
- **Execution Time:** **0.079 milliseconds** ($< 0.1\text{ ms}$).

### 4.2 Test Verification Results

| Product Code | Target Date | Expected Price | Actual Database Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| `AM0001` (MS Wireless Mouse) | `2010-06-01` | `$36.45` | `$36.45` | **PASS** |
| `AM0001` (MS Wireless Mouse) | `2010-09-01` | `$38.27` | `$38.27` | **PASS** |
| `AM0001` (MS Wireless Mouse) | `2010-01-01` (Prior to launch) | `NULL` | `NULL` | **PASS** |
| `AK0001` (HP Pavilion DV6000) | `2026-11-25` (Current date) | `$12.00` | `$12.00` | **PASS** |

### 4.3 PostgREST RPC Verification

```bash
curl -X POST "https://hwebcmeyxqxjwysfmphh.supabase.co/rest/v1/rpc/get_price_as_of_date" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"p_prodcode": "AM0001", "p_as_of_date": "2010-09-01"}'
# Response: 38.27
```

---

## 5. Summary of Deliverables

- **SQL Migration:** [`docs/sprint-2/sql/V2_2__query_current_price_as_of_date.sql`](file:///c:/Users/BBJAMS%20GADGETS/Desktop/Games/baikolano-website/docs/sprint-2/sql/V2_2__query_current_price_as_of_date.sql)
- **Technical Documentation:** [`docs/sprint-2/S2-DBA-04-query-current-price-as-of-date.md`](file:///c:/Users/BBJAMS%20GADGETS/Desktop/Games/baikolano-website/docs/sprint-2/S2-DBA-04-query-current-price-as-of-date.md)
- **TypeScript Integration:** [`frontend/src/backend/supabaseClient.ts`](file:///c:/Users/BBJAMS%20GADGETS/Desktop/Games/baikolano-website/frontend/src/backend/supabaseClient.ts) (`fetchPriceAsOfDateFromSupabase`)
- **Live Deployment:** Applied directly to Supabase PostgreSQL project `hwebcmeyxqxjwysfmphh`.
