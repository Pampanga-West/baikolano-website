-- ==============================================================================
-- Migration: V2_6__search_performance_and_index_tuning.sql
-- Task ID: S2-DBA-08 (Search performance check and index tuning)
-- Description: Enable pg_trgm extension and configure GIN trigram indexes
--              plus B-tree varchar_pattern_ops indexes for high-speed ILIKE
--              and substring pattern matching on customers and products.
-- ==============================================================================

-- 1. Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Trigram GIN indexes for fuzzy / substring wildcard search (e.g. ILIKE '%term%')
CREATE INDEX IF NOT EXISTS idx_customer_custname_trgm
  ON public.customer
  USING gin (custname gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customer_address_trgm
  ON public.customer
  USING gin (address gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_product_description_trgm
  ON public.product
  USING gin (description gin_trgm_ops);

-- 3. B-Tree pattern-ops indexes for anchored prefix searches (e.g. LIKE 'term%')
CREATE INDEX IF NOT EXISTS idx_customer_custname_pattern
  ON public.customer (custname varchar_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_product_description_pattern
  ON public.product (description varchar_pattern_ops);

-- 4. Analyze tables to refresh statistics for query planner
ANALYZE public.customer;
ANALYZE public.product;
