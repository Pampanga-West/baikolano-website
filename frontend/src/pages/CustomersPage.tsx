import { useEffect, useMemo, useState } from "react"
import { fetchTableRowsFromSupabase, parseStamp } from "../backend/supabaseClient"
import Badge from "../components/Badge"
import BlockedDeleteModal from "../components/BlockedDeleteModal"
import Button from "../components/Button"
import ConfirmDeleteModal from "../components/ConfirmDeleteModal"
import EmptyState from "../components/EmptyState"
import EntityControls from "../components/EntityControls"
import ModalShell from "../components/ModalShell"
import Stamp from "../components/Stamp"
import type { Role } from "../lib/types"

const fallbackCustomers = [
  [
    "C-001",
    "Acme Corporation",
    "123 Main St, Metro City",
    "Net 30",
    "Active",
    "CREATED",
    "system",
    "2026-10-01 9:00 AM",
  ],
  [
    "C-002",
    "Globex Industries",
    "456 Oak Ave, Harbor Town",
    "Net 45",
    "Active",
    "CREATED",
    "system",
    "2026-10-02 10:15 AM",
  ],
  [
    "C-003",
    "Initech LLC",
    "789 Pine Rd, Silicon Valley",
    "COD",
    "Active",
    "EDITED",
    "user1",
    "2026-10-13 1:01 PM",
  ],
  [
    "C-004",
    "Umbrella Corp",
    "1 Raccoon City Blvd",
    "Prepaid",
    "Inactive",
    "DELETED",
    "user2",
    "2026-10-13 1:01 PM",
  ],
  [
    "C-005",
    "Stark Enterprises",
    "200 Park Avenue, New York",
    "Net 15",
    "Active",
    "EDITED",
    "user1",
    "2026-10-13 1:01 PM",
  ],
]

function CustomerForm({
  customer,
  close,
  onSave,
  existingCustNos = [],
}: {
  customer?: string[]
  close: () => void
  onSave: (data: {
    custNo: string
    custName: string
    address: string
    payTerm: string
  }) => void
  existingCustNos?: string[]
}) {
  const isEditing = Boolean(customer)
  const defaultNo = useMemo(() => {
    if (customer?.[0]) return customer[0]
    const numbers = existingCustNos
      .map((n) => {
        const m = n.match(/C-(\d+)/i)
        return m ? parseInt(m[1], 10) : 0
      })
      .filter((n) => !isNaN(n))
    const maxNum = numbers.length ? Math.max(...numbers) : 5
    return `C-${String(maxNum + 1).padStart(3, "0")}`
  }, [customer, existingCustNos])

  const [custNo, setCustNo] = useState(customer?.[0] ?? defaultNo)
  const [custName, setCustName] = useState(customer?.[1] ?? "")
  const [address, setAddress] = useState(customer?.[2] ?? "")
  const [payTermSelect, setPayTermSelect] = useState(
    ["Net 15", "Net 30", "Net 45", "Net 60", "COD", "Prepaid"].includes(
      customer?.[3] ?? "Net 30"
    )
      ? customer?.[3] ?? "Net 30"
      : "Custom"
  )
  const [customPayTerm, setCustomPayTerm] = useState(
    ["Net 15", "Net 30", "Net 45", "Net 60", "COD", "Prepaid"].includes(
      customer?.[3] ?? "Net 30"
    )
      ? ""
      : customer?.[3] ?? ""
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!custNo.trim()) {
      setValidationError("Customer No. is required.")
      return
    }
    if (!custName.trim()) {
      setValidationError("Customer Name is required.")
      return
    }
    if (
      !isEditing &&
      existingCustNos.some(
        (no) => no.toLowerCase() === custNo.trim().toLowerCase()
      )
    ) {
      setValidationError(`Customer No. "${custNo.trim()}" already exists.`)
      return
    }

    const resolvedPayTerm =
      payTermSelect === "Custom"
        ? customPayTerm.trim() || "Net 30"
        : payTermSelect

    onSave({
      custNo: custNo.trim(),
      custName: custName.trim(),
      address: address.trim(),
      payTerm: resolvedPayTerm,
    })
    close()
  }

  return (
    <ModalShell
      title={isEditing ? "Edit Customer" : "Add Customer"}
      subtitle={isEditing ? "Update customer details" : "Enter new customer details"}
      close={close}
      footer={
        <div className="modal-footer-duo">
          <Button
            className="btn-save-main"
            onClick={handleSubmit}
          >
            {isEditing ? "Save Changes" : "Save Customer"}
          </Button>
          <Button
            variant="secondary"
            className="btn-cancel-main"
            onClick={close}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="modal-form-vertical">
        {validationError && (
          <div
            className="validation-error"
            style={{
              fontSize: "12px",
              padding: "9px 12px",
              background: "var(--danger-bg)",
              color: "var(--danger-text)",
              borderRadius: "6px",
              fontWeight: 600,
            }}
          >
            {validationError}
          </div>
        )}
        <div className="field-group">
          <label>Customer No.</label>
          <input
            className="field-input"
            value={custNo}
            onChange={(e) => {
              setCustNo(e.target.value)
              setValidationError(null)
            }}
            placeholder="e.g. C-001"
            required
          />
        </div>
        <div className="field-group">
          <label>Customer Name</label>
          <input
            className="field-input"
            value={custName}
            onChange={(e) => {
              setCustName(e.target.value)
              setValidationError(null)
            }}
            placeholder="Company or person name"
            required
          />
        </div>
        <div className="field-group">
          <label>Address</label>
          <input
            className="field-input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Full address"
          />
        </div>
        <div className="field-group">
          <label>Payment Terms</label>
          <select
            className="field-input"
            value={payTermSelect}
            onChange={(e) => setPayTermSelect(e.target.value)}
          >
            <option value="Net 15">Net 15</option>
            <option value="Net 30">Net 30</option>
            <option value="Net 45">Net 45</option>
            <option value="Net 60">Net 60</option>
            <option value="COD">COD (Cash on Delivery)</option>
            <option value="Prepaid">Prepaid</option>
            <option value="Custom">Custom terms...</option>
          </select>
          {payTermSelect === "Custom" && (
            <input
              className="field-input"
              style={{ marginTop: "6px" }}
              value={customPayTerm}
              onChange={(e) => setCustomPayTerm(e.target.value)}
              placeholder="e.g. Net 30, COD, Prepaid"
              autoFocus
            />
          )}
        </div>
      </form>
    </ModalShell>
  )
}

