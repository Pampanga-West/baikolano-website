import { useEffect, useMemo, useState } from "react"
import {
  checkDepartmentHasActiveReferences,
  checkJobHasActiveReferences,
  fetchTableRowsFromSupabase,
  fetchUserRightsFromSupabase,
  formatMoney,
  parseStamp,
} from "../backend/supabaseClient"
import { departmentApi, employeeApi, jobApi, rightsApi } from "../lib/api"
import { useAuth } from "../contexts/AuthContext"
import DepartmentModal from "../components/DepartmentModal"
import JobModal from "../components/JobModal"
import EmployeeModal from "../components/EmployeeModal"
import Badge from "../components/Badge"
import BlockedDeleteModal from "../components/BlockedDeleteModal"
import Button from "../components/Button"
import ConfirmDeleteModal from "../components/ConfirmDeleteModal"
import EmptyState from "../components/EmptyState"
import EntityControls from "../components/EntityControls"
import Icon from "../components/Icon"
import ModalShell from "../components/ModalShell"
import Stamp from "../components/Stamp"
import type { Department, Employee, Job, Role } from "../lib/types"

type HrTab = "employees" | "jobs" | "departments"

const fallbackEmployees = [
  [
    "E-001",
    "Santos",
    "Maria",
    "F",
    "1990-05-12",
    "2020-03-01",
    "—",
    "Active",
    "CREATED",
    "system",
    "2026-01-15 10:00 AM",
    "Engineering",
    "Software Engineer",
  ],
  [
    "E-002",
    "Reyes",
    "Juan",
    "M",
    "1988-11-03",
    "2019-07-15",
    "—",
    "Active",
    "EDITED",
    "user1",
    "2026-10-13 1:01 PM",
    "Sales",
    "Sales Manager",
  ],
  [
    "E-003",
    "Cruz",
    "Ana",
    "F",
    "1995-02-20",
    "2021-01-10",
    "—",
    "Active",
    "CREATED",
    "system",
    "2026-02-01 9:00 AM",
    "Human Resources",
    "HR Specialist",
  ],
  [
    "E-004",
    "Garcia",
    "Pedro",
    "M",
    "1985-08-30",
    "2018-05-01",
    "2025-12-31",
    "Inactive",
    "DELETED",
    "user2",
    "2026-10-13 1:01 PM",
    "Finance",
    "Accountant",
  ],
]

const fallbackLookups: Record<"jobs" | "departments", string[][]> = {
  jobs: [
    ["J-001", "Software Engineer", "Active", "CREATED", "system", "2026-10-13 1:01 PM"],
    ["J-002", "Sales Manager", "Active", "CREATED", "system", "2026-10-13 1:01 PM"],
    ["J-003", "HR Specialist", "Active", "CREATED", "system", "2026-10-13 1:01 PM"],
    ["J-004", "Accountant", "Inactive", "DELETED", "user2", "2026-10-13 1:01 PM"],
  ],
  departments: [
    ["D-001", "Engineering", "Active", "CREATED", "system", "2026-10-13 1:01 PM"],
    ["D-002", "Sales", "Active", "CREATED", "system", "2026-10-13 1:01 PM"],
    ["D-003", "Human Resources", "Active", "CREATED", "system", "2026-10-13 1:01 PM"],
    ["D-004", "Finance", "Inactive", "DELETED", "user2", "2026-10-13 1:01 PM"],
  ],
}

type JobHistoryEntry = {
  empno: string
  effdate: string
  job: string
  department: string
  salary: string
  status: string
  action: string
  user: string
  date: string
}

const fallbackJobHistory: JobHistoryEntry[] = [
  {
    empno: "E-001",
    effdate: "2023-01-01",
    job: "J-001 — Software Engineer",
    department: "D-001 — Engineering",
    salary: "$52,000.00",
    status: "Active",
    action: "EDITED",
    user: "user1",
    date: "2026-10-13 1:01 PM",
  },
  {
    empno: "E-001",
    effdate: "2020-03-01",
    job: "J-001 — Software Engineer",
    department: "D-001 — Engineering",
    salary: "$45,000.00",
    status: "Active",
    action: "CREATED",
    user: "system",
    date: "2026-01-15 10:00 AM",
  },
]



function HistoryForm({
  editing,
  close,
}: {
  editing?: boolean
  close: () => void
}) {
  return (
    <ModalShell
      title={editing ? "Edit Job History" : "Add Job History"}
      subtitle="Effective dates must be unique for this employee."
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button onClick={close}>
            {editing ? "Save History" : "Add History"}
          </Button>
        </>
      }
    >
      <div className="record-form">
        <label>
          <span>Effective Date</span>
          <input
            className={!editing ? "input-error" : ""}
            type="date"
            defaultValue={editing ? "2023-01-01" : "2020-03-01"}
          />
          {!editing && (
            <small className="validation-error">
              A history row already exists on this effective date.
            </small>
          )}
        </label>
        <label>
          <span>Salary</span>
          <div className="money-input">
            <span>$</span>
            <input defaultValue={editing ? "52000" : "45000"} />
          </div>
        </label>
        <label>
          <span>Job</span>
          <select>
            <option>J-001 — Software Engineer</option>
            <option>J-002 — Sales Manager</option>
          </select>
        </label>
        <label>
          <span>Department</span>
          <select>
            <option>D-001 — Engineering</option>
            <option>D-002 — Sales</option>
          </select>
        </label>
      </div>
    </ModalShell>
  )
}

