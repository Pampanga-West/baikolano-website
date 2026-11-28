import { useEffect, useMemo, useState } from "react"
import Badge from "../components/Badge"
import Button from "../components/Button"
import EmptyState from "../components/EmptyState"
import Icon from "../components/Icon"
import ModalShell from "../components/ModalShell"
import Stamp from "../components/Stamp"
import { auditApi, type AuditLogItem } from "../lib/api"

function formatAuditTimestamp(isoString: string): string {
  if (!isoString) return "—"
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return isoString
  }
}

function formatAuditDetail(log: AuditLogItem): string {
  const table = (log.table_name || "").toLowerCase()
  const action = (log.action || "").toUpperCase()
  const key = log.record_key || ""

  if (table === "customer") {
    if (action === "DELETE") return `Customer ${key} marked as Inactive (soft-deleted)`
    if (action === "DELETE_BLOCKED") return `Deactivation of customer ${key} blocked by referential integrity guard`
    if (action === "RESTORE") return `Customer ${key} restored to Active status`
    if (action === "ADD" || action === "CREATE") return `New customer ${key} added to master ledger`
    if (action === "EDIT" || action === "UPDATE") return `Customer ${key} master details modified`
  }
  if (table === "sales") {
    if (action === "DELETE") return `Sales order ${key} marked as Inactive (soft-deleted)`
    if (action === "RESTORE") return `Sales order ${key} restored to Active status`
    if (action === "ADD" || action === "CREATE") {
      const tot = log.new_values?.total_amount ? ` total $${Number(log.new_values.total_amount).toFixed(2)}` : ""
      return `Sales order ${key} created${tot}`
    }
  }
  if (table === "salesdetail") {
    if (action === "ADD" || action === "CREATE") return `Line item added to sales transaction ${key}`
    if (action === "DELETE") return `Line item ${key} removed from sales transaction`
    if (action === "EDIT" || action === "UPDATE") return `Line item ${key} modified`
  }
  if (table === "payment") {
    if (action === "ADD" || action === "CREATE") {
      const amt = log.new_values?.amount ? ` $${Number(log.new_values.amount).toFixed(2)}` : ""
      const t = log.new_values?.transno ? ` for ${log.new_values.transno}` : ""
      return `Payment receipt ${key}${amt} recorded${t}`
    }
    if (action === "DELETE") return `Payment receipt ${key} voided (soft-deleted)`
    if (action === "RESTORE") return `Payment receipt ${key} restored to Active`
  }
  if (table === "product") {
    if (action === "DELETE") return `Product ${key} marked as Inactive (soft-deleted)`
    if (action === "DELETE_BLOCKED") return `Deactivation of product ${key} blocked: active orders/pricing exist`
    if (action === "RESTORE") return `Product ${key} restored to Active catalog`
    if (action === "ADD" || action === "CREATE") return `Product ${key} added to catalog`
    if (action === "EDIT" || action === "UPDATE") return `Product ${key} details updated`
  }
  if (table === "pricehist") {
    if (action === "ADD" || action === "CREATE") return `Price history schedule added for SKU ${key}`
    if (action === "DELETE") return `Price schedule ${key} soft-deleted`
    if (action === "RESTORE") return `Price schedule ${key} restored`
  }
  if (table === "user_permission") {
    const rightsCount = Array.isArray(log.new_values?.rights) ? log.new_values.rights.length : null
    if (rightsCount !== null) return `User permissions updated (${rightsCount} rights granted)`
    return `User permissions updated for user ${key}`
  }
  if (table === "app_user") {
    if (action === "ADD") return `New user account registered (${key})`
    if (action === "PROFILE_UPDATE" || action === "PROFILE_AND_PASSWORD_UPDATE") return `User profile modified (${key})`
    if (action === "EDIT" && log.new_values?.approval_status === "APPROVED") return `Pending user account approved (${key})`
    if (action === "EDIT" && log.new_values?.blocked !== undefined) {
      return log.new_values.blocked ? `User account blocked (${key})` : `User account unblocked (${key})`
    }
    if (action === "EDIT" && log.new_values?.role) return `User role changed to ${log.new_values.role} (${key})`
  }
  if (table === "password_reset_request") {
    return `Security password reset requested for ${key}`
  }
  if (table === "employee") {
    if (action === "ADD" || action === "CREATE") return `Employee record ${key} created`
    if (action === "DELETE") return `Employee ${key} separated/deactivated`
    if (action === "RESTORE") return `Employee ${key} restored to active roster`
    if (action === "EDIT" || action === "UPDATE") return `Employee ${key} profile updated`
  }
  if (table === "job" || table === "department" || table === "jobhistory") {
    return `${table.toUpperCase()} record ${key} ${action.toLowerCase()}d`
  }

  // Fallback
  if (log.new_values?.stamp) return String(log.new_values.stamp)
  return `${table ? table.toUpperCase() + " " : ""}${key} ${action.toLowerCase()} by ${log.action_by || "system"}`
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Options populated from live backend
  const [availableTables, setAvailableTables] = useState<string[]>([])
  const [availableActions, setAvailableActions] = useState<string[]>([])
  const [availableUsers, setAvailableUsers] = useState<string[]>([])

  // Filter States
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedUser, setSelectedUser] = useState("ALL")
  const [selectedTable, setSelectedTable] = useState("ALL")
  const [selectedAction, setSelectedAction] = useState("ALL")
  const [query, setQuery] = useState("")

  // Inspect Modal State
  const [selectedEntry, setSelectedEntry] = useState<AuditLogItem | null>(null)

  const loadAuditLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await auditApi.list({
        from: dateFrom || undefined,
        to: dateTo || undefined,
        user: selectedUser !== "ALL" ? selectedUser : undefined,
        table: selectedTable !== "ALL" ? selectedTable : undefined,
        action: selectedAction !== "ALL" ? selectedAction : undefined,
        search: query || undefined,
      })

      setLogs(res.logs || [])
      setTotalCount(res.total || 0)
      if (res.tables?.length) setAvailableTables(res.tables)
      if (res.actions?.length) setAvailableActions(res.actions)
      if (res.users?.length) setAvailableUsers(res.users)
    } catch (err: any) {
      setError(err.message || "Failed to load live audit log entries from Supabase.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAuditLogs()
  }, [dateFrom, dateTo, selectedUser, selectedTable, selectedAction, query])

  const handleClearFilters = () => {
    setDateFrom("")
    setDateTo("")
    setSelectedUser("ALL")
    setSelectedTable("ALL")
    setSelectedAction("ALL")
    setQuery("")
  }

  return (
    <div className="page audit-page">
      <div className="page-heading">
        <div>
          <span>System governance / Superadmin</span>
          <div className="page-title">Audit Log</div>
          <p>
            An immutable chronological trail across records and permission
            changes directly connected to Supabase.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button
            variant="secondary"
            onClick={loadAuditLogs}
            disabled={loading}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="refresh" size={14} />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </Button>
          <div className="live-ledger">
            <i></i>
            <span>
              <b>Live ledger</b>
              {loading ? "Syncing..." : `${totalCount} records`}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="alert-banner alert-banner-error"
          style={{
            margin: "12px 0",
            padding: "10px 14px",
            background: "var(--danger-bg)",
            color: "var(--danger-text)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="alert-triangle" size={16} />
            <span>{error}</span>
          </div>
          <button
            className="alert-close"
            onClick={() => setError(null)}
            style={{ background: "none", border: 0, cursor: "pointer", fontSize: 16 }}
          >
            ×
          </button>
        </div>
      )}

      <div className="audit-filters">
        <label>
          <span>Date From</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label>
          <span>Date To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        <label>
          <span>User / Actor</span>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="ALL">All users</option>
            {availableUsers.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Module / Table</span>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
          >
            <option value="ALL">All modules</option>
            {availableTables.map((t) => (
              <option key={t} value={t}>
                {t.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Action Type</span>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
          >
            <option value="ALL">All actions</option>
            {availableActions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="audit-search">
          <span>Search trail</span>
          <div>
            <Icon name="search" size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Record, user, detail..."
            />
          </div>
        </label>
      </div>

      <section className="audit-ledger">
        <div className="audit-ledger-head">
          <span>{logs.length} events in current view</span>
          <span>Newest first · timestamps shown in local time · Click row to inspect payload</span>
        </div>
        {loading && logs.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--muted)" }}>
            <p>Loading immutable audit records from Supabase...</p>
          </div>
        ) : logs.length > 0 ? (
          logs.map((row, index) => {
            const actorName = row.action_by || "system"
            const initials = (actorName.slice(0, 2) || "SY").toUpperCase()
            const timeFormatted = formatAuditTimestamp(row.action_at)
            const detailText = formatAuditDetail(row)
            const actionKind =
              row.action === "DELETE" || row.action === "DELETE_BLOCKED"
                ? "blocked"
                : row.action === "CREATED" || row.action === "ADD" || row.action === "RESTORE"
                ? "active"
                : row.action === "PASSWORD_RESET_REQUEST"
                ? "admin"
                : "pending"

            return (
              <article
                className="audit-entry"
                key={row.audit_id || `${row.action_at}-${row.record_key}-${index}`}
                onClick={() => setSelectedEntry(row)}
                style={{ cursor: "pointer" }}
                title="Click to inspect event payload and values"
              >
                <div className="audit-sequence">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="audit-time">{timeFormatted}</div>
                <div className="audit-actor">
                  <span>{initials}</span>
                  <b title={actorName}>{actorName}</b>
                </div>
                <div className="audit-record">
                  <small>{(row.table_name || "").toUpperCase()}</small>
                  <b title={row.record_key}>{row.record_key}</b>
                </div>
                <div>
                  <Badge kind={actionKind}>{row.action}</Badge>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <p style={{ margin: 0 }}>{detailText}</p>
                  <button
                    type="button"
                    className="icon-button"
                    title="Inspect JSON values"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedEntry(row)
                    }}
                    style={{ color: "var(--muted)", opacity: 0.7 }}
                  >
                    <Icon name="search" size={13} />
                  </button>
                </div>
              </article>
            )
          })
        ) : (
          <EmptyState
            query={query}
            title={query ? "No matching audit events" : "No audit events found"}
            message={
              query
                ? `Nothing matches "${query}". Try searching with a different record code, user, or action keyword.`
                : "There are no audit events recorded matching the selected filter criteria."
            }
            onClear={handleClearFilters}
          />
        )}
      </section>

      <div className="audit-integrity">
        <Icon name="shield" />
        <span>
          <b>Audit integrity enabled</b>
          Entries are append-only and cannot be edited or deleted through this interface. Immutable audit logging backed by Supabase.
        </span>
        <Stamp action="LIVE" user="supabase" date="audit_log" />
      </div>

      {/* Inspect Event Payload Modal */}
      {selectedEntry && (
        <ModalShell
          title={`Audit Event #${selectedEntry.audit_id}`}
          subtitle={`${(selectedEntry.table_name || "").toUpperCase()} · Record Key: ${selectedEntry.record_key} · ${formatAuditTimestamp(selectedEntry.action_at)}`}
          wide
          close={() => setSelectedEntry(null)}
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setSelectedEntry(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 12,
                padding: "12px 14px",
                background: "var(--surface)",
                borderRadius: 8,
                border: "1px solid var(--border)",
              }}
            >
              <div>
                <small style={{ color: "var(--muted)", display: "block", fontSize: 10, fontWeight: 700 }}>
                  ACTION
                </small>
                <Badge
                  kind={
                    selectedEntry.action === "DELETE" || selectedEntry.action === "DELETE_BLOCKED"
                      ? "blocked"
                      : selectedEntry.action === "CREATED" || selectedEntry.action === "ADD" || selectedEntry.action === "RESTORE"
                      ? "active"
                      : "pending"
                  }
                >
                  {selectedEntry.action}
                </Badge>
              </div>
              <div>
                <small style={{ color: "var(--muted)", display: "block", fontSize: 10, fontWeight: 700 }}>
                  TABLE / MODULE
                </small>
                <b>{(selectedEntry.table_name || "").toUpperCase()}</b>
              </div>
              <div>
                <small style={{ color: "var(--muted)", display: "block", fontSize: 10, fontWeight: 700 }}>
                  RECORD KEY
                </small>
                <code style={{ background: "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: 4 }}>
                  {selectedEntry.record_key}
                </code>
              </div>
              <div>
                <small style={{ color: "var(--muted)", display: "block", fontSize: 10, fontWeight: 700 }}>
                  ACTOR
                </small>
                <b title={selectedEntry.action_by}>{selectedEntry.action_by}</b>
              </div>
              <div>
                <small style={{ color: "var(--muted)", display: "block", fontSize: 10, fontWeight: 700 }}>
                  TIMESTAMP (UTC)
                </small>
                <span style={{ fontSize: 11 }}>{selectedEntry.action_at}</span>
              </div>
            </div>

            <div>
              <small style={{ color: "var(--muted)", display: "block", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
                EVENT SUMMARY
              </small>
              <p style={{ margin: 0, padding: "8px 12px", background: "var(--surface)", borderRadius: 6, fontSize: 12 }}>
                {formatAuditDetail(selectedEntry)}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <b style={{ fontSize: 12 }}>Previous Values (old_values)</b>
                  {!selectedEntry.old_values && (
                    <span style={{ fontSize: 10, color: "var(--muted)" }}>None (Creation/Add)</span>
                  )}
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                    maxHeight: 240,
                    overflowY: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {selectedEntry.old_values
                    ? JSON.stringify(selectedEntry.old_values, null, 2)
                    : "// No prior values recorded"}
                </pre>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <b style={{ fontSize: 12 }}>Recorded Values (new_values)</b>
                  {!selectedEntry.new_values && (
                    <span style={{ fontSize: 10, color: "var(--muted)" }}>None (Deletion)</span>
                  )}
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                    maxHeight: 240,
                    overflowY: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {selectedEntry.new_values
                    ? JSON.stringify(selectedEntry.new_values, null, 2)
                    : "// No new values recorded"}
                </pre>
              </div>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
