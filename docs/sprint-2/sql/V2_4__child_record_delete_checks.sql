-- =============================================================================
-- Migration: V2_4__child_record_delete_checks.sql
-- Sprint 2 Task: [S2-DBA-06] Verify child-record delete checks for customer and product
-- Author: Joe Andre Roja (DB Admin)
-- Description:
--   Establishes comprehensive referential integrity checks preventing the deletion
--   or soft-deletion of parent customer and product entities when active child
--   records depend on them:
--     1. check_customer_can_delete: Evaluates pending/active sales orders.
--     2. check_product_can_delete: Evaluates active order line items in salesdetail.
--     3. BEFORE UPDATE triggers on customer.is_deleted and product.is_deleted
--        raising SQL exception 23503 if child records exist.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Function: check_customer_can_delete
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_customer_can_delete(p_custno character varying)
RETURNS TABLE (
    can_delete boolean,
    child_count bigint,
    message text
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    cnt bigint;
BEGIN
    SELECT COUNT(*) INTO cnt
    FROM public.sales
    WHERE custno = p_custno AND is_deleted = false;

    IF cnt > 0 THEN
        RETURN QUERY SELECT 
            false, 
            cnt, 
            format('Cannot delete customer %s: %s active sales transaction(s) reference this record.', p_custno, cnt);
    ELSE
        RETURN QUERY SELECT 
            true, 
            0::bigint, 
            format('Customer %s has no active child records and can be safely deleted.', p_custno);
    END IF;
END;
$$;

COMMENT ON FUNCTION public.check_customer_can_delete(character varying) IS 
'Evaluates whether a customer can be safely deleted or soft-deleted based on active sales orders.';


-- -----------------------------------------------------------------------------
-- 2. Function: check_product_can_delete
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_product_can_delete(p_prodcode character varying)
RETURNS TABLE (
    can_delete boolean,
    child_count bigint,
    message text
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    cnt bigint;
BEGIN
    SELECT COUNT(*) INTO cnt
    FROM public.salesdetail
    WHERE prodcode = p_prodcode AND is_deleted = false;

    IF cnt > 0 THEN
        RETURN QUERY SELECT 
            false, 
            cnt, 
            format('Cannot delete product %s: %s active sales line item(s) reference this record.', p_prodcode, cnt);
    ELSE
        RETURN QUERY SELECT 
            true, 
            0::bigint, 
            format('Product %s has no active child records and can be safely deleted.', p_prodcode);
    END IF;
END;
$$;

COMMENT ON FUNCTION public.check_product_can_delete(character varying) IS 
'Evaluates whether a product can be safely deleted or soft-deleted based on active order line items.';


-- -----------------------------------------------------------------------------
-- 3. Trigger & Function: Prevent Customer Soft-Delete
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_prevent_customer_soft_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    cnt bigint;
BEGIN
    IF NEW.is_deleted = true AND (OLD.is_deleted = false OR OLD.is_deleted IS NULL) THEN
        SELECT COUNT(*) INTO cnt
        FROM public.sales
        WHERE custno = NEW.custno AND is_deleted = false;

        IF cnt > 0 THEN
            RAISE EXCEPTION 'Cannot soft-delete customer %: % active sales transaction(s) reference this customer.', NEW.custno, cnt
                USING ERRCODE = '23503';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_prevent_customer_soft_delete
BEFORE UPDATE OF is_deleted ON public.customer
FOR EACH ROW
EXECUTE FUNCTION public.fn_prevent_customer_soft_delete();


-- -----------------------------------------------------------------------------
-- 4. Trigger & Function: Prevent Product Soft-Delete
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_prevent_product_soft_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    cnt bigint;
BEGIN
    IF NEW.is_deleted = true AND (OLD.is_deleted = false OR OLD.is_deleted IS NULL) THEN
        SELECT COUNT(*) INTO cnt
        FROM public.salesdetail
        WHERE prodcode = NEW.prodcode AND is_deleted = false;

        IF cnt > 0 THEN
            RAISE EXCEPTION 'Cannot soft-delete product %: % active sales line item(s) reference this product.', NEW.prodcode, cnt
                USING ERRCODE = '23503';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_prevent_product_soft_delete
BEFORE UPDATE OF is_deleted ON public.product
FOR EACH ROW
EXECUTE FUNCTION public.fn_prevent_product_soft_delete();