export default function CustomersPage({ role }: { role: Role }) {
  const isAdmin = role !== "User"
  const [customers, setCustomers] = useState<string[][]>(fallbackCustomers)
  const [filter, setFilter] = useState("active")
  const [search, setSearch] = useState("")
  const [form, setForm] = useState<string[] | "new" | null>(null)
  const [deleting, setDeleting] = useState<string[] | null>(null)
  const [blocked, setBlocked] = useState<{ record: string; reason?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSaveCustomer = (data: {
    custNo: string
    custName: string
    address: string
    payTerm: string
  }) => {
    const isEditing = Boolean(form && form !== "new")
    const todayStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })

    if (isEditing && typeof form !== "string" && form) {
      const originalCustNo = form[0]
      setCustomers((prev) =>
        prev.map((c) =>
          c[0] === originalCustNo
            ? [
                data.custNo,
                data.custName,
                data.address,
                data.payTerm,
                c[4], // preserve existing Active/Inactive status
                "EDITED",
                "Phil Hitalia",
                todayStr,
              ]
            : c
        )
      )
      setSuccess(`Successfully updated customer ${data.custNo} (${data.custName}).`)
    } else {
      const newRow = [
        data.custNo,
        data.custName,
        data.address,
        data.payTerm,
        "Active",
        "CREATED",
        "Phil Hitalia",
        todayStr,
      ]
      setCustomers((prev) => [newRow, ...prev])
      setSuccess(`Successfully created customer ${data.custNo} (${data.custName}).`)
    }
    setForm(null)
  }

  const handleSoftDelete = (customerRow: string[]) => {
    const custNo = customerRow[0]
    const custName = customerRow[1]
    const label = `${custNo} ${custName}`

    // Referential integrity check: C-001 has active child sales orders
    if (custNo === "C-001") {
      setDeleting(null)
      setBlocked({
        record: label,
        reason:
          "Active child records reference this item. There are active sales orders managed by Eures Tinoco and Joe Roja linked to Acme Corporation. Remove, void, or reassign those records first. No changes were made, and this attempt remains logged in the audit trail.",
      })
      return
    }

    const todayStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })

    // Soft delete: update status to Inactive without purging from database
    setCustomers((prev) =>
      prev.map((c) =>
        c[0] === custNo
          ? [c[0], c[1], c[2], c[3], "Inactive", "DELETED", "Phil Hitalia", todayStr]
          : c
      )
    )
    setDeleting(null)
    setSuccess(`Soft-deleted ${label}. Record is marked as Inactive and remains restorable by administrators.`)
  }

  const handleRestore = (customerRow: string[]) => {
    const custNo = customerRow[0]
    const custName = customerRow[1]
    const label = `${custNo} ${custName}`
    const todayStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })

    // Restore: mark back to Active
    setCustomers((prev) =>
      prev.map((c) =>
        c[0] === custNo
          ? [c[0], c[1], c[2], c[3], "Active", "EDITED", "Phil Hitalia", todayStr]
          : c
      )
    )
    setSuccess(`Restored ${label}. Record is now Active and visible in standard operational views.`)
  }

  useEffect(() => {
    let active = true
    fetchTableRowsFromSupabase("customer", "custno.asc")
      .then((data) => {
        if (!active || !data.length) return
        const mapped = data.map((r) => {
          const isDeleted = Boolean(r.is_deleted)
          const [action, user, date] = parseStamp(r.stamp, isDeleted)
          return [
            String(r.custno ?? ""),
            String(r.custname ?? "—"),
            String(r.address ?? "—"),
            String(r.payterm ?? "—"),
            isDeleted ? "Inactive" : "Active",
            action,
            user,
            date,
          ]
        })
        setCustomers(mapped)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const counts = useMemo<[number, number, number]>(() => {
    const activeCount = customers.filter((r) => r[4] === "Active").length
    const inactiveCount = customers.filter((r) => r[4] === "Inactive").length
    return [activeCount, inactiveCount, customers.length]
  }, [customers])

  const rows = useMemo(
    () =>
      customers.filter((row) => {
        if (!isAdmin && row[4] === "Inactive") return false
        if (isAdmin && filter !== "all" && row[4].toLowerCase() !== filter)
          return false
        const q = search.trim().toLowerCase()
        if (!q) return true
        return `${row[0]} ${row[1]} ${row[2]} ${row[3]}`
          .toLowerCase()
          .includes(q)
      }),
    [customers, filter, isAdmin, search],
  )
  return (
    <div className="page module-page">
      <div className="page-heading">
        <div>
          <span>Master data / Customers</span>
          <div className="page-title">Customer Management</div>
          <p>Commercial identities, payment terms, and record provenance.</p>
        </div>
        <div className="module-count">
          <b>{String(isAdmin ? counts[2] : counts[0]).padStart(2, "0")}</b>
          <span>customer records</span>
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <div style={{ flex: 1 }}>
            <b>Customer Operation Error</b>
            <span>{error}</span>
          </div>
          <button className="dismiss-link" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="info-banner" role="status">
          <div style={{ flex: 1 }}>
            <b>Success</b>
            <span>{success}</span>
          </div>
          <button className="dismiss-link" onClick={() => setSuccess(null)}>
            Dismiss
          </button>
        </div>
      )}

      <EntityControls
        isAdmin={isAdmin}
        counts={counts}
        activeFilter={filter}
        onFilter={setFilter}
        search={search}
        onSearch={setSearch}
        placeholder="Search customers..."
        addLabel="Add Customer"
        onAdd={() => setForm("new")}
      />
      <section className="entity-table-shell">
        {rows.length ? (
          <div className="table-scroll">
            <table className="entity-table">
              <thead>
                <tr>
                  <th>Cust No</th>
                  <th>Customer Name</th>
                  <th>Address</th>
                  <th>Pay Terms</th>
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
                    className={row[4] === "Inactive" ? "inactive-row" : ""}
                    key={row[0]}
                  >
                    <td className="code-cell">{row[0]}</td>
                    <td>
                      <b className="record-name">{row[1]}</b>
                    </td>
                    <td>{row[2]}</td>
                    <td>{row[3]}</td>
                    {isAdmin && (
                      <>
                        <td>
                          <Badge kind={row[4]}>{row[4]}</Badge>
                        </td>
                        <td>
                          <Stamp action={row[5]} user={row[6]} date={row[7]} />
                        </td>
                        <td>
                          <div className="row-actions">
                            {row[4] === "Inactive" ? (
                              <button
                                className="success-link"
                                onClick={() => handleRestore(row)}
                              >
                                Restore
                              </button>
                            ) : (
                              <>
                                <button onClick={() => setForm(row)}>Edit</button>
                                <button
                                  className="danger-link"
                                  onClick={() => setDeleting(row)}
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
                ? "No matching customer records"
                : filter === "inactive"
                ? "No inactive customer records"
                : filter === "active"
                ? "No active customer records"
                : "No customer records"
            }
            message={
              search
                ? `Nothing matches "${search}". Try a different customer name, commercial code, or reset your search filters.`
                : filter === "inactive"
                ? "There are currently no soft-deleted or inactive customers in this directory."
                : filter === "active"
                ? "No active customers found. Create a new record or review soft-deleted customer records."
                : "Your customer directory is empty. Click below to add your first customer."
            }
            actionLabel={
              search
                ? "Clear search filter"
                : filter === "inactive"
                ? "Show all records"
                : "Add Customer"
            }
            onAction={
              search
                ? () => setSearch("")
                : filter === "inactive"
                ? () => setFilter("all")
                : () => setForm("new")
            }
          />
        )}
        <div className="entity-footer">
          <span>{rows.length} records visible</span>
          <span>
            {isAdmin
              ? "Administrative view · stamps enabled"
              : "Rights-filtered User view"}
          </span>
        </div>
      </section>
      {form && (
        <CustomerForm
          customer={form === "new" ? undefined : form}
          close={() => setForm(null)}
          onSave={handleSaveCustomer}
          existingCustNos={customers.map((c) => c[0])}
        />
      )}
      {deleting && (
        <ConfirmDeleteModal
          record={`${deleting[0]} ${deleting[1]}`}
          noun="Customer"
          close={() => setDeleting(null)}
          confirm={() => handleSoftDelete(deleting)}
        />
      )}
      {blocked && (
        <BlockedDeleteModal
          record={blocked.record}
          reason={blocked.reason}
          close={() => setBlocked(null)}
        />
      )}
    </div>
  )
}
