import { useEffect, useMemo, useState } from "react"
import { customerApi, rightsApi } from "../lib/api"
import { useAuth } from "../contexts/AuthContext"
import { fetchUserRightsFromSupabase } from "../backend/supabaseClient"
import Badge from "../components/Badge"
import BlockedDeleteModal from "../components/BlockedDeleteModal"
import Button from "../components/Button"
import ConfirmDeleteModal from "../components/ConfirmDeleteModal"
import EmptyState from "../components/EmptyState"
import EntityControls from "../components/EntityControls"
import ModalShell from "../components/ModalShell"
import Stamp from "../components/Stamp"
import type { Customer, Role } from "../lib/types"

const fallbackCustomers: Customer[] = [
  {
    custno: "C0001",
    custname: "Globus Medical, Inc",
    address: "2560 Gen Armistead Ave Audubon CA 94031",
    payterm: "30D",
    is_deleted: false,
    status: "Active",
    stamp: "ADD system 2026-10-30 12:37 PM",
    stampAction: "CREATED",
    stampUser: "system",
    stampDate: "2026-10-30 12:37 PM",
  },
  {
    custno: "C0002",
    custname: "RF Industries, Inc",
    address: "7610 Miramar Rd San Diego, CA 92602",
    payterm: "45D",
    is_deleted: false,
    status: "Active",
    stamp: "ADD system 2026-10-30 12:37 PM",
    stampAction: "CREATED",
    stampUser: "system",
    stampDate: "2026-10-30 12:37 PM",
  },
  {
    custno: "C0003",
    custname: "Trisha Macdowell",
    address: "7642 Clairemont Mesa Blvd San Diego CA 90321",
    payterm: "COD",
    is_deleted: false,
    status: "Active",
    stamp: "ADD system 2026-10-30 12:37 PM",
    stampAction: "CREATED",
    stampUser: "system",
    stampDate: "2026-10-30 12:37 PM",
  },
  {
    custno: "C0004",
    custname: "HMS Holdings, Inc",
    address: "1000 So Fremont Ave, Suite 225 Alhambara CA 91303",
    payterm: "45D",
    is_deleted: false,
    status: "Active",
    stamp: "ADD system 2026-10-30 12:37 PM",
    stampAction: "CREATED",
    stampUser: "system",
    stampDate: "2026-10-30 12:37 PM",
  },
  {
    custno: "C-001",
    custname: "Acme Corporation",
    address: "123 Main St, Metro City, CA 94016",
    payterm: "Net 30",
    is_deleted: false,
    status: "Active",
    stamp: "CREATED system 2026-10-01 9:00 AM",
    stampAction: "CREATED",
    stampUser: "system",
    stampDate: "2026-10-01 9:00 AM",
  },
  {
    custno: "C-002",
    custname: "Globex Industries",
    address: "456 Oak Ave, Harbor Town, CA 92656",
    payterm: "Net 45",
    is_deleted: false,
    status: "Active",
    stamp: "CREATED system 2026-10-02 10:15 AM",
    stampAction: "CREATED",
    stampUser: "system",
    stampDate: "2026-10-02 10:15 AM",
  },
  {
    custno: "C-003",
    custname: "Initech LLC",
    address: "789 Pine Rd, Silicon Valley, CA 94025",
    payterm: "COD",
    is_deleted: false,
    status: "Active",
    stamp: "EDITED user1 2026-10-13 1:01 PM",
    stampAction: "EDITED",
    stampUser: "user1",
    stampDate: "2026-10-13 1:01 PM",
  },
  {
    custno: "C-004",
    custname: "Umbrella Corp",
    address: "1 Raccoon City Blvd, CA 90001",
    payterm: "Prepaid",
    is_deleted: true,
    status: "Inactive",
    stamp: "DELETED user2 2026-10-13 1:01 PM",
    stampAction: "DELETED",
    stampUser: "user2",
    stampDate: "2026-10-13 1:01 PM",
  },
  {
    custno: "C-005",
    custname: "Stark Enterprises",
    address: "200 Park Avenue, New York, NY 10001",
    payterm: "Net 15",
    is_deleted: false,
    status: "Active",
    stamp: "EDITED user1 2026-10-13 1:01 PM",
    stampAction: "EDITED",
    stampUser: "user1",
    stampDate: "2026-10-13 1:01 PM",
  },
]

