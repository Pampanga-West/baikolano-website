-- =============================================================================
-- Migration: V2_5__demo_data_customer_product_pricehist.sql
-- Sprint 2 Task: [S2-DBA-07] Demo data for customer, product, price history
-- Author: Joe Andre Roja (DB Admin)
-- Description:
--   Seeds realistic demo records across customer, product, and pricehist tables:
--     1. Customer records covering diverse payment terms (Net 15, Net 30, Net 45,
--        Net 60, Prepaid, COD, 30D, 60D) plus soft-deleted samples.
--     2. Product catalog items representing varied merchandise across approved
--        units of measure (meter, pcs, box, liter, pack, pair, kg, can).
--     3. Price history timeline records demonstrating pricing evolution
--        over multi-year intervals and temporal price lookup resolution.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Demo Customers
-- -----------------------------------------------------------------------------
INSERT INTO public.customer (custno, custname, address, payterm, is_deleted, stamp)
VALUES 
    ('C0081', 'Acme Supplies Inc', '100 Industrial Pkwy, Austin, TX', 'Net 30', false, 'SEED DEMO 2026-11-27'),
    ('C0082', 'TechTrend Solutions', '452 Innovation Blvd, San Jose, CA', 'Net 15', false, 'SEED DEMO 2026-11-27'),
    ('C0083', 'Nexus Logistics', '88 Logistics Way, Chicago, IL', 'Net 60', false, 'SEED DEMO 2026-11-27'),
    ('C0084', 'Summit Retail', '12 Retail Row, New York, NY', 'Prepaid', false, 'SEED DEMO 2026-11-27'),
    ('C0085', 'Apex Hardware', '770 Hardware St, Dallas, TX', 'COD', false, 'SEED DEMO 2026-11-27'),
    ('C0086', 'Vantage Health', '310 Medical Center Dr, Boston, MA', 'Net 45', false, 'SEED DEMO 2026-11-27'),
    ('C0087', 'Pacific Media', '500 Ocean Ave, Santa Monica, CA', '60D', false, 'SEED DEMO 2026-11-27'),
    ('C0088', 'Legacy Retailers', '90 Old Town Rd, Atlanta, GA', '30D', true, 'SOFT_DELETED DEMO 2026-11-27'),
    ('C0089', 'Archived Corp', '15 Vintage Ave, Denver, CO', 'Net 30', true, 'SOFT_DELETED DEMO 2026-11-27')
ON CONFLICT (custno) DO UPDATE SET
    custname = EXCLUDED.custname,
    address = EXCLUDED.address,
    payterm = EXCLUDED.payterm,
    is_deleted = EXCLUDED.is_deleted,
    stamp = EXCLUDED.stamp;


-- -----------------------------------------------------------------------------
-- 2. Demo Products
-- -----------------------------------------------------------------------------
INSERT INTO public.product (prodcode, description, unit, is_deleted, stamp)
VALUES 
    ('P0001', 'Industrial Ethernet 2m', 'meter', false, 'SEED DEMO 2026-11-27'),
    ('P0002', 'Ergonomic Desk Chair', 'pcs', false, 'SEED DEMO 2026-11-27'),
    ('P0003', 'Optical Laser Sensor', 'box', false, 'SEED DEMO 2026-11-27'),
    ('P0004', 'Silicon Lubricant 500ml', 'liter', false, 'SEED DEMO 2026-11-27'),
    ('P0005', 'Shipping Box Pack', 'pack', false, 'SEED DEMO 2026-11-27'),
    ('P0006', 'Anti-Static Gloves', 'pair', false, 'SEED DEMO 2026-11-27'),
    ('P0007', 'Aluminum Rail 2m', 'meter', false, 'SEED DEMO 2026-11-27'),
    ('P0008', 'Structural Resin 1kg', 'kg', false, 'SEED DEMO 2026-11-27'),
    ('P0009', 'Electronic Air Duster', 'can', false, 'SEED DEMO 2026-11-27'),
    ('P0010', 'Legacy Motherboard', 'pcs', true, 'SOFT_DELETED DEMO 2026-11-27')
ON CONFLICT (prodcode) DO UPDATE SET
    description = EXCLUDED.description,
    unit = EXCLUDED.unit,
    is_deleted = EXCLUDED.is_deleted,
    stamp = EXCLUDED.stamp;


-- -----------------------------------------------------------------------------
-- 3. Demo Price History
-- -----------------------------------------------------------------------------
INSERT INTO public.pricehist (effdate, prodcode, unitprice, is_deleted, stamp)
VALUES 
    ('2024-01-01', 'P0001', 1.85, false, 'SEED DEMO 2026-11-27'),
    ('2025-01-01', 'P0001', 2.10, false, 'SEED DEMO 2026-11-27'),
    ('2026-06-01', 'P0001', 2.45, false, 'SEED DEMO 2026-11-27'),
    ('2024-06-01', 'P0002', 189.00, false, 'SEED DEMO 2026-11-27'),
    ('2025-06-01', 'P0002', 219.00, false, 'SEED DEMO 2026-11-27'),
    ('2026-01-15', 'P0002', 249.99, false, 'SEED DEMO 2026-11-27'),
    ('2025-01-01', 'P0003', 45.00, false, 'SEED DEMO 2026-11-27'),
    ('2026-03-01', 'P0003', 52.50, false, 'SEED DEMO 2026-11-27'),
    ('2025-03-01', 'P0004', 18.75, false, 'SEED DEMO 2026-11-27'),
    ('2026-02-01', 'P0004', 21.00, false, 'SEED DEMO 2026-11-27'),
    ('2025-01-01', 'P0005', 12.50, false, 'SEED DEMO 2026-11-27'),
    ('2026-01-01', 'P0005', 14.25, false, 'SEED DEMO 2026-11-27')
ON CONFLICT (effdate, prodcode) DO UPDATE SET
    unitprice = EXCLUDED.unitprice,
    is_deleted = EXCLUDED.is_deleted,
    stamp = EXCLUDED.stamp;
