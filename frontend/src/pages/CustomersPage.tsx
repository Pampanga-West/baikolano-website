import { useEffect, useMemo, useState } from "react"
import { customerApi, rightsApi } from "../lib/api"
import { useAuth } from "../contexts/AuthContext"
import { fetchUserRightsFromSupabase } from "../backend/supabaseClient"
import Badge from "../components/Badge"
import BlockedDeleteModal from "../components/BlockedDeleteModal"
import Button from "../components/Button"
import ConfirmDeleteModal from "../components/ConfirmDeleteModal"
import CustomerModal from "../components/CustomerModal"
import EmptyState from "../components/EmptyState"
import EntityControls from "../components/EntityControls"
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

export default function CustomersPage({ role }: { role: Role }) {
  const { user } = useAuth()
  const [rights, setRights] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
  const [blocked, setBlocked] = useState<{ record: string; reason?: string } | null>(null)

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

  const suggestedCustno = useMemo(() => {
    let maxNum = 0
    for (const c of customers) {
      const match = c.custno.match(/C-?(\d+)/i)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    }
    return maxNum > 0 ? `C${String(maxNum + 1).padStart(4, "0")}` : "C0001"
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
        setBlocked({ record: recordLabel })
      } else {
        setSuccess(`Soft-deleted ${recordLabel}. Record is marked as Inactive and remains restorable by administrators.`)
        loadCustomers()
      }
    } catch (err: any) {
      if (err.blocked || err.status === 409 || err.message?.includes("Active child records")) {
        setBlocked({ record: recordLabel, reason: err.message })
      } else {
        setError(err.message || "Failed to delete customer.")
      }
    }
  }

  const handleRestore = async (custno: string) => {
    try {
      await customerApi.restoreCustomer(custno)
      setSuccess(`Restored ${custno}. Record is now Active and visible in standard operational views.`)
      loadCustomers()
    } catch (err: any) {
      setError(err.message || "Failed to restore customer.")
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
            onAdd={() => {
              if (canAdd) setForm("new")
            }}
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
                    : canAdd
                    ? "Add Customer"
                    : undefined
                }
                onAction={
                  search
                    ? () => setSearch("")
                    : filter === "inactive"
                    ? () => setFilter("all")
                    : canAdd
                    ? () => setForm("new")
                    : undefined
                }
                onClear={() => setSearch("")}
              />
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
        <CustomerModal
          customer={form === "new" ? undefined : form}
          suggestedCustno={suggestedCustno}
          currentUser={user}
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
        <BlockedDeleteModal
          record={blocked.record}
          reason={blocked.reason}
          close={() => setBlocked(null)}
        />
      )}
    </div>
  )
}

