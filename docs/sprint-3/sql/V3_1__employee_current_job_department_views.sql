-- ==============================================================================
-- Migration: V3_1__employee_current_job_department_views.sql
-- Task ID: S3-DBA-01 (Views/queries: employee current job and department)
-- Description: Creates optimized views and functions to query employee current
--              job and department assignments as of today or any historical date,
--              backed by composite performance indexes.
-- ==============================================================================

-- 1. Composite indexes on jobhistory for timeline lookup performance
CREATE INDEX IF NOT EXISTS idx_jobhistory_empno_effdate_desc
  ON public.jobhistory (empno, effdate DESC)
  WHERE (is_deleted = false);

CREATE INDEX IF NOT EXISTS idx_jobhistory_deptcode
  ON public.jobhistory (deptcode)
  WHERE (is_deleted = false);

CREATE INDEX IF NOT EXISTS idx_jobhistory_jobcode
  ON public.jobhistory (jobcode)
  WHERE (is_deleted = false);

-- 2. View: employee_current_job_department
-- Returns each employee with their latest job & department as of CURRENT_DATE.
CREATE OR REPLACE VIEW public.employee_current_job_department AS
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
LEFT JOIN public.job j 
  ON j.jobcode = jh.jobcode
LEFT JOIN public.department d 
  ON d.deptcode = jh.deptcode
ORDER BY e.empno, jh.effdate DESC;

-- 3. View: employee_job_history_detail
-- Complete joined job history with employee names, job titles, and department names.
CREATE OR REPLACE VIEW public.employee_job_history_detail AS
SELECT
  jh.empno,
  e.lastname,
  e.firstname,
  jh.effdate,
  jh.jobcode,
  j.jobdesc,
  jh.deptcode,
  d.deptname,
  jh.salary,
  jh.is_deleted,
  jh.stamp,
  CASE WHEN jh.is_deleted THEN 'Inactive' ELSE 'Active' END AS status
FROM public.jobhistory jh
JOIN public.employee e ON e.empno = jh.empno
LEFT JOIN public.job j ON j.jobcode = jh.jobcode
LEFT JOIN public.department d ON d.deptcode = jh.deptcode
ORDER BY jh.empno, jh.effdate DESC;

-- 4. Stored function: get_employee_job_dept_as_of
-- Dynamic time-travel lookup of employee job & department as of a specified date.
CREATE OR REPLACE FUNCTION public.get_employee_job_dept_as_of(
  p_empno VARCHAR,
  p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  empno VARCHAR,
  lastname VARCHAR,
  firstname VARCHAR,
  jobcode VARCHAR,
  jobdesc VARCHAR,
  deptcode VARCHAR,
  deptname VARCHAR,
  salary NUMERIC,
  effdate DATE,
  employment_status TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT ON (e.empno)
    e.empno,
    e.lastname,
    e.firstname,
    jh.jobcode,
    j.jobdesc,
    jh.deptcode,
    d.deptname,
    jh.salary,
    jh.effdate,
    CASE 
      WHEN e.is_deleted = true OR (e.sepdate IS NOT NULL AND e.sepdate <= p_as_of_date) THEN 'Inactive'
      ELSE 'Active'
    END AS employment_status
  FROM public.employee e
  LEFT JOIN public.jobhistory jh 
    ON jh.empno = e.empno 
   AND jh.effdate <= p_as_of_date 
   AND jh.is_deleted = false
  LEFT JOIN public.job j 
    ON j.jobcode = jh.jobcode
  LEFT JOIN public.department d 
    ON d.deptcode = jh.deptcode
  WHERE e.empno = p_empno
  ORDER BY e.empno, jh.effdate DESC;
$$;
