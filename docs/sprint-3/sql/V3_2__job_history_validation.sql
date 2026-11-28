-- ==============================================================================
-- Migration: V3_2__job_history_validation.sql
-- Task ID: S3-DBA-02 (Job history validation (no duplicate effective dates))
-- Description: Enforces effective date uniqueness per employee on the
--              jobhistory table using partial unique indexes and BEFORE
--              triggers, along with non-negative salary constraints.
-- ==============================================================================

-- 1. Partial Unique Index on Active Job History Records
-- Guarantees at the storage engine level that an employee cannot have two
-- active rows with the exact same effective date.
CREATE UNIQUE INDEX IF NOT EXISTS uq_jobhistory_empno_effdate_active
  ON public.jobhistory (empno, effdate)
  WHERE (is_deleted = false);

-- 2. Trigger Function for Pre-Save Business Rule Validation
CREATE OR REPLACE FUNCTION public.trg_validate_jobhistory_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check duplicate effective date among active records
  IF NEW.is_deleted = false THEN
    IF EXISTS (
      SELECT 1 FROM public.jobhistory
      WHERE empno = NEW.empno
        AND effdate = NEW.effdate
        AND is_deleted = false
        AND (TG_OP = 'INSERT' OR (empno, jobcode, effdate) IS DISTINCT FROM (OLD.empno, OLD.jobcode, OLD.effdate))
    ) THEN
      RAISE EXCEPTION 'A history row already exists on this effective date.';
    END IF;
  END IF;

  -- Validate salary non-negative
  IF NEW.salary IS NOT NULL AND NEW.salary < 0 THEN
    RAISE EXCEPTION 'Salary must be greater than or equal to zero.';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Attach Trigger to jobhistory table
CREATE OR REPLACE TRIGGER trg_jobhistory_validation
  BEFORE INSERT OR UPDATE ON public.jobhistory
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_validate_jobhistory_entry();

-- 4. Stored validation function for pre-flight checking
CREATE OR REPLACE FUNCTION public.check_jobhistory_effective_date_available(
  p_empno VARCHAR,
  p_effdate DATE,
  p_current_effdate DATE DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- If editing an existing record and keeping the same effective date, it is valid
  IF p_current_effdate IS NOT NULL AND p_effdate = p_current_effdate THEN
    RETURN TRUE;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1 
    FROM public.jobhistory
    WHERE empno = p_empno
      AND effdate = p_effdate
      AND is_deleted = false
  );
END;
$$;
