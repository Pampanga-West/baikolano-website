# S3-DBA-02: Job History Validation (No Duplicate Effective Dates)

## Task Overview
- **Task ID:** `S3-DBA-02`
- **Role:** DB Admin (`JoeAndreRoja`)
- **Sprint:** Sprint 3
- **Related Issue:** Closes #234
- **Date:** 2026-11-28

---

## 1. Problem Statement
In Human Resources systems, each employee's job progression (promotions, lateral transfers, department changes, and salary adjustments) is recorded in `jobhistory` keyed by employee number (`empno`) and effective date (`effdate`). 

Allowing duplicate effective dates for the same employee introduces critical ambiguities:
- Two conflicting salaries or job titles active simultaneously on the same start date.
- Indeterminate ordering in chronological views and queries (`employee_current_job_department`).
- Non-conformance with Sprint 3 acceptance criteria (`TC-JH-02` in `S3-TST-03-job-history-tests.md` requiring: *"A history row already exists on this effective date."*).

---

## 2. Implemented Constraints & Triggers

### A. Partial Unique Index (`uq_jobhistory_empno_effdate_active`)
Ensures database storage engine integrity across concurrent transactions:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_jobhistory_empno_effdate_active
  ON public.jobhistory (empno, effdate)
  WHERE (is_deleted = false);
```
- Restricts uniqueness to active rows (`is_deleted = false`), allowing historically soft-deleted records to be retained for audit trails without causing index collisions.

### B. Validation Trigger (`trg_jobhistory_validation`)
Runs `BEFORE INSERT OR UPDATE` on `public.jobhistory`:
1. **Duplicate Check:** Rejects any insert or update that collides with an active existing row on the same effective date with the exact required error string:
   ```text
   A history row already exists on this effective date.
   ```
2. **Salary Verification:** Guarantees that `salary >= 0` (or `salary` is not negative), enforcing numeric business constraints.

### C. Client Pre-Flight Validation Helper (`check_jobhistory_effective_date_available`)
Enables API callers and the frontend to perform optimistic validation before dispatching payloads:
```sql
SELECT public.check_jobhistory_effective_date_available(
  p_empno => '00001', 
  p_effdate => '2010-05-11', 
  p_current_effdate => '2010-05-11'
);
-- Returns TRUE (safely editing existing row)

SELECT public.check_jobhistory_effective_date_available(
  p_empno => '00001', 
  p_effdate => '2010-05-11'
);
-- Returns FALSE (collision with active existing row)
```

---

## 3. Database Verification & Test Results
Verified on Supabase database `hwebcmeyxqxjwysfmphh`:
1. `check_jobhistory_effective_date_available('00001', '2010-05-11')` correctly returned `false`.
2. `check_jobhistory_effective_date_available('00001', '2010-05-11', '2010-05-11')` correctly returned `true` (self-edit preserve check).
3. `check_jobhistory_effective_date_available('00001', '2025-01-01')` correctly returned `true`.
4. Trigger intercepted duplicate insertion attempt and raised exception: `A history row already exists on this effective date.`
5. Trigger intercepted negative salary insertion and raised exception: `Salary must be greater than or equal to zero.`