function CustomerForm({
  customer,
  close,
  onSaved,
}: {
  customer?: Customer
  close: () => void
  onSaved: () => void
}) {
  const editing = Boolean(customer)
  const [custno, setCustno] = useState(customer?.custno ?? "")
  const [custname, setCustname] = useState(customer?.custname ?? "")
  const [address, setAddress] = useState(customer?.address ?? "")
  const [payterm, setPayterm] = useState(customer?.payterm ?? "Net 30")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!custname.trim()) {
      setError("Customer Name is required.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (editing && customer) {
        await customerApi.updateCustomer(customer.custno, {
          custname: custname.trim(),
          address: address.trim(),
          payterm,
        })
      } else {
        await customerApi.createCustomer({
          custno: custno.trim() || undefined,
          custname: custname.trim(),
          address: address.trim(),
          payterm,
        })
      }
      onSaved()
      close()
    } catch (err: any) {
      setError(err.message || "Failed to save customer.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      title={editing ? `Edit Customer — ${customer?.custno}` : "Add Customer"}
      subtitle={
        editing
          ? `Update ${customer?.custno} without changing its audit history.`
          : "Create a customer master record."
      }
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => handleSubmit()} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Customer"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="record-form">
        {error && <div className="form-error-banner">{error}</div>}
        <label>
          <span>Cust No</span>
          <input
            value={custno}
            onChange={(e) => setCustno(e.target.value)}
            disabled={editing}
            placeholder={editing ? customer?.custno : "Auto-generated e.g. C0083"}
          />
        </label>
        <label>
          <span>Customer Name *</span>
          <input
            value={custname}
            onChange={(e) => setCustname(e.target.value)}
            placeholder="Legal customer name"
            required
          />
        </label>
        <label className="form-span">
          <span>Address</span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, city, province"
          />
        </label>
        <label>
          <span>Pay Terms</span>
          <select value={payterm} onChange={(e) => setPayterm(e.target.value)}>
            {["Net 15", "Net 30", "Net 45", "COD", "Prepaid", "30D", "45D"].map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
        </label>
      </form>
    </ModalShell>
  )
}

