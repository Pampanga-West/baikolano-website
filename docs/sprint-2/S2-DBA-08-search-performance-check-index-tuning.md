# S2-DBA-08: Search Performance Check and Index Tuning

## Task Overview
- **Task ID:** `S2-DBA-08`
- **Role:** DB Admin (`JoeAndreRoja`)
- **Sprint:** Sprint 2
- **Related Issue:** Closes #214
- **Date:** 2026-11-27

---

## 1. Problem Statement
The customer and product tables are frequently searched via text input fields in the user interface (e.g. quick search filters, live dropdown selectors, autocomplete). Standard queries use substring matches such as:
```sql
SELECT custno, custname, address, status 
FROM public.customer 
WHERE is_deleted = false 
  AND custname ILIKE '%build%';
```
and
```sql
SELECT prodcode, description, unit, status 
FROM public.product 
WHERE is_deleted = false 
  AND description ILIKE '%cable%';
```

Without specialized indexing:
- Default B-Tree indexes on `custname` and `description` cannot accelerate queries with leading wildcards (`%query%` or case-insensitive `ILIKE`).
- Every search query causes a full table Sequential Scan (`Seq Scan`), scanning every page and applying filtering row-by-row.
- As the dataset grows into thousands or tens of thousands of records, UI latency degrades significantly.

---

## 2. Implemented Optimization & Indexes

### A. Extension: `pg_trgm`
The PostgreSQL `pg_trgm` extension breaks strings into trigrams (contiguous 3-character substrings) and allows Generalized Inverted Indexes (`GIN`) to evaluate `LIKE`, `ILIKE`, and similarity operators efficiently.

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### B. Trigram GIN Indexes
We created GIN indexes with `gin_trgm_ops` on high-traffic text search columns:
1. `idx_customer_custname_trgm` on `customer USING gin (custname gin_trgm_ops)`
2. `idx_customer_address_trgm` on `customer USING gin (address gin_trgm_ops)`
3. `idx_product_description_trgm` on `product USING gin (description gin_trgm_ops)`

### C. Pattern-Ops B-Tree Indexes
For strict anchored prefix searches (e.g., typing the initial letters `Lumb%` without leading wildcard), we added B-Tree indexes using `varchar_pattern_ops`:
1. `idx_customer_custname_pattern` on `customer (custname varchar_pattern_ops)`
2. `idx_product_description_pattern` on `product (description varchar_pattern_ops)`

---

## 3. Performance Analysis & Query Plans (`EXPLAIN`)

### Before Tuning (Unindexed Substring ILIKE)
```
QUERY PLAN
Seq Scan on public.product  (cost=0.00..1.25 rows=1 width=72)
  Filter: ((NOT is_deleted) AND ((description)::text ~~* '%cable%'::text))
```
- Execution engine scans 100% of rows.
- Scales linearly with dataset size ($O(N)$).

### After Tuning with Trigram GIN (`EXPLAIN`)
```
QUERY PLAN
Bitmap Heap Scan on public.product  (cost=8.00..12.01 rows=1 width=72)
  Recheck Cond: ((description)::text ~~* '%cable%'::text)
  Filter: (NOT is_deleted)
  ->  Bitmap Index Scan on idx_product_description_trgm  (cost=0.00..8.00 rows=1 width=0)
        Index Cond: ((description)::text ~~* '%cable%'::text)
```
- Substring query resolves directly via the inverted index.
- Reduces disk page reads from $O(N)$ to logarithmic inverted list lookups ($O(\log N)$).

### Prefix Search with Pattern Ops (`EXPLAIN`)
```
QUERY PLAN
Index Scan using idx_customer_custname_pattern on public.customer  (cost=0.15..8.17 rows=1 width=85)
  Index Cond: (((custname)::text ~>=~ 'Lum'::text) AND ((custname)::text ~<~ 'Lun'::text))
  Filter: (((custname)::text ~~ 'Lum%'::text) AND (NOT is_deleted))
```
- Direct B-Tree Index Scan for fast prefix matching.

---

## 4. Verification & Status in Supabase
The migration `V2_6__search_performance_and_index_tuning.sql` was executed and verified on database `hwebcmeyxqxjwysfmphh`:

```sql
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('customer', 'product')
  AND indexname LIKE '%_trgm' OR indexname LIKE '%_pattern';
```

| Table | Index Name | Index Definition | Status |
|---|---|---|---|
| `customer` | `idx_customer_custname_trgm` | `CREATE INDEX idx_customer_custname_trgm ON public.customer USING gin (custname gin_trgm_ops)` | ACTIVE |
| `customer` | `idx_customer_address_trgm` | `CREATE INDEX idx_customer_address_trgm ON public.customer USING gin (address gin_trgm_ops)` | ACTIVE |
| `product` | `idx_product_description_trgm` | `CREATE INDEX idx_product_description_trgm ON public.product USING gin (description gin_trgm_ops)` | ACTIVE |
| `customer` | `idx_customer_custname_pattern` | `CREATE INDEX idx_customer_custname_pattern ON public.customer USING btree (custname varchar_pattern_ops)` | ACTIVE |
| `product` | `idx_product_description_pattern` | `CREATE INDEX idx_product_description_pattern ON public.product USING btree (description varchar_pattern_ops)` | ACTIVE |

---

## 5. Maintenance Guidelines
1. **Index Rebuilding:** GIN indexes can be refreshed after bulk inserts using `REINDEX INDEX <index_name>;`.
2. **Vacuum & Analyze:** Auto-vacuum will keep stats updated; manual `ANALYZE customer; ANALYZE product;` is recommended after large CSV/batch imports.
