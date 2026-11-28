import { useEffect, useMemo, useState } from "react"
import Badge from "./Badge"
import Button from "./Button"
import ConfirmDeleteModal from "./ConfirmDeleteModal"
import Icon from "./Icon"
import ModalShell from "./ModalShell"
import Stamp from "./Stamp"
import { jobHistoryApi } from "../lib/api"
import type { Department, Job, JobHistoryRecord, Role } from "../lib/types"

export interface JobHistoryModalProps {
  role: Role
  employee: string[]
  jobs?: (Job | string[])[]
  departments?: (Department | string[])[]
  currentUser?: {
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    role?: string
  } | null
  canManageHistory?: boolean
  canViewSalary?: boolean
  canAddHistory?: boolean
  canEditHistory?: boolean
  canDeleteHistory?: boolean
  close: () => void
  onHistoryChanged?: () => void
}

function HistoryFormModal({
  employee,
  entry,
  jobs = [],
  departments = [],
  existingEffDates = [],
  close,
  onSave,
}: {
  employee: string[]
  entry?: JobHistoryRecord | null
  jobs?: (Job | string[])[]
  departments?: (Department | string[])[]
  existingEffDates?: string[]
  close: () => void
  onSave: (data: {
    effdate: string
    jobcode: string
    deptcode: string
    salary: number
  }) => Promise<void> | void
}) {
  const isEditing = Boolean(entry)
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], [])

  const [effdate, setEffdate] = useState(entry?.effdate ?? todayStr)
  const [salary, setSalary] = useState(
    entry?.salary !== undefined
      ? String(entry.salary)
      : entry?.formattedSalary
      ? entry.formattedSalary.replace(/[^0-9.]/g, "")
      : "45000"
  )

  // Map jobs for select options
  const jobOptions = useMemo(() => {
    if (!jobs || jobs.length === 0) {
      return [
        { code: "J-001", label: "J-001 — Software Engineer" },
        { code: "J-002", label: "J-002 — Sales Manager" },
        { code: "J-003", label: "J-003 — HR Specialist" },
        { code: "J-004", label: "J-004 — Accountant" },
      ]
    }
    return jobs.map((j) => {
      if (Array.isArray(j)) {
        return { code: j[0], label: `${j[0]} — ${j[1] || j[0]}` }
      }
      return { code: j.jobcode, label: `${j.jobcode} — ${j.jobdesc || j.jobcode}` }
    })
  }, [jobs])

  // Map departments for select options
  const deptOptions = useMemo(() => {
    if (!departments || departments.length === 0) {
      return [
        { code: "D-001", label: "D-001 — Engineering" },
        { code: "D-002", label: "D-002 — Sales" },
        { code: "D-003", label: "D-003 — Human Resources" },
        { code: "D-004", label: "D-004 — Finance" },
      ]
    }
    return departments.map((d) => {
      if (Array.isArray(d)) {
        return { code: d[0], label: `${d[0]} — ${d[1] || d[0]}` }
      }
      return { code: d.deptcode, label: `${d.deptcode} — ${d.deptname || d.deptcode}` }
    })
  }, [departments])

  const [selectedJob, setSelectedJob] = useState(
    entry?.jobcode || (jobOptions[0]?.code ?? "J-001")
  )
  const [selectedDept, setSelectedDept] = useState(
    entry?.deptcode || (deptOptions[0]?.code ?? "D-001")
  )

  const [saving, setSaving] = useState(false)
  const [dateError, setDateError] = useState<string | null>(null)
  const [salaryError, setSalaryError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  // Check duplicate date on date input change
  const handleDateChange = (val: string) => {
    setEffdate(val)
    if (!isEditing && existingEffDates.includes(val)) {
      setDateError("A history row already exists on this effective date.")
    } else {
      setDateError(null)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setDateError(null)
    setSalaryError(null)
    setGeneralError(null)

    if (!effdate) {
      setDateError("Effective date is required.")
      return
    }

    if (!isEditing && existingEffDates.includes(effdate)) {
      setDateError("A history row already exists on this effective date.")
      return
    }

    const cleanSalary = String(salary).replace(/[^0-9.]/g, "")
    const numSalary = Number(cleanSalary)
    if (isNaN(numSalary) || numSalary <= 0) {
      setSalaryError("Salary must be a positive number greater than 0.")
      return
    }

    setSaving(true)
    try {
      await onSave({
        effdate,
        jobcode: selectedJob,
        deptcode: selectedDept,
        salary: numSalary,
      })
      close()
    } catch (err: any) {
      if (err.message && err.message.includes("already exists on this effective date")) {
        setDateError("A history row already exists on this effective date.")
      } else {
        setGeneralError(err.message || "Failed to save job history milestone.")
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      title={isEditing ? "Edit Job History" : "Add Job History"}
      subtitle="Effective dates must be unique for this employee."
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : isEditing ? "Save History" : "Add History"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="record-form">
        {generalError && (
          <div className="validation-error banner-error" style={{ marginBottom: "1rem", color: "var(--danger)" }}>
            {generalError}
          </div>
        )}
        <label>
          <span>Effective Date</span>
          <input
            className={dateError ? "input-error" : ""}
            type="date"
            value={effdate}
            disabled={isEditing}
            onChange={(e) => handleDateChange(e.target.value)}
          />
          {dateError && (
            <small className="validation-error">
              {dateError}
            </small>
          )}
        </label>
        <label>
          <span>Salary</span>
          <div className="money-input">
            <span>$</span>
            <input
              type="text"
              className={salaryError ? "input-error" : ""}
              value={salary}
              onChange={(e) => {
                setSalary(e.target.value)
                setSalaryError(null)
              }}
              placeholder="45000"
            />
          </div>
          {salaryError && (
            <small className="validation-error">
              {salaryError}
            </small>
          )}
        </label>
        <label>
          <span>Job</span>
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
          >
            {jobOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Department</span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            {deptOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </form>
    </ModalShell>
  )
}

export default function JobHistoryModal({
  role,
  employee,
  jobs = [],
  departments = [],
  currentUser,
  canManageHistory = true,
  canViewSalary = true,
  canAddHistory,
  canEditHistory,
  canDeleteHistory,
  close,
  onHistoryChanged,
}: JobHistoryModalProps) {
  const isSuperadmin = currentUser?.role === "Superadmin"
  const isAdminRole = currentUser?.role === "Admin"
  const isAdmin = role !== "User" || isSuperadmin || isAdminRole

  const allowAdd = canAddHistory !== undefined ? canAddHistory : (isAdmin && canManageHistory)
  const allowEdit = canEditHistory !== undefined ? canEditHistory : (isAdmin && canManageHistory)
  const allowDelete = canDeleteHistory !== undefined ? canDeleteHistory : (isAdmin && canManageHistory)
  const [view, setView] = useState<"table" | "timeline">("table")
  const [entries, setEntries] = useState<JobHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [formEntry, setFormEntry] = useState<JobHistoryRecord | "new" | null>(null)
  const [deletingHistory, setDeletingHistory] = useState<JobHistoryRecord | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [restoringEffDate, setRestoringEffDate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const empno = employee[0]
  const empName = `${employee[2]} ${employee[1]}`
  const operatorName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
    currentUser?.email ||
    "Authorized User"

  const loadHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await jobHistoryApi.listHistory(empno)
      setEntries(data || [])
    } catch (err: any) {
      console.warn("[JobHistoryModal] Failed to load history from API:", err)
      // Mock fallback if offline or prototype
      if (empno === "E-001") {
        setEntries([
          {
            empno: "E-001",
            effdate: "2023-01-01",
            jobcode: "J-001",
            jobdesc: "Software Engineer",
            job: "J-001 — Software Engineer",
            deptcode: "D-001",
            deptname: "Engineering",
            department: "D-001 — Engineering",
            salary: 52000,
            formattedSalary: "$52,000.00",
            status: "Active",
            is_deleted: false,
            stamp: "EDITED user1 2026-10-13 1:01 PM",
            stampAction: "EDITED",
            stampUser: "user1",
            stampDate: "2026-10-13 1:01 PM",
          },
          {
            empno: "E-001",
            effdate: "2020-03-01",
            jobcode: "J-001",
            jobdesc: "Software Engineer",
            job: "J-001 — Software Engineer",
            deptcode: "D-001",
            deptname: "Engineering",
            department: "D-001 — Engineering",
            salary: 45000,
            formattedSalary: "$45,000.00",
            status: "Active",
            is_deleted: false,
            stamp: "CREATED system 2026-01-15 10:00 AM",
            stampAction: "CREATED",
            stampUser: "system",
            stampDate: "2026-01-15 10:00 AM",
          },
        ])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [empno])

  const visibleEntries = useMemo(() => {
    return entries.filter((e) => isAdmin || !e.is_deleted)
  }, [entries, isAdmin])

  const existingEffDates = useMemo(() => {
    return entries.filter((e) => !e.is_deleted).map((e) => e.effdate)
  }, [entries])

  const handleSaveMilestone = async (data: {
    effdate: string
    jobcode: string
    deptcode: string
    salary: number
  }) => {
    if (formEntry && formEntry !== "new") {
      // Edit mode
      await jobHistoryApi.updateHistory(empno, formEntry.effdate, {
        jobcode: data.jobcode,
        deptcode: data.deptcode,
        salary: data.salary,
      })
      setSuccess(`Job history milestone on ${formEntry.effdate} updated successfully.`)
    } else {
      // Add mode
      await jobHistoryApi.addHistory(empno, data)
      setSuccess(`New career milestone on ${data.effdate} added successfully.`)
    }
    setFormEntry(null)
    await loadHistory()
    if (onHistoryChanged) onHistoryChanged()
  }

  const confirmSoftDelete = async () => {
    if (!deletingHistory) return
    const effdate = deletingHistory.effdate
    setDeleteLoading(true)
    try {
      await jobHistoryApi.deleteHistory(empno, effdate)
      setSuccess(`Job history milestone for ${deletingHistory.job || deletingHistory.jobcode} (${effdate}) archived.`)
      setDeletingHistory(null)
      await loadHistory()
      if (onHistoryChanged) onHistoryChanged()
    } catch (err: any) {
      setError(err.message || `Failed to archive milestone on ${effdate}.`)
      setDeletingHistory(null)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleRestoreMilestone = async (entry: JobHistoryRecord) => {
    setRestoringEffDate(entry.effdate)
    setError(null)
    try {
      await jobHistoryApi.restoreHistory(empno, entry.effdate)
      setSuccess(`Job history milestone on ${entry.effdate} restored to active status.`)
      await loadHistory()
      if (onHistoryChanged) onHistoryChanged()
    } catch (err: any) {
      setError(err.message || `Failed to restore milestone on ${entry.effdate}.`)
    } finally {
      setRestoringEffDate(null)
    }
  }

  return (
    <ModalShell
      title={`Job History — ${empno} (${empName})`}
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
      {error && (
        <div className="validation-error banner-error" style={{ marginBottom: "1rem", color: "var(--danger)" }}>
          {error}
        </div>
      )}
      {success && (
        <div className="success-banner" style={{ marginBottom: "1rem", color: "var(--success)" }}>
          {success}
        </div>
      )}

      {!canViewSalary && (
        <div
          className="salary-restricted-banner"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "0.5rem",
            color: "var(--danger, #dc2626)",
            fontSize: "0.85rem",
            marginBottom: "1rem",
          }}
        >
          <Icon name="lock" size={16} />
          <div>
            <b>Confidentiality Notice:</b> Salary figures and compensation adjustments are hidden under your current access tier (requires <i>View Job History</i> right).
          </div>
        </div>
      )}

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
        {allowAdd && (
          <Button icon="plus" onClick={() => setFormEntry("new")}>
            Add History
          </Button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
          Loading career progression history…
        </div>
      ) : view === "table" ? (
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
                  </>
                )}
                {(allowEdit || allowDelete || isAdmin) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visibleEntries.length ? (
                visibleEntries.map((row) => (
                  <tr
                    key={`${row.empno}-${row.effdate}`}
                    className={row.is_deleted ? "inactive-row" : ""}
                  >
                    <td className="code-cell">{row.effdate}</td>
                    <td>
                      <b className="record-name">{row.job || `${row.jobcode} — ${row.jobdesc || ""}`}</b>
                    </td>
                    <td>{row.department || `${row.deptcode} — ${row.deptname || ""}`}</td>
                    <td>
                      <b className="salary-value">
                        {canViewSalary
                          ? row.formattedSalary || (row.salary !== undefined ? `$${row.salary.toLocaleString()}` : "—")
                          : "Restricted"}
                      </b>
                    </td>
                    {isAdmin && (
                      <>
                        <td>
                          <Badge kind={row.is_deleted ? "inactive" : "active"}>
                            {row.is_deleted ? "Inactive" : "Active"}
                          </Badge>
                        </td>
                        <td>
                          <Stamp
                            action={row.stampAction || (row.is_deleted ? "DELETED" : "EDITED")}
                            user={row.stampUser || "system"}
                            date={row.stampDate || ""}
                          />
                        </td>
                      </>
                    )}
                    {(allowEdit || allowDelete || isAdmin) && (
                      <td>
                        <div className="row-actions">
                          {row.is_deleted ? (
                            allowEdit && (
                              <button
                                className="success-link"
                                disabled={restoringEffDate === row.effdate}
                                onClick={() => handleRestoreMilestone(row)}
                              >
                                {restoringEffDate === row.effdate ? "Restoring…" : "Restore"}
                              </button>
                            )
                          ) : (
                            <>
                              {allowEdit && (
                                <button onClick={() => setFormEntry(row)}>
                                  Edit
                                </button>
                              )}
                              {allowDelete && (
                                <button
                                  className="danger-link"
                                  onClick={() => setDeletingHistory(row)}
                                >
                                  Delete
                                </button>
                              )}
                              {!allowEdit && !allowDelete && (
                                <span style={{ color: "var(--muted, #64748b)", fontSize: "0.85rem" }}>
                                  Read-Only
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
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
                    No job history entries found for {empno}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="career-timeline">
          {visibleEntries.length ? (
            visibleEntries.map((row, index) => {
              const isLatest = index === 0 && !row.is_deleted
              return (
                <article
                  key={`${row.empno}-${row.effdate}`}
                  className={`timeline-item ${isLatest ? "is-latest" : ""} ${row.is_deleted ? "inactive-timeline-item" : ""}`}
                >
                  <div className="timeline-rail" aria-hidden="true">
                    <span className="timeline-node">{index + 1}</span>
                  </div>
                  <div className={`timeline-card ${isLatest ? "is-latest" : ""}`}>
                    <div className="timeline-card-head">
                      <span className="timeline-date">{row.effdate}</span>
                      <span className={`timeline-badge ${isLatest ? "latest" : ""}`}>
                        {row.is_deleted
                          ? "Inactive"
                          : isLatest
                          ? "Latest assignment"
                          : "Career progression"}
                      </span>
                    </div>
                    <div className="timeline-card-body">
                      <div className="timeline-role">
                        <b>{row.job || `${row.jobcode} — ${row.jobdesc || ""}`}</b>
                        <span>{row.department || `${row.deptcode} — ${row.deptname || ""}`}</span>
                      </div>
                      <div className="timeline-salary">
                        <small>Annual salary</small>
                        <b className="salary-value">
                          {canViewSalary
                            ? row.formattedSalary || (row.salary !== undefined ? `$${row.salary?.toLocaleString()}` : "—")
                            : "Restricted"}
                        </b>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })
          ) : (
            <div className="timeline-empty">
              No job history entries found for {employee.empno}.
            </div>
          )}
        </div>
      )}

      {formEntry && (
        <HistoryFormModal
          employee={employee}
          entry={formEntry === "new" ? null : formEntry}
          jobs={jobs}
          departments={departments}
          existingEffDates={existingEffDates}
          close={() => setFormEntry(null)}
          onSave={handleSaveMilestone}
        />
      )}

      {deletingHistory && (
        <ConfirmDeleteModal
          noun="Job History Milestone"
          title="Deactivate Job History Entry?"
          targetLabel={`${deletingHistory.job || deletingHistory.jobcode} (${deletingHistory.effdate})`}
          warningMessage="Are you sure you want to deactivate this career milestone? This record will be soft-deleted (archived) and marked Inactive."
          actionLabel="Deactivate History"
          operator={operatorName}
          loading={deleteLoading}
          isDeleting={deleteLoading}
          onConfirm={confirmSoftDelete}
          onClose={() => setDeletingHistory(null)}
          close={() => setDeletingHistory(null)}
        />
      )}
    </ModalShell>
  )
}
