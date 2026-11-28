# S3-DBA-01: Views and Queries for Employee Current Job and Department

## Task Overview
- **Task ID:** `S3-DBA-01`
- **Role:** DB Admin (`JoeAndreRoja`)
- **Sprint:** Sprint 3
- **Related Issue:** Closes #232
- **Date:** 2026-11-28

---

## 1. Problem Statement
The Human Resources module requires immediate access to each employee's current job title, department assignment, salary, and active employment status. Because promotions, salary revisions, and departmental transfers are stored chronologically in the `jobhistory` table with effective dates (`effdate`), determining an employee's "current" role requires:
1. Identifying the latest effective date where `effdate <= CURRENT_DATE` and `is_deleted = false`.
2. Joining `employee`, `job`, and `department` tables to obtain human-readable job descriptions and department names.
3. Accounting for employee separation dates (`sepdate`) and soft-delete flags to determine whether an employee is actively working.

Doing this in client-side loops or ad-hoc raw SQL across reports and pages introduces redundancy, latency, and potential calculation drift.

---

## 2. Solution Architecture

### A. Performance Indexing
We created composite indexes on `jobhistory` to support fast indexed order lookups for time-series queries:
```sql
CREATE INDEX IF NOT EXISTS idx_jobhistory_empno_effdate_desc
  ON public.jobhistory (empno, effdate DESC)
  WHERE (is_deleted = false);

CREATE INDEX IF NOT EXISTS idx_jobhistory_deptcode
  ON public.jobhistory (deptcode)
  WHERE (is_deleted = false);

CREATE INDEX IF NOT EXISTS idx_jobhistory_jobcode
  ON public.jobhistory (jobcode)
  WHERE (is_deleted = false);
```

### B. View: `employee_current_job_department`
Provides a consolidated snapshot of every employee with their current active role as of today:
- Uses `DISTINCT ON (e.empno)` ordered by `jh.effdate DESC` to instantly pick the latest effective assignment.
- Left-joins `job` and `department` to project `jobdesc` and `deptname`.
- Computes `employment_status` ('Active' vs 'Inactive') taking into account `sepdate` and `is_deleted`.

```sql
SELECT DISTINCT ON (e.empno)
  e.empno,
  e.lastname,
  e.firstname,
  e.gender,
  e.birthdate,
  e.hiredate,
  e.sepdate,
  e.is_deleted AS employee_is_deleted,
  jh.jobcode,
  j.jobdesc,
  jh.deptcode,
  d.deptname,
  jh.salary,
  jh.effdate AS job_effdate,
  CASE 
    WHEN e.is_deleted = true OR (e.sepdate IS NOT NULL AND e.sepdate <= CURRENT_DATE) THEN 'Inactive'
    ELSE 'Active'
  END AS employment_status
FROM public.employee e
LEFT JOIN public.jobhistory jh 
  ON jh.empno = e.empno 
 AND jh.effdate <= CURRENT_DATE 
 AND jh.is_deleted = false
LEFT JOIN public.job j ON j.jobcode = jh.jobcode
LEFT JOIN public.department d ON d.deptcode = jh.deptcode
ORDER BY e.empno, jh.effdate DESC;
```

### C. View: `employee_job_history_detail`
Provides the full historical timeline of all job history events, fully joined with employee names, job titles, and department names for reports and the Job Timeline component.

### D. Stored Function: `get_employee_job_dept_as_of`
Allows point-in-time "time-travel" evaluation of what job and department an employee held on any given historical date:
```sql
SELECT * FROM public.get_employee_job_dept_as_of('00001', '2010-06-01');
-- Returns: PR1 (Programmer 1) in IT department

SELECT * FROM public.get_employee_job_dept_as_of('00001', '2010-12-01');
-- Returns: PR2 (Programmer 2) in IT department
```

---

## 3. Database Verification & Test Execution
Verified on Supabase database `hwebcmeyxqxjwysfmphh`:
1. `SELECT * FROM public.employee_current_job_department LIMIT 5;` returns expected current assignments.
2. `SELECT * FROM public.get_employee_job_dept_as_of('00001', '2010-06-01');` correctly returns pre-promotion role `PR1` ($48,000.00).
3. `SELECT * FROM public.get_employee_job_dept_as_of('00001', '2026-11-28');` correctly returns current role `PR2` ($50,000.00).
