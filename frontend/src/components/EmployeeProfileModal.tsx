import { useEffect, useMemo, useState } from "react"
import Badge from "./Badge"
import Button from "./Button"
import Icon from "./Icon"
import ModalShell from "./ModalShell"
import Stamp from "./Stamp"
import { jobHistoryApi } from "../lib/api"
import { formatMoney, parseStamp } from "../backend/supabaseClient"
import type { JobHistoryRecord, Role } from "../lib/types"

export interface EmployeeProfileModalProps {
  role: Role
  employee: string[]
  canViewSalary?: boolean
  canEditEmployee?: boolean
  canManageHistory?: boolean
  close: () => void
  onOpenEdit?: () => void
  onOpenHistory?: () => void
}

export default function EmployeeProfileModal({
  role,
  employee,
  canViewSalary = true,
  canEditEmployee = false,
  canManageHistory = false,
  close,
  onOpenEdit,
  onOpenHistory,
}: EmployeeProfileModalProps) {
  const isAdmin = role !== "User"
  const [historyEntries, setHistoryEntries] = useState<JobHistoryRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  const empno = employee[0]
  const lastname = employee[1]
  const firstname = employee[2]
  const gender = employee[3]
  const birthdate = employee[4]
  const hiredate = employee[5]
  const sepdate = employee[6] === "—" || employee[6] === "â€”" ? null : employee[6]
  const status = employee[7]
  const stampAction = employee[8]
  const stampUser = employee[9]
  const stampDate = employee[10]
  const currentDept = employee[11] || "—"
  const currentJob = employee[12] || "—"

  // Load career history milestones for the timeline
  useEffect(() => {
    let active = true
    if (!canViewSalary) {
      setLoadingHistory(false)
      setHistoryEntries([])
      return
    }
    setLoadingHistory(true)
    jobHistoryApi
      .listHistory(empno)
      .then((data) => {
        if (!active) return
        setHistoryEntries(data || [])
      })
      .catch(() => {
        if (!active) return
        // Fallback for seed employee E-001 in offline prototype mode
        if (canViewSalary && empno === "E-001") {
          setHistoryEntries([
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
        } else {
          setHistoryEntries([])
        }
      })
      .finally(() => {
        if (active) setLoadingHistory(false)
      })
    return () => {
      active = false
    }
  }, [empno, canViewSalary])

  // Filter history: standard users see only active milestones
  const visibleHistory = useMemo(() => {
    const list = historyEntries.filter((h) => isAdmin || !h.is_deleted)
    // Sort descending by effective date
    return list.sort((a, b) => b.effdate.localeCompare(a.effdate))
  }, [historyEntries, isAdmin])

  // Calculate tenure
  const tenureText = useMemo(() => {
    if (!hiredate || hiredate === "—") return "—"
    try {
      const start = new Date(hiredate)
      const end = sepdate ? new Date(sepdate) : new Date()
      let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
      if (months < 0) months = 0
      const years = Math.floor(months / 12)
      const remMonths = months % 12
      if (years === 0) return `${remMonths} mo${remMonths === 1 ? "" : "s"}`
      if (remMonths === 0) return `${years} yr${years === 1 ? "" : "s"}`
      return `${years} yr${years === 1 ? "" : "s"}, ${remMonths} mo${remMonths === 1 ? "" : "s"}`
    } catch {
      return "—"
    }
  }, [hiredate, sepdate])

  // Calculate age
  const ageText = useMemo(() => {
    if (!birthdate || birthdate === "—") return "—"
    try {
      const birth = new Date(birthdate)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const m = today.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      return `${age} yrs`
    } catch {
      return "—"
    }
  }, [birthdate])

  // Calculate compensation progression delta
  const compensationDelta = useMemo(() => {
    if (!canViewSalary || visibleHistory.length < 2) return null
    // Chronological order: earliest is last element, latest is first element
    const latest = visibleHistory[0]
    const baseline = visibleHistory[visibleHistory.length - 1]
    const diff = latest.salary - baseline.salary
    if (diff === 0) return null
    const pct = baseline.salary > 0 ? ((diff / baseline.salary) * 100).toFixed(1) : "0"
    const sign = diff > 0 ? "+" : ""
    return {
      diff,
      sign,
      formattedDiff: `${sign}${formatMoney(diff)}`,
      pct: `${sign}${pct}%`,
    }
  }, [visibleHistory, canViewSalary])

  // Current active salary
  const currentSalaryFormatted = useMemo(() => {
    if (!canViewSalary) {
      return "Restricted · Salary Hidden"
    }
    if (visibleHistory.length > 0) {
      return formatMoney(visibleHistory[0].salary)
    }
    return "—"
  }, [visibleHistory, canViewSalary])

  const initials = `${firstname.charAt(0)}${lastname.charAt(0)}`.toUpperCase()

  return (
    <ModalShell
      title={`Employee Profile — ${empno}`}
      subtitle="Workforce profile, organizational placement, and career progression timeline."
      close={close}
      wide
      className="employee-profile-modal"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <div>
            {canManageHistory && onOpenHistory && (
              <Button variant="secondary" icon="briefcase" onClick={onOpenHistory}>
                Job History Sub-Ledger
              </Button>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {canEditEmployee && onOpenEdit && (
              <Button variant="secondary" icon="edit" onClick={onOpenEdit}>
                Edit Profile
              </Button>
            )}
            <Button onClick={close}>Close Profile</Button>
          </div>
        </div>
      }
    >
      <div className="profile-container" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Top Header Card */}
        <div
          className="profile-hero-card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.5rem",
            padding: "1.25rem 1.5rem",
            background: "var(--card-bg, #ffffff)",
            border: "1px solid var(--border-color, #e2e8f0)",
            borderRadius: "0.5rem",
          }}
        >
          <div
            className="profile-avatar"
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--primary, #2563eb), #4f46e5)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700 }}>
                {firstname} {lastname}
              </h2>
              <span className="code-cell" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                {empno}
              </span>
              <Badge kind={status.toLowerCase()}>{status}</Badge>
            </div>
            <div style={{ color: "var(--muted, #64748b)", fontSize: "0.95rem" }}>
              <b>{currentJob}</b> · <span>{currentDept}</span>
            </div>
          </div>
          <div style={{ textAlign: "right", borderLeft: "1px solid var(--border-color, #e2e8f0)", paddingLeft: "1.5rem" }}>
            <small style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.75rem", textTransform: "uppercase" }}>
              Tenure
            </small>
            <b style={{ fontSize: "1.1rem", color: "var(--primary, #2563eb)" }}>{tenureText}</b>
          </div>
        </div>

        {/* Salary Notice Banner if Restricted (TC-HR-PERM-01) */}
        {!canViewSalary && (
          <div
            className="salary-restricted-banner"
            style={{
              padding: "0.75rem 1rem",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "0.375rem",
              color: "#1e40af",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Icon name="lock" size={16} />
            <span>
              <b>Confidentiality Notice:</b> Salary figures and career compensation deltas are restricted for your current access tier (requires <i>View Job History</i> right).
            </span>
          </div>
        )}

        {/* Summary Metric Stats */}
        <div
          className="profile-metrics-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
          }}
        >
          <div
            style={{
              padding: "1rem",
              background: "var(--bg-subtle, #f8fafc)",
              border: "1px solid var(--border-color, #e2e8f0)",
              borderRadius: "0.375rem",
            }}
          >
            <small style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.75rem", textTransform: "uppercase" }}>
              Current Compensation
            </small>
            <b
              className="salary-value"
              style={{
                fontSize: "1.15rem",
                color: canViewSalary ? "var(--primary, #2563eb)" : "var(--muted, #64748b)",
                marginTop: "0.25rem",
                display: "block",
              }}
            >
              {currentSalaryFormatted}
            </b>
            {compensationDelta && (
              <small style={{ color: "#16a34a", fontWeight: 600, fontSize: "0.8rem" }}>
                {compensationDelta.formattedDiff} ({compensationDelta.pct}) overall growth
              </small>
            )}
          </div>

          <div
            style={{
              padding: "1rem",
              background: "var(--bg-subtle, #f8fafc)",
              border: "1px solid var(--border-color, #e2e8f0)",
              borderRadius: "0.375rem",
            }}
          >
            <small style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.75rem", textTransform: "uppercase" }}>
              Career Milestones
            </small>
            <b style={{ fontSize: "1.15rem", marginTop: "0.25rem", display: "block" }}>
              {visibleHistory.length} Recorded Assignment{visibleHistory.length === 1 ? "" : "s"}
            </b>
            <small style={{ color: "var(--muted, #64748b)", fontSize: "0.8rem" }}>
              Promotions & transfers ledger
            </small>
          </div>

          <div
            style={{
              padding: "1rem",
              background: "var(--bg-subtle, #f8fafc)",
              border: "1px solid var(--border-color, #e2e8f0)",
              borderRadius: "0.375rem",
            }}
          >
            <small style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.75rem", textTransform: "uppercase" }}>
              Hire Date
            </small>
            <b style={{ fontSize: "1.15rem", marginTop: "0.25rem", display: "block" }}>
              {hiredate}
            </b>
            <small style={{ color: "var(--muted, #64748b)", fontSize: "0.8rem" }}>
              {sepdate ? `Separated: ${sepdate}` : "Currently active tenure"}
            </small>
          </div>

          <div
            style={{
              padding: "1rem",
              background: "var(--bg-subtle, #f8fafc)",
              border: "1px solid var(--border-color, #e2e8f0)",
              borderRadius: "0.375rem",
            }}
          >
            <small style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.75rem", textTransform: "uppercase" }}>
              Last Provenance Stamp
            </small>
            <div style={{ marginTop: "0.25rem" }}>
              <Stamp action={stampAction} user={stampUser} date={stampDate} />
            </div>
          </div>
        </div>

        {/* Two-Column Grid: Details & Timeline */}
        <div
          className="profile-content-split"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.6fr",
            gap: "1.5rem",
            alignItems: "start",
          }}
        >
          {/* Left Column: Personal Demographics & Administrative Specs */}
          <div
            className="profile-details-card"
            style={{
              background: "var(--card-bg, #ffffff)",
              border: "1px solid var(--border-color, #e2e8f0)",
              borderRadius: "0.5rem",
              padding: "1.25rem",
            }}
          >
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: 700, borderBottom: "1px solid var(--border-color, #e2e8f0)", paddingBottom: "0.5rem" }}>
              Demographic & Contract Details
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
              <div>
                <span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.75rem" }}>Gender</span>
                <b>{gender === "M" ? "Male (M)" : gender === "F" ? "Female (F)" : gender}</b>
              </div>

              <div>
                <span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.75rem" }}>Date of Birth</span>
                <b>{birthdate}</b> <span style={{ color: "var(--muted, #64748b)" }}>({ageText})</span>
              </div>

              <div>
                <span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.75rem" }}>Hire Date</span>
                <b>{hiredate}</b>
              </div>

              <div>
                <span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.75rem" }}>Separation Date</span>
                <b>{sepdate || "— (Active Employment)"}</b>
              </div>

              <div>
                <span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.75rem" }}>Department Assignment</span>
                <b>{currentDept}</b>
              </div>

              <div>
                <span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.75rem" }}>Job Title & Role</span>
                <b>{currentJob}</b>
              </div>

              <div>
                <span style={{ color: "var(--muted, #64748b)", display: "block", fontSize: "0.75rem" }}>Employment Status</span>
                <Badge kind={status.toLowerCase()}>{status}</Badge>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Career Progression Timeline */}
          <div
            className="profile-timeline-card"
            style={{
              background: "var(--card-bg, #ffffff)",
              border: "1px solid var(--border-color, #e2e8f0)",
              borderRadius: "0.5rem",
              padding: "1.25rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid var(--border-color, #e2e8f0)", paddingBottom: "0.5rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                Career Progression Timeline
              </h3>
              <small style={{ color: "var(--muted, #64748b)" }}>Chronological Milestones</small>
            </div>

            {!canViewSalary ? (
              <div
                style={{
                  padding: "2.5rem 1rem",
                  textAlign: "center",
                  background: "var(--bg-subtle, #f8fafc)",
                  borderRadius: "0.375rem",
                  border: "1px dashed var(--border-color, #e2e8f0)",
                }}
              >
                <div style={{ display: "inline-flex", padding: "0.75rem", borderRadius: "9999px", background: "rgba(239, 68, 68, 0.1)", color: "var(--danger, #dc2626)", marginBottom: "0.75rem" }}>
                  <Icon name="lock" size={24} />
                </div>
                <b style={{ display: "block", color: "var(--color-primary-text, #0f172a)", marginBottom: "0.25rem" }}>
                  Career Progression Timeline Restricted
                </b>
                <small style={{ color: "var(--muted, #64748b)", display: "block", maxWidth: "340px", margin: "0 auto" }}>
                  Detailed historical milestones and salary figures are restricted under your current access tier (requires <i>View Job History</i> right).
                </small>
              </div>
            ) : loadingHistory ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
                Loading career progression timeline…
              </div>
            ) : visibleHistory.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
                No career milestones recorded for {empno}.
              </div>
            ) : (
              <div className="career-timeline">
                {visibleHistory.map((row, index) => {
                  const isCurrent = index === 0 && !row.is_deleted
                  // Prior milestone in chronological order is next index in descending list
                  const prior = visibleHistory[index + 1]
                  let stepDelta: string | null = null
                  if (canViewSalary && prior && row.salary !== prior.salary) {
                    const stepDiff = row.salary - prior.salary
                    const stepSign = stepDiff > 0 ? "+" : ""
                    const stepPct = prior.salary > 0 ? ((stepDiff / prior.salary) * 100).toFixed(1) : "0"
                    stepDelta = `${stepSign}${formatMoney(stepDiff)} (${stepSign}${stepPct}%)`
                  }

                  return (
                    <article
                      key={`${row.empno}-${row.effdate}`}
                      className={`${isCurrent ? "current-tier" : ""} ${row.is_deleted ? "inactive-timeline-item" : ""}`}
                      style={{
                        position: "relative",
                        paddingBottom: "1.25rem",
                      }}
                    >
                      <div className="timeline-rail">
                        <span>{index + 1}</span>
                      </div>

                      <div className="timeline-date">
                        <b>{row.effdate}</b>
                        <small style={{ display: "block" }}>
                          {isCurrent ? "Current Active Tier" : index === visibleHistory.length - 1 ? "Initial Placement" : "Career Progression"}
                        </small>
                      </div>

                      <div className="timeline-role">
                        <b>{row.job || `${row.jobcode} — ${row.jobdesc || ""}`}</b>
                        <span>{row.department || `${row.deptcode} — ${row.deptname || ""}`}</span>
                      </div>

                      <div className="timeline-salary">
                        <small>Annual Compensation</small>
                        <b className="salary-value">
                          {canViewSalary ? row.formattedSalary || formatMoney(row.salary) : "Restricted"}
                        </b>
                        {stepDelta && (
                          <small style={{ color: "#16a34a", fontWeight: 600, display: "block" }}>
                            {stepDelta}
                          </small>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalShell>
  )
}
