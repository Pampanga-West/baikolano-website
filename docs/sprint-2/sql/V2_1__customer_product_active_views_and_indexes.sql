-- =============================================================================
-- Migration: V2_1__customer_product_active_views_and_indexes.sql
-- Sprint 2 Task: [S2-DBA-03] Customer and product active views, indexes
-- Author: Joe Andre Roja (DB Admin)
-- Description:
--   Creates active-record database views for customer, product, and pricehist
--   filtering out soft-deleted records (is_deleted = false).
--   Adds B-tree performance indexes on soft-deletion flags, search columns,
--   filter attributes, and composite historical pricing lookups.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Active Record Views
-- -----------------------------------------------------------------------------

-- Customer Active View
-- Exposes all active customer master records while filtering out soft-deleted entries.
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

COMMENT ON VIEW public.customer_active IS 'Active customer records excluding soft-deleted entities (is_deleted = false).';

-- Product Active View
-- Exposes active catalog products while hiding discontinued or soft-deleted items.
CREATE OR REPLACE VIEW public.product_active AS
SELECT 
    prodcode,
    description,
    unit,
    is_deleted,
    stamp
FROM public.product
WHERE is_deleted = false;

COMMENT ON VIEW public.product_active IS 'Active product catalog items excluding soft-deleted items (is_deleted = false).';

-- Price History Active View
-- Exposes valid pricing timeline entries for products.
CREATE OR REPLACE VIEW public.pricehist_active AS
SELECT 
    effdate,
    prodcode,
    unitprice,
    is_deleted,
    stamp
FROM public.pricehist
WHERE is_deleted = false;

COMMENT ON VIEW public.pricehist_active IS 'Active price history timeline records excluding soft-deleted items (is_deleted = false).';


-- -----------------------------------------------------------------------------
-- 2. Performance Indexes
-- -----------------------------------------------------------------------------

-- Customer Table Indexes:
-- Accelerates boolean filtering for active vs inactive customer searches
CREATE INDEX IF NOT EXISTS idx_customer_is_deleted 
    ON public.customer (is_deleted);

-- Accelerates customer name searching, ILIKE prefix scans, and alphabetically sorted listings
CREATE INDEX IF NOT EXISTS idx_customer_custname 
    ON public.customer (custname);

-- Accelerates payment term filtering (e.g., COD, Net 15, Net 30, Net 60)
CREATE INDEX IF NOT EXISTS idx_customer_payterm 
    ON public.customer (payterm);


-- Product Table Indexes:
-- Accelerates active product filtering
CREATE INDEX IF NOT EXISTS idx_product_is_deleted 
    ON public.product (is_deleted);

-- Accelerates product catalog searching by description and substring filtering
CREATE INDEX IF NOT EXISTS idx_product_description 
    ON public.product (description);


-- Price History Table Indexes:
-- Supports foreign key traversal from product to price history
CREATE INDEX IF NOT EXISTS idx_pricehist_prodcode 
    ON public.pricehist (prodcode);

-- Composite index optimizing effective price lookups as of a specific date (effdate <= current_date ORDER BY effdate DESC)
CREATE INDEX IF NOT EXISTS idx_pricehist_prodcode_effdate 
    ON public.pricehist (prodcode, effdate DESC);

-- Accelerates soft-deletion checks on price history records
CREATE INDEX IF NOT EXISTS idx_pricehist_is_deleted 
    ON public.pricehist (is_deleted);
