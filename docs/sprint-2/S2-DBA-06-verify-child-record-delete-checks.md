# [S2-DBA-06] Verify Child-Record Delete Checks for Customer and Product

## Sprint Task Reference
- **Task ID:** S2-DBA-06
- **Sprint:** Sprint 2 (Weeks 3-4)
- **Role:** DB Admin
- **Author:** Joe Andre Roja
- **Closes Issue:** Closes #210

---

## 1. Executive Summary

In HOPE ERP, data integrity requires strict protection against orphan records and data inconsistency:
- **Customer Entity:** A customer cannot be deleted or marked inactive (`is_deleted = true`) if they have pending or active sales transactions (`public.sales.is_deleted = false`).
- **Product Entity:** A product cannot be deleted or marked inactive (`is_deleted = true`) if it is referenced in active sales line items (`public.salesdetail.is_deleted = false`).

While standard foreign key constraints protect physical row removals (`DELETE FROM ...`), soft deletions are processed via `UPDATE ... SET is_deleted = true`. Without dedicated database-level guards, soft deletions bypass standard foreign key checks.

This deliverable establishes a multi-layer defense:
1. **Verification RPC Functions:** `check_customer_can_delete(p_custno)` and `check_product_can_delete(p_prodcode)` allowing APIs and UI modals to inspect dependency counts before confirming deletion.
2. **BEFORE UPDATE Database Triggers:** `trg_prevent_customer_soft_delete` and `trg_prevent_product_soft_delete` enforcing referential integrity at the engine level and raising exception `23503` if child dependencies exist.

---

## 2. Integrity Verification Specifications

### 2.1 Customer Child Dependency Check

- **Target Table:** `public.sales`
- **Check Condition:** `custno = target_custno AND is_deleted = false`
- **Behavior:**
  - If active transactions exist ($count > 0$): Deletion is blocked; HTTP 409 Conflict / Error returned; UI shows `BlockedDeleteModal`.
  - If no active transactions exist ($count = 0$): Soft deletion succeeds; audit record logged.

### 2.2 Product Child Dependency Check

- **Target Table:** `public.salesdetail`
- **Check Condition:** `prodcode = target_prodcode AND is_deleted = false`
- **Behavior:**
  - If active line items exist ($count > 0$): Deletion is blocked; UI prompts constraint warning.
  - If no active line items exist ($count = 0$): Soft deletion succeeds.

---

## 3. SQL Architecture & Functions

```sql
-- Customer Check Function
CREATE OR REPLACE FUNCTION public.check_customer_can_delete(p_custno character varying)
RETURNS TABLE (can_delete boolean, child_count bigint, message text)
LANGUAGE plpgsql STABLE AS $$
DECLARE cnt bigint;
BEGIN
    SELECT COUNT(*) INTO cnt FROM public.sales
    WHERE custno = p_custno AND is_deleted = false;

    IF cnt > 0 THEN
        RETURN QUERY SELECT false, cnt, 
            format('Cannot delete customer %s: %s active sales transaction(s) reference this record.', p_custno, cnt);
    ELSE
        RETURN QUERY SELECT true, 0::bigint, 
            format('Customer %s has no active child records and can be safely deleted.', p_custno);
    END IF;
END;
$$;

-- Product Check Function
CREATE OR REPLACE FUNCTION public.check_product_can_delete(p_prodcode character varying)
RETURNS TABLE (can_delete boolean, child_count bigint, message text)
LANGUAGE plpgsql STABLE AS $$
DECLARE cnt bigint;
BEGIN
    SELECT COUNT(*) INTO cnt FROM public.salesdetail
    WHERE prodcode = p_prodcode AND is_deleted = false;

    IF cnt > 0 THEN
        RETURN QUERY SELECT false, cnt, 
            format('Cannot delete product %s: %s active sales line item(s) reference this record.', p_prodcode, cnt);
    ELSE
        RETURN QUERY SELECT true, 0::bigint, 
            format('Product %s has no active child records and can be safely deleted.', p_prodcode);
    END IF;
END;
$$;

-- Triggers Enforcing Soft-Delete Restrictions
CREATE OR REPLACE FUNCTION public.fn_prevent_customer_soft_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cnt bigint;
BEGIN
    IF NEW.is_deleted = true AND (OLD.is_deleted = false OR OLD.is_deleted IS NULL) THEN
        SELECT COUNT(*) INTO cnt FROM public.sales WHERE custno = NEW.custno AND is_deleted = false;
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
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_customer_soft_delete();

CREATE OR REPLACE FUNCTION public.fn_prevent_product_soft_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cnt bigint;
BEGIN
    IF NEW.is_deleted = true AND (OLD.is_deleted = false OR OLD.is_deleted IS NULL) THEN
        SELECT COUNT(*) INTO cnt FROM public.salesdetail WHERE prodcode = NEW.prodcode AND is_deleted = false;
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
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_product_soft_delete();
```

---

## 4. Verification Evidence

### 4.1 Live Database Test Results (`Supabase PostgreSQL`)

1. **Product `AD0001` Test:**
   - Query: `SELECT * FROM public.check_product_can_delete('AD0001');`
   - Result:
     - `can_delete`: `false`
     - `child_count`: `2`
     - `message`: `"Cannot delete product AD0001: 2 active sales line item(s) reference this record."`
   - Outcome: **PASS**

2. **Trigger Exception Verification:**
   - Updating `AD0001` to `is_deleted = true` raises:
     `ERROR 23503: Cannot soft-delete product AD0001: 2 active sales line item(s) reference this product.`
   - Outcome: **PASS**

---

## 5. Deliverables

- **SQL Migration:** [`docs/sprint-2/sql/V2_4__child_record_delete_checks.sql`](file:///c:/Users/BBJAMS%20GADGETS/Desktop/Games/baikolano-website/docs/sprint-2/sql/V2_4__child_record_delete_checks.sql)
- **Technical Documentation:** [`docs/sprint-2/S2-DBA-06-verify-child-record-delete-checks.md`](file:///c:/Users/BBJAMS%20GADGETS/Desktop/Games/baikolano-website/docs/sprint-2/S2-DBA-06-verify-child-record-delete-checks.md)
- **Live Database Status:** Triggers and functions active on Supabase PostgreSQL project `hwebcmeyxqxjwysfmphh`.