function JobHistory({
  role,
  employee,
  entries,
  onSoftDelete,
  onRestore,
  close,
}: {
  role: Role
  employee: string[]
  entries: JobHistoryEntry[]
  onSoftDelete: (entry: JobHistoryEntry) => void
  onRestore: (entry: JobHistoryEntry) => void
  close: () => void
}) {
  const isAdmin = role !== "User"
  const [view, setView] = useState<"table" | "timeline">("table")
  const [form, setForm] = useState<"new" | "edit" | null>(null)
  const [deletingHistory, setDeletingHistory] = useState<JobHistoryEntry | null>(
    null
  )
  const history = entries.filter((e) => isAdmin || e.status === "Active")
  return (
    <ModalShell
      title={`Job History — ${employee[0]} (${employee[2]} ${employee[1]})`}
      subtitle="Career movement, effective dates, and salary progression."
      close={close}
      wide
      className="history-modal"
      footer={
        <Button variant="secondary" onClick={close}>
          Close
        </Button>
      }
    >
      <div className="history-toolbar">
        <div className="view-switch">
          <button
            className={view === "table" ? "selected" : ""}
            onClick={() => setView("table")}
          >
            <Icon name="report" size={15} />
            Table View
          </button>
          <button
            className={view === "timeline" ? "selected" : ""}
            onClick={() => setView("timeline")}
          >
            <Icon name="briefcase" size={15} />
            Visual Timeline
          </button>
        </div>
        {isAdmin && (
          <Button icon="plus" onClick={() => setForm("new")}>
            Add History
          </Button>
        )}
      </div>
      {view === "table" ? (
        <div className="table-scroll">
          <table className="entity-table">
            <thead>
              <tr>
                <th>Eff Date</th>
                <th>Job</th>
                <th>Department</th>
                <th>Salary</th>
                {isAdmin && (
                  <>
                    <th>Status</th>
                    <th>Stamp</th>
                    <th>Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {history.length ? (
                history.map((row) => (
                  <tr
                    key={`${row.empno}-${row.effdate}-${row.job}`}
                    className={row.status === "Inactive" ? "inactive-row" : ""}
                  >
                    <td className="code-cell">{row.effdate}</td>
                    <td>
                      <b className="record-name">{row.job}</b>
                    </td>
                    <td>{row.department}</td>
                    <td>
                      <b className="salary-value">{row.salary}</b>
                    </td>
                    {isAdmin && (
                      <>
                        <td>
                          <Badge kind={row.status.toLowerCase()}>
                            {row.status}
                          </Badge>
                        </td>
                        <td>
                          <Stamp
                            action={row.action}
                            user={row.user}
                            date={row.date}
                          />
                        </td>
                        <td>
                          <div className="row-actions">
                            {row.status === "Inactive" ? (
                              <button
                                className="success-link"
                                onClick={() => onRestore(row)}
                              >
                                Restore
                              </button>
                            ) : (
                              <>
                                <button onClick={() => setForm("edit")}>
                                  Edit
                                </button>
                                <button
                                  className="danger-link"
                                  onClick={() => setDeletingHistory(row)}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 4}
                    style={{
                      textAlign: "center",
                      color: "var(--muted)",
                      padding: "20px",
                    }}
                  >
                    No job history entries found for {employee[0]}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="career-timeline">
          {history.map((row, index) => (
            <article key={`${row.empno}-${row.effdate}-${row.job}`}>
              <div className="timeline-rail">
                <span>{index + 1}</span>
              </div>
              <div className="timeline-date">
                {row.effdate}
                <small>
                  {index === 0 ? "Latest assignment" : "Career progression"}
                </small>
              </div>
              <div className="timeline-role">
                <b>{row.job}</b>
                <span>{row.department}</span>
              </div>
              <div className="timeline-salary">
                <small>Annual salary</small>
                <b>{row.salary}</b>
              </div>
            </article>
          ))}
        </div>
      )}
      {form && (
        <HistoryForm editing={form === "edit"} close={() => setForm(null)} />
      )}
      {deletingHistory && (
        <ConfirmDeleteModal
          title="Deactivate Job History Entry?"
          targetLabel={`${deletingHistory.job} (${deletingHistory.effdate})`}
          warningMessage="Are you sure you want to deactivate this career milestone? This record will be soft-deleted (archived) and marked Inactive."
          actionLabel="Deactivate History"
          onConfirm={() => {
            onSoftDelete(deletingHistory)
            setDeletingHistory(null)
          }}
          onClose={() => setDeletingHistory(null)}
        />
      )}
    </ModalShell>
  )
}

function LookupTable({
  tab,
  role,
  items,
  canAdd = true,
  canEdit = true,
  canDelete = true,
  onAdd,
  onEdit,
  onSoftDelete,
  onRestore,
}: {
  tab: "jobs" | "departments"
  role: Role
  items: string[][]
  canAdd?: boolean
  canEdit?: boolean
  canDelete?: boolean
  onAdd?: () => void
  onEdit?: (code: string, name: string) => void
  onSoftDelete: (code: string, name?: string) => void
  onRestore: (code: string) => void
}) {
  const isAdmin = role !== "User"
  const [filter, setFilter] = useState("active")
  const [search, setSearch] = useState("")
  const [deletingLookup, setDeletingLookup] = useState<string[] | null>(null)
  const [blockedModal, setBlockedModal] = useState<{
    title: string
    subtitle: string
    reason: string
  } | null>(null)
  const title = tab === "jobs" ? "Job" : "Department"

  const counts = useMemo<[number, number, number]>(() => {
    const activeCount = items.filter((r) => r[2] === "Active").length
    const inactiveCount = items.filter((r) => r[2] === "Inactive").length
    return [activeCount, inactiveCount, items.length]
  }, [items])

  const rows = useMemo(
    () =>
      items.filter((row) => {
        if (!isAdmin && row[2] === "Inactive") return false
        if (isAdmin && filter !== "all" && row[2].toLowerCase() !== filter)
          return false
        const q = search.trim().toLowerCase()
        if (!q) return true
        return `${row[0]} ${row[1]}`.toLowerCase().includes(q)
      }),
    [items, filter, isAdmin, search],
  )

  const handleDeleteClick = (row: string[]) => {
    if (tab === "departments" || tab === "jobs") {
      onSoftDelete(row[0], row[1])
      return
    }
    setDeletingLookup(row)
  }

  return (
    <>
      <EntityControls
        isAdmin={isAdmin}
        counts={counts}
        activeFilter={filter}
        onFilter={setFilter}
        search={search}
        onSearch={setSearch}
        placeholder={`Search ${tab}...`}
        addLabel={`Add ${title}`}
        canAdd={canAdd}
        showAdd={canAdd}
        onAdd={() => {
          if (canAdd && onAdd) onAdd()
        }}
      />
      <section className="entity-table-shell">
        {rows.length ? (
          <div className="table-scroll">
            <table className="entity-table">
              <thead>
                <tr>
                  <th>{title} Code</th>
                  <th>{tab === "jobs" ? "Description" : "Department Name"}</th>
                  {isAdmin && (
                    <>
                      <th>Status</th>
                      <th>Stamp</th>
                      <th>Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    className={row[2] === "Inactive" ? "inactive-row" : ""}
                    key={row[0]}
                  >
                    <td className="code-cell">{row[0]}</td>
                    <td>
                      <b className="record-name">{row[1]}</b>
                    </td>
                    {isAdmin && (
                      <>
                        <td>
                          <Badge kind={row[2]}>{row[2]}</Badge>
                        </td>
                        <td>
                          <Stamp
                            action={
                              row[3] ??
                              (row[2] === "Active" ? "CREATED" : "DELETED")
                            }
                            user={
                              row[4] ??
                              (row[2] === "Active" ? "system" : "user2")
                            }
                            date={row[5] ?? "2026-10-13 1:01 PM"}
                          />
                        </td>
                        <td>
                          <div className="row-actions">
                            {row[2] === "Inactive" ? (
                              (canEdit || canDelete) && (
                                <button
                                  className="success-link"
                                  onClick={() => onRestore(row[0])}
                                >
                                  Restore
                                </button>
                              )
                            ) : (
                              <>
                                {canEdit && (
                                  <button
                                    onClick={() => {
                                      if (onEdit) onEdit(row[0], row[1])
                                    }}
                                  >
                                    Edit
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    className="danger-link"
                                    onClick={() => handleDeleteClick(row)}
                                  >
                                    Delete
                                  </button>
                                )}
                                {!canEdit && !canDelete && (
                                  <span style={{ fontSize: "0.78rem", color: "var(--color-muted)" }}>
                                    Read-only
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            query={search}
            title={
              search
                ? `No matching ${tab} found`
                : filter === "inactive"
                ? `No inactive ${tab}`
                : `No ${tab} records in directory`
            }
            message={
              search
                ? `Nothing matches "${search}". Try searching for a different ${title.toLowerCase()} code or name.`
                : filter === "inactive"
                ? `There are currently no deactivated ${tab} in the system.`
                : `Add your first ${title.toLowerCase()} record to organize company structure.`
            }
            actionLabel={canAdd && onAdd ? `Add ${title}` : undefined}
            onAction={canAdd && onAdd ? onAdd : undefined}
            onClear={() => setSearch("")}
          />
        )}
      </section>

      {deletingLookup && (
        <ConfirmDeleteModal
          title={`Deactivate ${title}?`}
          targetLabel={`${deletingLookup[0]} — ${deletingLookup[1]}`}
          warningMessage={`Are you sure you want to deactivate ${deletingLookup[0]} (${deletingLookup[1]})? The record will be soft-deleted, marked Inactive, and archived.`}
          actionLabel={`Deactivate ${title}`}
          onConfirm={() => {
            onSoftDelete(deletingLookup[0], deletingLookup[1])
            setDeletingLookup(null)
          }}
          onClose={() => setDeletingLookup(null)}
        />
      )}

      {blockedModal && (
        <BlockedDeleteModal
          title={blockedModal.title}
          subtitle={blockedModal.subtitle}
          reason={blockedModal.reason}
          close={() => setBlockedModal(null)}
          onClose={() => setBlockedModal(null)}
        />
      )}
    </>
  )
}

export default function HumanResourcesPage({ role }: { role: Role }) {
  const { user } = useAuth()
  const [rights, setRights] = useState<string[]>([])
  const isSuperadmin = role === "Superadmin" || user?.role === "Superadmin"
  const isAdminRole = role === "Admin" || user?.role === "Admin"
  const isAdmin = isSuperadmin || isAdminRole

  const [tab, setTab] = useState<HrTab>("employees")

  // Department State
  const [departmentForm, setDepartmentForm] = useState<Department | "new" | null>(null)
  const [deletingDept, setDeletingDept] = useState<{ code: string; name: string } | null>(null)
  const [deleteDeptLoading, setDeleteDeptLoading] = useState(false)
  const [restoringDeptCode, setRestoringDeptCode] = useState<string | null>(null)

  // Job State
  const [jobForm, setJobForm] = useState<Job | "new" | null>(null)
  const [deletingJob, setDeletingJob] = useState<{ code: string; name: string } | null>(null)
  const [deleteJobLoading, setDeleteJobLoading] = useState(false)
  const [restoringJobCode, setRestoringJobCode] = useState<string | null>(null)

  const [employees, setEmployees] = useState<string[][]>(fallbackEmployees)
  const [lookups, setLookups] =
    useState<Record<"jobs" | "departments", string[][]>>(fallbackLookups)
  const [jobHistory, setJobHistory] =
    useState<JobHistoryEntry[]>(fallbackJobHistory)
  const [filter, setFilter] = useState("active")
  const [search, setSearch] = useState("")
  const [employeeForm, setEmployeeForm] = useState<any | "new" | null>(null)
  const [historyEmployee, setHistoryEmployee] = useState<string[] | null>(null)
  const [historyRight, setHistoryRight] = useState(true)
  const [deletingEmployee, setDeletingEmployee] = useState<string[] | null>(null)
  const [blockedModal, setBlockedModal] = useState<{
    title: string
    subtitle: string
    reason: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    let active = true
    rightsApi
      .getUserRights(user.id)
      .then((r) => {
        if (active) setRights(r || [])
      })
      .catch((err) => {
        console.warn("[HumanResourcesPage] rightsApi error, attempting Supabase fallback:", err)
        fetchUserRightsFromSupabase(user.id)
          .then((direct) => {
            if (active) setRights(direct || [])
          })
          .catch(() => {
            if (active) setRights([])
          })
      })
    return () => {
      active = false
    }
  }, [user?.id])

  const hasRight = (name: string) => {
    if (isSuperadmin) return true
    if (isAdminRole && !rights.length) return true
    const n = name.toLowerCase().trim()
    return rights.some((r) => {
      const rl = r.toLowerCase().trim()
      return (
        rl === n ||
        rl === `department - ${n}` ||
        rl === `${n} department` ||
        rl === `hr - ${n}` ||
        (rl.includes("department") && rl.includes(n))
      )
    })
  }

  const canAddDept = isSuperadmin || isAdminRole || hasRight("add") || hasRight("add department")
  const canEditDept = isSuperadmin || isAdminRole || hasRight("edit") || hasRight("edit department")
  const canDeleteDept = isSuperadmin || isAdminRole || hasRight("delete") || hasRight("delete department")

  const canAddJob = isSuperadmin || isAdminRole || hasRight("add") || hasRight("add job")
  const canEditJob = isSuperadmin || isAdminRole || hasRight("edit") || hasRight("edit job")
  const canDeleteJob = isSuperadmin || isAdminRole || hasRight("delete") || hasRight("delete job")

  const canAddEmployee = isSuperadmin || isAdminRole || hasRight("add") || hasRight("add employee")
  const canEditEmployee = isSuperadmin || isAdminRole || hasRight("edit") || hasRight("edit employee")
  const canDeleteEmployee = isSuperadmin || isAdminRole || hasRight("delete") || hasRight("delete employee")

  const operatorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Authorized User"

  const suggestedDeptcode = useMemo(() => {
    const existing = lookups.departments.map((d) => d[0])
    const nums = existing
      .map((code) => {
        const m = code.match(/D-(\d+)/i)
        return m ? parseInt(m[1], 10) : 0
      })
      .filter((n) => !isNaN(n))
    const maxNum = nums.length ? Math.max(...nums) : 0
    return `D-${String(maxNum + 1).padStart(3, "0")}`
  }, [lookups.departments])

  const suggestedJobcode = useMemo(() => {
    const existing = lookups.jobs.map((j) => j[0])
    const nums = existing
      .map((code) => {
        const m = code.match(/J-(\d+)/i)
        return m ? parseInt(m[1], 10) : 0
      })
      .filter((n) => !isNaN(n))
    const maxNum = nums.length ? Math.max(...nums) : 0
    return `J-${String(maxNum + 1).padStart(3, "0")}`
  }, [lookups.jobs])

  const suggestedEmpno = useMemo(() => {
    const existing = employees.map((e) => e[0])
    const nums = existing
      .map((code) => {
        const m = code.match(/E-(\d+)/i)
        return m ? parseInt(m[1], 10) : 0
      })
      .filter((n) => !isNaN(n))
    const maxNum = nums.length ? Math.max(...nums) : 0
    return `E-${String(maxNum + 1).padStart(3, "0")}`
  }, [employees])

  const handleSoftDeleteJobClick = async (code: string, name: string) => {
    try {
      const refCheck = await checkJobHasActiveReferences(code)
      if (refCheck.hasActiveEmployees) {
        setBlockedModal({
          title: "Referential Integrity Guard",
          subtitle: `Cannot deactivate ${code} — ${name}`,
          reason:
            refCheck.message ||
            `Job ${code} (${name}) is currently assigned to active employee profiles or job history records. Reassign all employees before deactivating this job.`,
        })
        return
      }
    } catch {
      if (code === "J-001") {
        setBlockedModal({
          title: "Referential Integrity Guard",
          subtitle: `Cannot deactivate ${code} — ${name}`,
          reason:
            "Job J-001 (Software Engineer) is assigned to 2 active employee profiles and historical salary milestones. Reassign active employees before deactivating.",
        })
        return
      }
    }
    setDeletingJob({ code, name })
  }

  const confirmSoftDeleteJob = async () => {
    if (!deletingJob) return
    const { code, name } = deletingJob
    setError(null)
    setSuccess(null)
    setDeleteJobLoading(true)

    try {
      const res = await jobApi.deleteJob(code)
      setDeletingJob(null)
      if (res?.blocked) {
        setBlockedModal({
          title: "Referential Integrity Guard",
          subtitle: `Cannot deactivate ${code} — ${name}`,
          reason: res.message,
        })
      } else {
        setSuccess(`Deactivated job ${code} (${name}). Record preserved in archive.`)
        loadData()
      }
    } catch (err: any) {
      setDeletingJob(null)
      if (err.blocked || err.status === 409) {
        setBlockedModal({
          title: "Referential Integrity Guard",
          subtitle: `Cannot deactivate ${code} — ${name}`,
          reason: err.message,
        })
      } else {
        setError(err.message || `Failed to deactivate job ${code}.`)
      }
    } finally {
      setDeleteJobLoading(false)
    }
  }

  const handleRestoreJob = async (code: string) => {
    setError(null)
    setSuccess(null)
    setRestoringJobCode(code)
    try {
      await jobApi.restoreJob(code)
      setSuccess(`Restored job ${code}. Job is now Active and available for employee assignments.`)
      loadData()
    } catch (err: any) {
      setError(err.message || `Failed to restore job ${code}.`)
    } finally {
      setRestoringJobCode(null)
    }
  }

  const handleSoftDeleteDepartmentClick = async (code: string, name: string) => {
    try {
      const refCheck = await checkDepartmentHasActiveReferences(code)
      if (refCheck.hasActiveEmployees) {
        setBlockedModal({
          title: "Referential Integrity Guard",
          subtitle: `Cannot deactivate ${code} — ${name}`,
          reason:
            refCheck.message ||
            `Department ${code} (${name}) is currently assigned to active employees or job history records. Reassign all employees before deactivating this department.`,
        })
        return
      }
    } catch {
      if (code === "D-001") {
        setBlockedModal({
          title: "Referential Integrity Guard",
          subtitle: `Cannot deactivate ${code} — ${name}`,
          reason:
            "Department D-001 (Engineering) has 3 active employees and open organizational budget allocations. Reassign employees before deactivating this department.",
        })
        return
      }
    }
    setDeletingDept({ code, name })
  }

  const confirmSoftDeleteDepartment = async () => {
    if (!deletingDept) return
    const { code, name } = deletingDept
    setError(null)
    setSuccess(null)
    setDeleteDeptLoading(true)

    try {
      const res = await departmentApi.deleteDepartment(code)
      setDeletingDept(null)
      if (res?.blocked) {
        setBlockedModal({
          title: "Referential Integrity Guard",
          subtitle: `Cannot deactivate ${code} — ${name}`,
          reason: res.message,
        })
      } else {
        setSuccess(`Deactivated department ${code} (${name}). Record preserved in archive.`)
        loadData()
      }
    } catch (err: any) {
      setDeletingDept(null)
      if (err.blocked || err.status === 409) {
        setBlockedModal({
          title: "Referential Integrity Guard",
          subtitle: `Cannot deactivate ${code} — ${name}`,
          reason: err.message,
        })
      } else {
        setError(err.message || `Failed to deactivate department ${code}.`)
      }
    } finally {
      setDeleteDeptLoading(false)
    }
  }

  const handleRestoreDepartment = async (code: string) => {
    setError(null)
    setSuccess(null)
    setRestoringDeptCode(code)
    try {
      await departmentApi.restoreDepartment(code)
      setSuccess(`Restored department ${code}. Department is now Active and available for employee assignments.`)
      loadData()
    } catch (err: any) {
      setError(err.message || `Failed to restore department ${code}.`)
    } finally {
      setRestoringDeptCode(null)
    }
  }

  const handleSoftDeleteEmployee = (emp: string[]) => {
    if (emp[0] === "E-001") {
      setBlockedModal({
        title: "Referential Integrity Guard",
        subtitle: `Cannot deactivate ${emp[0]} (${emp[2]} ${emp[1]})`,
        reason:
          "Employee E-001 is designated as Department Lead for D-001 (Engineering) and has active career history dependencies. Reassign leadership before deactivating.",
      })
      return
    }
    setDeletingEmployee(emp)
  }

  const confirmSoftDeleteEmployee = () => {
    if (!deletingEmployee) return
    const empno = deletingEmployee[0]
    setEmployees((prev) =>
      prev.map((r) =>
        r[0] === empno
          ? [
              r[0],
              r[1],
              r[2],
              r[3],
              r[4],
              r[5],
              "2026-11-20",
              "Inactive",
              "DELETED",
              "Phil Hitalia",
              "2026-11-20 11:30 AM",
            ]
          : r
      )
    )
    setSuccess(
      `Employee ${empno} (${deletingEmployee[2]} ${deletingEmployee[1]}) has been deactivated (soft-deleted). Record preserved for audit history.`
    )
    setDeletingEmployee(null)
  }

  const handleRestoreEmployee = (empno: string) => {
    setEmployees((prev) =>
      prev.map((r) =>
        r[0] === empno
          ? [
              r[0],
              r[1],
              r[2],
              r[3],
              r[4],
              r[5],
              "—",
              "Active",
              "EDITED",
              "Phil Hitalia",
              "2026-11-20 11:30 AM",
            ]
          : r
      )
    )
    setSuccess(`Employee ${empno} restored to active status.`)
  }

  const handleSoftDeleteLookup = (
    targetTab: "jobs" | "departments",
    code: string
  ) => {
    setLookups((prev) => ({
      ...prev,
      [targetTab]: prev[targetTab].map((row) =>
        row[0] === code
          ? [
              row[0],
              row[1],
              "Inactive",
              "DELETED",
              "Phil Hitalia",
              "2026-11-20 11:30 AM",
            ]
          : row
      ),
    }))
    setSuccess(
      `${
        targetTab === "jobs" ? "Job" : "Department"
      } ${code} has been deactivated (soft-deleted).`
    )
  }

  const handleRestoreLookup = (
    targetTab: "jobs" | "departments",
    code: string
  ) => {
    setLookups((prev) => ({
      ...prev,
      [targetTab]: prev[targetTab].map((row) =>
        row[0] === code
          ? [
              row[0],
              row[1],
              "Active",
              "EDITED",
              "Phil Hitalia",
              "2026-11-20 11:30 AM",
            ]
          : row
      ),
    }))
    setSuccess(
      `${
        targetTab === "jobs" ? "Job" : "Department"
      } ${code} has been restored to active status.`
    )
  }

  const handleSoftDeleteHistory = (entry: JobHistoryEntry) => {
    setJobHistory((prev) =>
      prev.map((h) =>
        h.empno === entry.empno && h.effdate === entry.effdate
          ? {
              ...h,
              status: "Inactive",
              action: "DELETED",
              user: "Phil Hitalia",
              date: "2026-11-20 11:30 AM",
            }
          : h
      )
    )
    setSuccess(
      `Job history milestone for ${entry.job} (${entry.effdate}) archived.`
    )
  }

  const handleRestoreHistory = (entry: JobHistoryEntry) => {
    setJobHistory((prev) =>
      prev.map((h) =>
        h.empno === entry.empno && h.effdate === entry.effdate
          ? {
              ...h,
              status: "Active",
              action: "EDITED",
              user: "Phil Hitalia",
              date: "2026-11-20 11:30 AM",
            }
          : h
      )
    )
    setSuccess(
      `Job history milestone for ${entry.job} (${entry.effdate}) restored to active.`
    )
  }

  const loadData = () => {
    return Promise.all([
      employeeApi.listEmployees({ status: "all" }).catch(() =>
        fetchTableRowsFromSupabase("employee", "empno.asc")
      ),
      jobApi.listJobs({ status: "all" }).catch(() =>
        fetchTableRowsFromSupabase("job", "jobcode.asc")
      ),
      departmentApi.listDepartments({ status: "all" }).catch(() =>
        fetchTableRowsFromSupabase("department", "deptcode.asc")
      ),
      fetchTableRowsFromSupabase("jobhistory", "effdate.desc"),
    ])
      .then(([empRows, jobRows, deptRows, histRows]) => {

        const jobNameMap = new Map<string, string>()
        if (jobRows.length) {
          for (const j of jobRows) {
            jobNameMap.set(
              String(j.jobcode ?? ""),
              `${j.jobcode} — ${j.jobdesc ?? ""}`
            )
          }
        }

        const deptNameMap = new Map<string, string>()
        if (deptRows.length) {
          for (const d of deptRows) {
            deptNameMap.set(
              String(d.deptcode ?? ""),
              `${d.deptcode} — ${d.deptname ?? ""}`
            )
          }
        }

        // Build map of latest active job history entry per employee
        const latestHistMap = new Map<string, { job: string; dept: string }>()
        if (histRows.length) {
          for (const h of histRows) {
            const eNo = String(h.empno ?? "")
            if (!latestHistMap.has(eNo) && !h.is_deleted) {
              const jCode = String(h.jobcode ?? "")
              const dCode = String(h.deptcode ?? "")
              latestHistMap.set(eNo, {
                job: jobNameMap.get(jCode) || jCode || "—",
                dept: deptNameMap.get(dCode) || dCode || "—",
              })
            }
          }
        }

        if (empRows.length) {
          const mappedEmps = empRows.map((r: any) => {
            const isDeleted = Boolean(r.is_deleted)
            const [action, user, date] = parseStamp(r.stamp, isDeleted)
            const eNo = String(r.empno ?? "")
            const hist = latestHistMap.get(eNo)
            const deptName = r.currentDept && r.currentDept !== "—" ? r.currentDept : (hist?.dept || "—")
            const jobTitle = r.currentJob && r.currentJob !== "—" ? r.currentJob : (hist?.job || "—")
            return [
              eNo,
              String(r.lastname ?? "—"),
              String(r.firstname ?? "—"),
              String(r.gender ?? "—"),
              String(r.birthdate ?? "—"),
              String(r.hiredate ?? "—"),
              r.sepdate ? String(r.sepdate) : "—",
              isDeleted ? "Inactive" : (r.status || "Active"),
              r.stampAction || action,
              r.stampUser || user,
              r.stampDate || date,
              deptName,
              jobTitle,
            ]
          })
          setEmployees(mappedEmps)
        }

        if (jobRows.length || deptRows.length) {
          setLookups({
            jobs: jobRows.length
              ? jobRows.map((j: any) => {
                  const isDeleted = Boolean(j.is_deleted)
                  const [action, user, date] = parseStamp(j.stamp, isDeleted)
                  return [
                    String(j.jobcode ?? ""),
                    String(j.jobdesc ?? "—"),
                    isDeleted ? "Inactive" : "Active",
                    j.stampAction || action,
                    j.stampUser || user,
                    j.stampDate || date,
                  ]
                })
              : fallbackLookups.jobs,
            departments: deptRows.length
              ? deptRows.map((d: any) => {
                  const isDeleted = Boolean(d.is_deleted)
                  const [action, user, date] = parseStamp(d.stamp, isDeleted)
                  return [
                    String(d.deptcode ?? ""),
                    String(d.deptname ?? "—"),
                    isDeleted ? "Inactive" : "Active",
                    d.stampAction || action,
                    d.stampUser || user,
                    d.stampDate || date,
                  ]
                })
              : fallbackLookups.departments,
          })
        }

        if (histRows.length) {
          const mappedHist: JobHistoryEntry[] = histRows.map((h) => {
            const isDeleted = Boolean(h.is_deleted)
            const [action, user, date] = parseStamp(h.stamp, isDeleted)
            const jCode = String(h.jobcode ?? "")
            const dCode = String(h.deptcode ?? "")
            return {
              empno: String(h.empno ?? ""),
              effdate: String(h.effdate ?? ""),
              job: jobNameMap.get(jCode) || jCode,
              department: deptNameMap.get(dCode) || dCode,
              salary: formatMoney(h.salary),
              status: isDeleted ? "Inactive" : "Active",
              action,
              user,
              date,
            }
          })
          setJobHistory(mappedHist)
        }
      })
      .catch((err) => {
        console.error("Failed to load HR data from Supabase:", err)
      })
  }

  useEffect(() => {
    loadData()
  }, [])

  const counts = useMemo<[number, number, number]>(() => {
    const activeCount = employees.filter((r) => r[7] === "Active").length
    const inactiveCount = employees.filter((r) => r[7] === "Inactive").length
    return [activeCount, inactiveCount, employees.length]
  }, [employees])

  const rows = useMemo(
    () =>
      employees.filter((row) => {
        if (!isAdmin && row[7] === "Inactive") return false
        if (isAdmin && filter !== "all" && row[7].toLowerCase() !== filter)
          return false
        const q = search.trim().toLowerCase()
        if (!q) return true
        const textToSearch = [
          row[0], // empno
          row[1], // lastname
          row[2], // firstname
          `${row[2]} ${row[1]}`, // firstname lastname
          `${row[1]}, ${row[2]}`, // lastname, firstname
          row[3], // gender
          row[4], // birthdate
          row[5], // hiredate
          row[6], // sepdate
          row[11], // department
          row[12], // job
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return textToSearch.includes(q)
      }),
    [employees, filter, isAdmin, search],
  )
  return (
    <div className="page module-page">
      <div className="page-heading">
        <div>
          <span>People operations / Human Resources</span>
          <div className="page-title">Human Resources</div>
          <p>
            Employment records, organization structure, and effective-dated
            careers.
          </p>
        </div>
        <label className="privacy-toggle">
          <span>
            <b>View Job History right</b>
            <small>
              {historyRight
                ? "Granted · salary visible"
                : "Restricted · salary hidden"}
            </small>
          </span>
          <input
            type="checkbox"
            checked={historyRight}
            onChange={(event) => {
              setHistoryRight(event.target.checked)
              if (!event.target.checked) setHistoryEmployee(null)
            }}
          />
          <i></i>
        </label>
      </div>
      <div className="module-subnav">
        {(["employees", "jobs", "departments"] as HrTab[]).map((item) => (
          <button
            className={tab === item ? "selected" : ""}
            onClick={() => setTab(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>
      {error && (
        <div className="alert-banner alert-banner-error">
          <Icon name="alert-triangle" size={16} />
          <span>{error}</span>
          <button className="alert-close" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}
      {success && (
        <div className="alert-banner alert-banner-success">
          <Icon name="check-circle" size={16} />
          <span>{success}</span>
          <button className="alert-close" onClick={() => setSuccess(null)}>
            ×
          </button>
        </div>
      )}
      {tab === "employees" ? (
        <>
          <EntityControls
            isAdmin={isAdmin}
            counts={counts}
            activeFilter={filter}
            onFilter={setFilter}
            search={search}
            onSearch={setSearch}
            placeholder="Search by name, ID, department, or job title..."
            addLabel="Add Employee"
            canAdd={canAddEmployee}
            showAdd={canAddEmployee}
            onAdd={() => {
              if (canAddEmployee) setEmployeeForm("new")
            }}
          />
          {!historyRight && (
            <div className="privacy-banner">
              <Icon name="lock" />
              <div>
                <b>Restricted by Data Privacy controls</b>
                <span>
                  Job History actions and salary figures are hidden in this
                  preview state.
                </span>
              </div>
            </div>
          )}
          <section className="entity-table-shell">
            {rows.length ? (
              <div className="table-scroll">
                <table className="entity-table hr-table">
                  <thead>
                    <tr>
                      <th>Emp No</th>
                      <th>Last Name</th>
                      <th>First Name</th>
                      <th>Department</th>
                      <th>Current Job</th>
                      <th>Gender</th>
                      <th>Birth Date</th>
                      <th>Hire Date</th>
                      <th>Sep Date</th>
                      {isAdmin && (
                        <>
                          <th>Status</th>
                          <th>Stamp</th>
                        </>
                      )}
                      {(isAdmin || historyRight) && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        className={row[7] === "Inactive" ? "inactive-row" : ""}
                        key={row[0]}
                      >
                        <td className="code-cell">{row[0]}</td>
                        <td>
                          <b className="record-name">{row[1]}</b>
                        </td>
                        <td>{row[2]}</td>
                        <td>
                          <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--color-primary-text, inherit)" }}>
                            {row[11] || "—"}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.85rem", color: "var(--color-muted, #64748b)" }}>
                            {row[12] || "—"}
                          </span>
                        </td>
                        <td>{row[3]}</td>
                        <td>{row[4]}</td>
                        <td>{row[5]}</td>
                        <td>{row[6]}</td>
                        {isAdmin && (
                          <>
                            <td>
                              <Badge kind={row[7]}>{row[7]}</Badge>
                            </td>
                            <td>
                              <Stamp
                                action={row[8]}
                                user={row[9]}
                                date={row[10]}
                              />
                            </td>
                          </>
                        )}
                        {(isAdmin || historyRight) && (
                          <td>
                            <div className="row-actions">
                              {row[7] === "Inactive" ? (
                                isAdmin && (
                                  <button
                                    className="success-link"
                                    onClick={() =>
                                      handleRestoreEmployee(row[0])
                                    }
                                  >
                                    Restore
                                  </button>
                                )
                              ) : (
                                <>
                                  {historyRight && (
                                    <button
                                      onClick={() => setHistoryEmployee(row)}
                                    >
                                      History
                                    </button>
                                  )}
                                  {canEditEmployee && (
                                    <button
                                      onClick={() =>
                                        setEmployeeForm({
                                          empno: row[0],
                                          lastname: row[1],
                                          firstname: row[2],
                                          gender: row[3],
                                          birthdate: row[4],
                                          hiredate: row[5],
                                          sepdate: row[6] === "—" ? "" : row[6],
                                          status: row[7],
                                          currentDept: row[11],
                                          currentJob: row[12],
                                        })
                                      }
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {canDeleteEmployee && (
                                    <button
                                      className="danger-link"
                                      onClick={() =>
                                        handleSoftDeleteEmployee(row)
                                      }
                                    >
                                      Delete
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                query={search}
                title={
                  search
                    ? "No matching employees found"
                    : filter === "inactive"
                    ? "No inactive employee records"
                    : "No employee records in directory"
                }
                message={
                  search
                    ? `Nothing matches "${search}". Try searching with a different name, employee number, department, or job title.`
                    : filter === "inactive"
                    ? "There are currently no deactivated or separated employees in the directory."
                    : "Add your first team member to begin tracking organizational records."
                }
                onClear={() => setSearch("")}
              />
            )}
          </section>
        </>
      ) : tab === "departments" ? (
        <LookupTable
          tab="departments"
          role={role}
          items={lookups.departments}
          canAdd={canAddDept}
          canEdit={canEditDept}
          canDelete={canDeleteDept}
          onAdd={() => setDepartmentForm("new")}
          onEdit={(code, name) => setDepartmentForm({ deptcode: code, deptname: name } as any)}
          onSoftDelete={(code, name) => handleSoftDeleteDepartmentClick(code, name || "")}
          onRestore={(code) => handleRestoreDepartment(code)}
        />
      ) : (
        <LookupTable
          tab="jobs"
          role={role}
          items={lookups.jobs}
          canAdd={canAddJob}
          canEdit={canEditJob}
          canDelete={canDeleteJob}
          onAdd={() => setJobForm("new")}
          onEdit={(code, name) => setJobForm({ jobcode: code, jobdesc: name } as any)}
          onSoftDelete={(code, name) => handleSoftDeleteJobClick(code, name || "")}
          onRestore={(code) => handleRestoreJob(code)}
        />
      )}
      {employeeForm && (
        <EmployeeModal
          employee={employeeForm === "new" ? undefined : employeeForm}
          suggestedEmpno={suggestedEmpno}
          existingEmpnos={employees.map((e) => e[0])}
          currentUser={user}
          close={() => setEmployeeForm(null)}
          onSaved={(msg) => {
            if (msg) setSuccess(msg)
            setEmployeeForm(null)
            loadData()
          }}
        />
      )}
      {historyEmployee && (
        <JobHistory
          role={role}
          employee={historyEmployee}
          entries={jobHistory.filter((h) => h.empno === historyEmployee[0])}
          onSoftDelete={handleSoftDeleteHistory}
          onRestore={handleRestoreHistory}
          close={() => setHistoryEmployee(null)}
        />
      )}
      {deletingEmployee && (
        <ConfirmDeleteModal
          title="Deactivate Employee Profile?"
          targetLabel={`${deletingEmployee[0]} — ${deletingEmployee[2]} ${deletingEmployee[1]}`}
          warningMessage={`Are you sure you want to deactivate employee ${deletingEmployee[0]} (${deletingEmployee[2]} ${deletingEmployee[1]})? This will mark their profile Inactive, record a separation date of today, and archive their record. No historical payroll or job records will be destroyed.`}
          actionLabel="Deactivate Employee"
          onConfirm={confirmSoftDeleteEmployee}
          onClose={() => setDeletingEmployee(null)}
        />
      )}
      {departmentForm && (
        <DepartmentModal
          department={departmentForm === "new" ? undefined : departmentForm}
          suggestedDeptcode={suggestedDeptcode}
          existingDeptCodes={lookups.departments.map((d) => d[0])}
          existingDeptNames={lookups.departments.map((d) => d[1])}
          currentUser={user}
          close={() => setDepartmentForm(null)}
          onSaved={(msg) => {
            if (msg) setSuccess(msg)
            setDepartmentForm(null)
            loadData()
          }}
        />
      )}
      {deletingDept && (
        <ConfirmDeleteModal
          noun="Department"
          targetLabel={`${deletingDept.code} — ${deletingDept.name}`}
          warningMessage={`This will mark department ${deletingDept.code} (${deletingDept.name}) as Inactive.`}
          customExplanation="Deactivated departments cannot be assigned to new employee records, but existing historical milestones retain referential integrity. Administrators can restore this department at any time."
          actionLabel="Deactivate Department"
          loading={deleteDeptLoading}
          isDeleting={deleteDeptLoading}
          operator={operatorName}
          onConfirm={confirmSoftDeleteDepartment}
          onClose={() => setDeletingDept(null)}
          close={() => setDeletingDept(null)}
        />
      )}
      {jobForm && (
        <JobModal
          job={jobForm === "new" ? undefined : jobForm}
          suggestedJobcode={suggestedJobcode}
          existingJobCodes={lookups.jobs.map((j) => j[0])}
          existingJobDescs={lookups.jobs.map((j) => j[1])}
          currentUser={user}
          close={() => setJobForm(null)}
          onSaved={(msg) => {
            if (msg) setSuccess(msg)
            setJobForm(null)
            loadData()
          }}
        />
      )}
      {deletingJob && (
        <ConfirmDeleteModal
          noun="Job"
          targetLabel={`${deletingJob.code} — ${deletingJob.name}`}
          warningMessage={`This will mark job ${deletingJob.code} (${deletingJob.name}) as Inactive.`}
          customExplanation="Deactivated jobs cannot be assigned to new employee records, but existing historical milestones retain referential integrity. Administrators can restore this job at any time."
          actionLabel="Deactivate Job"
          loading={deleteJobLoading}
          isDeleting={deleteJobLoading}
          operator={operatorName}
          onConfirm={confirmSoftDeleteJob}
          onClose={() => setDeletingJob(null)}
          close={() => setDeletingJob(null)}
        />
      )}
      {blockedModal && (
        <BlockedDeleteModal
          title={blockedModal.title}
          subtitle={blockedModal.subtitle}
          reason={blockedModal.reason}
          close={() => setBlockedModal(null)}
          onClose={() => setBlockedModal(null)}
        />
      )}
    </div>
  )
}
