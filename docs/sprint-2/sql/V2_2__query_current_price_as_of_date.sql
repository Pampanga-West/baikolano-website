-- =============================================================================
-- Migration: V2_2__query_current_price_as_of_date.sql
-- Sprint 2 Task: [S2-DBA-04] Query: current price as of a given date
-- Author: Joe Andre Roja (DB Admin)
-- Description:
--   Implements optimized PostgreSQL functions and view for resolving
--   the effective unit price of a product as of any specified transaction date:
--     1. get_price_as_of_date(p_prodcode, p_as_of_date): Returns single unitprice.
--     2. get_product_prices_as_of_date(p_as_of_date): Returns catalog with prices.
--     3. product_current_price view: Real-time current effective catalog prices.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Function: get_price_as_of_date
-- Resolves the effective unit price of a specific product as of a transaction date.
-- Business Logic:
--   - Filter: prodcode = p_prodcode
--   - Filter: effdate <= p_as_of_date (price took effect on or before target date)
--   - Filter: is_deleted = false (exclude superseded / soft-deleted records)
--   - Order: effdate DESC LIMIT 1 (latest effective rate takes precedence)
-- -----------------------------------------------------------------------------
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

COMMENT ON FUNCTION public.get_price_as_of_date(character varying, date) IS 
'Resolves effective unit price for a given product code as of the target date.';


-- -----------------------------------------------------------------------------
-- 2. Function: get_product_prices_as_of_date
-- Returns every active product with its effective unit price as of a given date.
-- Uses DISTINCT ON (p.prodcode) with ORDER BY effdate DESC for peak efficiency.
-- -----------------------------------------------------------------------------
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

COMMENT ON FUNCTION public.get_product_prices_as_of_date(date) IS 
'Returns complete active product catalog with resolved effective prices as of target date.';


-- -----------------------------------------------------------------------------
-- 3. View: product_current_price
-- Real-time view joining active products to their latest active price as of today.
-- -----------------------------------------------------------------------------
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

COMMENT ON VIEW public.product_current_price IS 
'Active products joined with current effective pricing as of CURRENT_DATE.';
