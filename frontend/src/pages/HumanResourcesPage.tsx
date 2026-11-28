import { useEffect, useMemo, useState } from "react"
import {
  fetchTableRowsFromSupabase,
  formatMoney,
  parseStamp,
} from "../backend/supabaseClient"
import Badge from "../components/Badge"
import BlockedDeleteModal from "../components/BlockedDeleteModal"
import Button from "../components/Button"
import ConfirmDeleteModal from "../components/ConfirmDeleteModal"
import EmptyState from "../components/EmptyState"
import EntityControls from "../components/EntityControls"
import Icon from "../components/Icon"
import ModalShell from "../components/ModalShell"
import Stamp from "../components/Stamp"
import type { Role } from "../lib/types"

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

function EmployeeForm({
  editing,
  close,
}: {
  editing?: boolean
  close: () => void
}) {
  const [separation, setSeparation] = useState(editing ? "" : "2019-01-01")
  const invalid = Boolean(separation && separation < "2020-03-01")
  return (
    <ModalShell
      title={editing ? "Edit Employee" : "Add Employee"}
      subtitle="Personal dates and employment dates are validated independently."
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button onClick={close} disabled={invalid}>
            {editing ? "Save Changes" : "Add Employee"}
          </Button>
        </>
      }
    >
      <div className="record-form record-form-three">
        <label>
          <span>Emp No</span>
          <input defaultValue={editing ? "E-001" : "E-005"} />
        </label>
        <label>
          <span>Last Name</span>
          <input defaultValue={editing ? "Santos" : ""} />
        </label>
        <label>
          <span>First Name</span>
          <input defaultValue={editing ? "Maria" : ""} />
        </label>
        <label>
          <span>Gender</span>
          <select defaultValue="F">
            <option>F</option>
            <option>M</option>
            <option>Prefer not to say</option>
          </select>
        </label>
        <label>
          <span>Birth Date</span>
          <input type="date" defaultValue="1990-05-12" />
        </label>
        <label>
          <span>Hire Date</span>
          <input type="date" defaultValue="2020-03-01" />
        </label>
        <label>
          <span>Separation Date</span>
          <input
            className={invalid ? "input-error" : ""}
            type="date"
            value={separation}
            onChange={(event) => setSeparation(event.target.value)}
          />
          {invalid && (
            <small className="validation-error">
              Separation Date cannot be earlier than Hire Date.
            </small>
          )}
        </label>
      </div>
    </ModalShell>
  )
}

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
  onSoftDelete,
  onRestore,
}: {
  tab: "jobs" | "departments"
  role: Role
  items: string[][]
  onSoftDelete: (code: string) => void
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
    if (tab === "jobs" && row[0] === "J-001") {
      setBlockedModal({
        title: "Referential Integrity Guard",
        subtitle: `Cannot deactivate ${row[0]} — ${row[1]}`,
        reason:
          "This job code is assigned to 2 active employee profiles and historical salary milestones. Reassign active employees before deactivating.",
      })
      return
    }
    if (tab === "departments" && row[0] === "D-001") {
      setBlockedModal({
        title: "Referential Integrity Guard",
        subtitle: `Cannot deactivate ${row[0]} — ${row[1]}`,
        reason:
          "This department has 3 active employees and open organizational budget allocations. Reassign employees before deactivating this department.",
      })
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
        onAdd={() => {}}
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
                              <button
                                className="success-link"
                                onClick={() => onRestore(row[0])}
                              >
                                Restore
                              </button>
                            ) : (
                              <>
                                <button>Edit</button>
                                <button
                                  className="danger-link"
                                  onClick={() => handleDeleteClick(row)}
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
            onSoftDelete(deletingLookup[0])
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
  const isAdmin = role !== "User"
  const [tab, setTab] = useState<HrTab>("employees")
  const [employees, setEmployees] = useState<string[][]>(fallbackEmployees)
  const [lookups, setLookups] =
    useState<Record<"jobs" | "departments", string[][]>>(fallbackLookups)
  const [jobHistory, setJobHistory] =
    useState<JobHistoryEntry[]>(fallbackJobHistory)
  const [filter, setFilter] = useState("active")
  const [search, setSearch] = useState("")
  const [employeeForm, setEmployeeForm] = useState<"new" | "edit" | null>(null)
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

  useEffect(() => {
    let active = true
    Promise.all([
      fetchTableRowsFromSupabase("employee", "empno.asc"),
      fetchTableRowsFromSupabase("job", "jobcode.asc"),
      fetchTableRowsFromSupabase("department", "deptcode.asc"),
      fetchTableRowsFromSupabase("jobhistory", "effdate.desc"),
    ])
      .then(([empRows, jobRows, deptRows, histRows]) => {
        if (!active) return

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

        if (empRows.length) {
          const mappedEmps = empRows.map((r) => {
            const isDeleted = Boolean(r.is_deleted)
            const [action, user, date] = parseStamp(r.stamp, isDeleted)
            return [
              String(r.empno ?? ""),
              String(r.lastname ?? "—"),
              String(r.firstname ?? "—"),
              String(r.gender ?? "—"),
              String(r.birthdate ?? "—"),
              String(r.hiredate ?? "—"),
              r.sepdate ? String(r.sepdate) : "—",
              isDeleted ? "Inactive" : "Active",
              action,
              user,
              date,
            ]
          })
          setEmployees(mappedEmps)
        }

        if (jobRows.length || deptRows.length) {
          setLookups({
            jobs: jobRows.length
              ? jobRows.map((j) => {
                  const isDeleted = Boolean(j.is_deleted)
                  const [action, user, date] = parseStamp(j.stamp, isDeleted)
                  return [
                    String(j.jobcode ?? ""),
                    String(j.jobdesc ?? "—"),
                    isDeleted ? "Inactive" : "Active",
                    action,
                    user,
                    date,
                  ]
                })
              : fallbackLookups.jobs,
            departments: deptRows.length
              ? deptRows.map((d) => {
                  const isDeleted = Boolean(d.is_deleted)
                  const [action, user, date] = parseStamp(d.stamp, isDeleted)
                  return [
                    String(d.deptcode ?? ""),
                    String(d.deptname ?? "—"),
                    isDeleted ? "Inactive" : "Active",
                    action,
                    user,
                    date,
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
      .catch(() => {})
    return () => {
      active = false
    }
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
        return `${row[0]} ${row[1]} ${row[2]} ${row[3]} ${row[4]} ${row[5]} ${row[6]}`
          .toLowerCase()
          .includes(q)
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
            placeholder="Search employees..."
            addLabel="Add Employee"
            onAdd={() => setEmployeeForm("new")}
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
                                  {isAdmin && (
                                    <>
                                      <button
                                        onClick={() => setEmployeeForm("edit")}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        className="danger-link"
                                        onClick={() =>
                                          handleSoftDeleteEmployee(row)
                                        }
                                      >
                                        Delete
                                      </button>
                                    </>
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
                    ? `Nothing matches "${search}". Try searching with a different name, employee number, or clear the search filter.`
                    : filter === "inactive"
                    ? "There are currently no deactivated or separated employees in the directory."
                    : "Add your first team member to begin tracking organizational records."
                }
                onClear={() => setSearch("")}
              />
            )}
          </section>
        </>
      ) : (
        <LookupTable
          tab={tab}
          role={role}
          items={lookups[tab]}
          onSoftDelete={(code) => handleSoftDeleteLookup(tab, code)}
          onRestore={(code) => handleRestoreLookup(tab, code)}
        />
      )}
      {employeeForm && (
        <EmployeeForm
          editing={employeeForm === "edit"}
          close={() => setEmployeeForm(null)}
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