export default function CustomersPage({ role }: { role: Role }) {
  const { user } = useAuth()
  const [rights, setRights] = useState<string[]>([])

  useEffect(() => {
    if (!user?.id) {
      setRights([])
      return
    }
    let active = true
    rightsApi
      .getUserRights(user.id)
      .then((r) => {
        if (active) setRights(r || [])
      })
      .catch(async (err) => {
        console.warn("[CustomersPage] rightsApi.getUserRights error, attempting Supabase direct fallback:", err)
        try {
          const direct = await fetchUserRightsFromSupabase(user.id)
          if (active) setRights(direct || [])
        } catch (dbErr) {
          console.warn("[CustomersPage] Supabase fallback error:", dbErr)
          if (active) setRights([])
        }
      })
    return () => {
      active = false
    }
  }, [user?.id])

  const isSuperadmin = role === "Superadmin" || user?.role === "Superadmin"
  const isAdminRole = role === "Admin" || user?.role === "Admin"
  const isAdmin = isSuperadmin || isAdminRole

  const hasRight = (name: string) => {
    if (isSuperadmin) return true
    if (isAdminRole && !rights.length) return true
    const n = name.toLowerCase().trim()
    return rights.some((r) => {
      const rl = r.toLowerCase().trim()
      return (
        rl === n ||
        rl === `customer - ${n}` ||
        rl === `${n} customer` ||
        (rl.includes("customer") && rl.includes(n))
      )
    })
  }

  const canAdd = isSuperadmin || hasRight("add")
  const canEdit = isSuperadmin || hasRight("edit")
  const canDelete = isSuperadmin || hasRight("delete")
  const canViewInactive = isSuperadmin || isAdminRole || canEdit || canDelete
  const canFilter = isSuperadmin || isAdminRole || canAdd || canEdit || canDelete || rights.length > 0
  const showAudit = isSuperadmin || isAdminRole || canEdit || canDelete
  const hasActions = canEdit || canDelete

  const [customers, setCustomers] = useState<Customer[]>(fallbackCustomers)
  const [filter, setFilter] = useState<string>("active")
  const [search, setSearch] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [form, setForm] = useState<Customer | "new" | null>(null)
  const [deleting, setDeleting] = useState<Customer | null>(null)
  const [blocked, setBlocked] = useState<string | null>(null)

  const loadCustomers = () => {
    let active = true
    setLoading(true)
    setPermissionError(null)

    customerApi
      .listCustomers({
        status: "all",
      })
      .then((data) => {
        if (!active) return
        if (data && data.length) {
          setCustomers(data)
        } else {
          setCustomers(fallbackCustomers)
        }
      })
      .catch((err: any) => {
        if (!active) return
        if (err.status === 403 || err.message?.includes("Access denied")) {
          setPermissionError("Access denied. You do not have 'Customer - View' permission.")
          setCustomers([])
        } else {
          console.warn("[CustomersPage] Falling back to default customers list:", err)
          setCustomers(fallbackCustomers)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }

  useEffect(() => {
    const cleanup = loadCustomers()
    return cleanup
  }, [user?.id, isAdmin])

  const counts = useMemo<[number, number, number]>(() => {
    const activeCount = customers.filter((r) => !r.is_deleted).length
    const inactiveCount = customers.filter((r) => r.is_deleted).length
    return [activeCount, inactiveCount, customers.length]
  }, [customers])

  const rows = useMemo(() => {
    return customers.filter((row) => {
      if (!canViewInactive && row.is_deleted) return false
      if (canViewInactive && filter !== "all") {
        if (filter === "active" && row.is_deleted) return false
        if (filter === "inactive" && !row.is_deleted) return false
      }
      const q = search.trim().toLowerCase()
      if (!q) return true
      return `${row.custno} ${row.custname} ${row.address} ${row.payterm}`
        .toLowerCase()
        .includes(q)
    })
  }, [customers, filter, canViewInactive, search])

  const handleDelete = async (target: Customer) => {
    const recordLabel = `${target.custno} ${target.custname}`
    setDeleting(null)
    try {
      const res = await customerApi.deleteCustomer(target.custno)
      if (res?.blocked) {
        setBlocked(recordLabel)
      } else {
        loadCustomers()
      }
    } catch (err: any) {
      if (err.blocked || err.status === 409 || err.message?.includes("Active child records")) {
        setBlocked(recordLabel)
      } else {
        alert(err.message || "Failed to delete customer.")
      }
    }
  }

  const handleRestore = async (custno: string) => {
    try {
      await customerApi.restoreCustomer(custno)
      loadCustomers()
    } catch (err: any) {
      alert(err.message || "Failed to restore customer.")
    }
  }

  return (
    <div className="page module-page">
      <div className="page-heading">
        <div>
          <span>Master data / Customers</span>
          <div className="page-title">Customer Management</div>
          <p>Commercial identities, payment terms, and record provenance.</p>
        </div>
        <div className="module-count">
          <b>{String(canViewInactive ? counts[2] : counts[0]).padStart(2, "0")}</b>
          <span>customer records</span>
        </div>
      </div>

      {permissionError ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <div className="empty-state-title">Permission Required</div>
          <div className="empty-state-detail">{permissionError}</div>
        </div>
      ) : (
        <>
          <EntityControls
            isAdmin={isAdmin}
            showFilters={canFilter}
            showAdd={canAdd}
            canAdd={canAdd}
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
            {loading && !customers.length ? (
              <div className="module-loading">
                <span></span>
                Loading customer records…
              </div>
            ) : rows.length ? (
              <div className="table-scroll">
                <table className="entity-table">
                  <thead>
                    <tr>
                      <th>Cust No</th>
                      <th>Customer Name</th>
                      <th>Address</th>
                      <th>Pay Terms</th>
                      {showAudit && (
                        <>
                          <th>Status</th>
                          <th>Stamp</th>
                        </>
                      )}
                      {hasActions && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        className={row.is_deleted ? "inactive-row" : ""}
                        key={row.custno}
                      >
                        <td className="code-cell">{row.custno}</td>
                        <td>
                          <b className="record-name">{row.custname}</b>
                        </td>
                        <td>{row.address || "—"}</td>
                        <td>{row.payterm || "—"}</td>
                        {showAudit && (
                          <>
                            <td>
                              <Badge kind={row.status}>{row.status}</Badge>
                            </td>
                            <td>
                              <Stamp
                                action={row.stampAction || "CREATED"}
                                user={row.stampUser || "system"}
                                date={row.stampDate || "2026-10-01 9:00 AM"}
                              />
                            </td>
                          </>
                        )}
                        {hasActions && (
                          <td>
                            <div className="row-actions">
                              {row.is_deleted ? (
                                canEdit && (
                                  <button
                                    className="success-link"
                                    onClick={() => handleRestore(row.custno)}
                                  >
                                    Restore
                                  </button>
                                )
                              ) : (
                                <>
                                  {canEdit && (
                                    <button onClick={() => setForm(row)}>Edit</button>
                                  )}
                                  {canDelete && (
                                    <button
                                      className="danger-link"
                                      onClick={() => setDeleting(row)}
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
              <EmptyState query={search} onClear={() => setSearch("")} />
            )}

            <div className="entity-footer">
              <span>{rows.length} records visible</span>
              <span>
                {isSuperadmin
                  ? "Superadmin view · full permissions"
                  : isAdminRole
                  ? "Administrative view · stamps enabled"
                  : hasActions || canAdd
                  ? "Rights-enabled User view"
                  : "Read-only User view"}
              </span>
            </div>
          </section>
        </>
      )}

      {form && (
        <CustomerForm
          customer={form === "new" ? undefined : form}
          close={() => setForm(null)}
          onSaved={loadCustomers}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          record={`${deleting.custno} ${deleting.custname}`}
          noun="Customer"
          close={() => setDeleting(null)}
          confirm={() => handleDelete(deleting)}
        />
      )}

      {blocked && (
        <BlockedDeleteModal record={blocked} close={() => setBlocked(null)} />
      )}
    </div>
  )
}

