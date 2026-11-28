-- =============================================================================
-- Migration: V2_3__validation_constraints_payterms_unit.sql
-- Sprint 2 Task: [S2-DBA-05] Validation constraints (payTerms, unit)
-- Author: Joe Andre Roja (DB Admin)
-- Description:
--   Upgrades and standardizes database validation constraints across customer
--   and product master tables:
--     1. Widens customer.payterm and product.unit columns from legacy VARCHAR(3)
--        to VARCHAR(20) to support enterprise terminology.
--     2. Enforces customer_payterm_check validating allowed payment terms:
--        ('COD', '30D', '45D', '60D', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Prepaid').
--     3. Enforces product_unit_check validating allowed units of measure:
--        ('pc', 'pcs', 'ea', 'box', 'kg', 'liter', 'ltr', 'can', 'pair',
--         'meter', 'mtr', 'pack', 'pkg', 'set', 'roll').
--     4. Enforces positive pricing constraint on pricehist.unitprice.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Column Width Alteration
-- -----------------------------------------------------------------------------

-- Widen customer.payterm to accommodate multi-character descriptors (e.g. "Net 30", "Prepaid")
ALTER TABLE public.customer 
    ALTER COLUMN payterm TYPE character varying(20);

-- Widen product.unit to accommodate standard unit names (e.g. "liter", "meter", "pair")
ALTER TABLE public.product 
    ALTER COLUMN unit TYPE character varying(20);


-- -----------------------------------------------------------------------------
-- 2. Customer Table Validation Constraints
-- -----------------------------------------------------------------------------

-- Drop legacy constraint
ALTER TABLE public.customer 
    DROP CONSTRAINT IF EXISTS pay_ck;

ALTER TABLE public.customer 
    DROP CONSTRAINT IF EXISTS customer_payterm_check;

-- Enforce standard payment terms
ALTER TABLE public.customer
    ADD CONSTRAINT customer_payterm_check 
    CHECK (
        trim(payterm) = ANY (ARRAY[
            'COD', 
            '30D', 
            '45D', 
            '60D', 
            'Net 15', 
            'Net 30', 
            'Net 45', 
            'Net 60', 
            'Prepaid'
        ])
    );

COMMENT ON CONSTRAINT customer_payterm_check ON public.customer IS 
'Enforces approved payment terms: COD, 30D, 45D, 60D, Net 15, Net 30, Net 45, Net 60, Prepaid.';


-- -----------------------------------------------------------------------------
-- 3. Product Table Validation Constraints
-- -----------------------------------------------------------------------------

-- Drop legacy constraint
ALTER TABLE public.product 
    DROP CONSTRAINT IF EXISTS unit_ck;

ALTER TABLE public.product 
    DROP CONSTRAINT IF EXISTS product_unit_check;

-- Enforce standard units of measure (case-insensitive via lower(trim(unit)))
ALTER TABLE public.product
    ADD CONSTRAINT product_unit_check 
    CHECK (
        lower(trim(unit)) = ANY (ARRAY[
            'pc', 
            'pcs', 
            'ea', 
            'box', 
            'kg', 
            'liter', 
            'ltr', 
            'can', 
            'pair', 
            'meter', 
            'mtr', 
            'pack', 
            'pkg', 
            'set', 
            'roll'
        ])
    );

COMMENT ON CONSTRAINT product_unit_check ON public.product IS 
'Enforces approved units of measure: pc, pcs, ea, box, kg, liter, ltr, can, pair, meter, mtr, pack, pkg, set, roll.';


-- -----------------------------------------------------------------------------
-- 4. Price History Validation Constraints
-- -----------------------------------------------------------------------------

ALTER TABLE public.pricehist 
    DROP CONSTRAINT IF EXISTS pricehist_unitprice_check;

-- Enforce non-negative unit price rate
ALTER TABLE public.pricehist
    ADD CONSTRAINT pricehist_unitprice_check 
    CHECK (unitprice >= 0);

COMMENT ON CONSTRAINT pricehist_unitprice_check ON public.pricehist IS 
'Enforces that historical price rates must be non-negative.';
