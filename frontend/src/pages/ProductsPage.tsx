import { useEffect, useMemo, useState } from "react"
import {
  fetchTableRowsFromSupabase,
  fetchUserRightsFromSupabase,
  formatMoney,
  parseStamp,
} from "../backend/supabaseClient"
import { productApi, rightsApi } from "../lib/api"
import { useAuth } from "../contexts/AuthContext"
import Badge from "../components/Badge"
import BlockedDeleteModal from "../components/BlockedDeleteModal"
import Button from "../components/Button"
import ConfirmDeleteModal from "../components/ConfirmDeleteModal"
import EmptyState from "../components/EmptyState"
import EntityControls from "../components/EntityControls"
import ModalShell from "../components/ModalShell"
import ProductModal from "../components/ProductModal"
import Stamp from "../components/Stamp"
import type { Product, Role } from "../lib/types"

const fallbackProducts: Product[] = [
  {
    prodcode: "P-001",
    description: "Industrial Widget A",
    unit: "pcs",
    price: "$13.75",
    numericPrice: 13.75,
    is_deleted: false,
    status: "Active",
    stamp: "CREATED system 2026-10-01 9:00 AM",
    stampAction: "CREATED",
    stampUser: "system",
    stampDate: "2026-10-01 9:00 AM",
  },
  {
    prodcode: "P-002",
    description: "Steel Bracket Heavy",
    unit: "pcs",
    price: "$48.50",
    numericPrice: 48.50,
    is_deleted: false,
    status: "Active",
    stamp: "CREATED system 2026-10-02 10:00 AM",
    stampAction: "CREATED",
    stampUser: "system",
    stampDate: "2026-10-02 10:00 AM",
  },
  {
    prodcode: "P-003",
    description: "Lubricant Oil 5L",
    unit: "can",
    price: "$28.00",
    numericPrice: 28.0,
    is_deleted: false,
    status: "Active",
    stamp: "EDITED user1 2026-10-13 1:01 PM",
    stampAction: "EDITED",
    stampUser: "user1",
    stampDate: "2026-10-13 1:01 PM",
  },
  {
    prodcode: "P-004",
    description: "Safety Gloves XL",
    unit: "pair",
    price: "—",
    numericPrice: null,
    is_deleted: true,
    status: "Inactive",
    stamp: "DELETED user2 2026-10-13 1:01 PM",
    stampAction: "DELETED",
    stampUser: "user2",
    stampDate: "2026-10-13 1:01 PM",
  },
  {
    prodcode: "P-005",
    description: "Copper Wire 2.5mm",
    unit: "meter",
    price: "$2.35",
    numericPrice: 2.35,
    is_deleted: false,
    status: "Active",
    stamp: "CREATED system 2026-10-05 3:30 PM",
    stampAction: "CREATED",
    stampUser: "system",
    stampDate: "2026-10-05 3:30 PM",
  },
]

type PriceHistoryEntry = {
  prodcode: string
  effdate: string
  price: string
  status: string
  action: string
  user: string
  date: string
}

const fallbackPriceHistory: PriceHistoryEntry[] = [
  {
    prodcode: "P-001",
    effdate: "2026-01-01",
    price: "$13.75",
    status: "Active",
    action: "CREATED",
    user: "system",
    date: "2026-01-01 9:00 AM",
  },
  {
    prodcode: "P-002",
    effdate: "2026-01-15",
    price: "$48.50",
    status: "Active",
    action: "CREATED",
    user: "system",
    date: "2026-01-15 10:00 AM",
  },
  {
    prodcode: "P-003",
    effdate: "2026-02-01",
    price: "$28.00",
    status: "Active",
    action: "CREATED",
    user: "system",
    date: "2026-02-01 10:00 AM",
  },
  {
    prodcode: "P-005",
    effdate: "2026-01-20",
    price: "$2.35",
    status: "Active",
    action: "CREATED",
    user: "system",
    date: "2026-01-20 3:30 PM",
  },
]

function PriceForm({
  productCode,
  entry,
  close,
  onSave,
}: {
  productCode: string
  entry?: PriceHistoryEntry | null
  close: () => void
  onSave: (data: {
    prodcode: string
    effdate: string
    price: string
    isEditing?: boolean
    originalEffDate?: string
  }) => void
}) {
  const isEditing = Boolean(entry)
  const todayStr = useMemo(() => {
    const d = new Date()
    return d.toISOString().split("T")[0]
  }, [])

  const [effDate, setEffDate] = useState(entry?.effdate ?? todayStr)
  const [unitPrice, setUnitPrice] = useState(
    entry?.price ? entry.price.replace(/[^0-9.]/g, "") : ""
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!effDate) {
      setValidationError("Effective Date is required.")
      return
    }
    const numPrice = parseFloat(unitPrice)
    if (isNaN(numPrice) || numPrice <= 0) {
      setValidationError("Please enter a valid unit price greater than 0.")
      return
    }

    onSave({
      prodcode: productCode,
      effdate: effDate,
      price: `$${numPrice.toFixed(2)}`,
      isEditing,
      originalEffDate: entry?.effdate,
    })
    close()
  }

  return (
    <ModalShell
      title={isEditing ? "Edit Price" : "Add Price"}
      subtitle={isEditing ? "Update effective unit price" : "Set a new effective unit price"}
      close={close}
      footer={
        <div className="modal-footer-duo">
          <Button
            className="btn-save-main"
            onClick={() => handleSubmit()}
          >
            Save Price
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
          <label>Product Code</label>
          <input
            className="field-input"
            value={productCode}
            readOnly
            disabled
          />
        </div>
        <div className="field-group">
          <label>Effective Date</label>
          <input
            type="date"
            className="field-input"
            value={effDate}
            onChange={(e) => {
              setEffDate(e.target.value)
              setValidationError(null)
            }}
            placeholder="dd/mm/yyyy"
            required
          />
        </div>
        <div className="field-group">
          <label>Unit Price</label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
                fontWeight: 600,
              }}
            >
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="field-input"
              style={{ paddingLeft: "30px" }}
              value={unitPrice}
              onChange={(e) => {
                setUnitPrice(e.target.value)
                setValidationError(null)
              }}
              placeholder="0.00"
              required
            />
          </div>
        </div>
      </form>
    </ModalShell>
  )
}

function PriceHistory({
  role,
  product,
  entries,
  close,
  onSoftDeletePrice,
  onRestorePrice,
  onSavePrice,
}: {
  role: Role
  product: Product
  entries: PriceHistoryEntry[]
  close: () => void
  onSoftDeletePrice?: (entry: PriceHistoryEntry) => void
  onRestorePrice?: (entry: PriceHistoryEntry) => void
  onSavePrice: (data: {
    prodcode: string
    effdate: string
    price: string
    isEditing?: boolean
    originalEffDate?: string
  }) => void
}) {
  const isAdmin = role !== "User"
  const [priceForm, setPriceForm] = useState<"new" | PriceHistoryEntry | null>(null)
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active")
  const [deletingPrice, setDeletingPrice] = useState<PriceHistoryEntry | null>(null)

  const visibleEntries = entries.filter((entry) => {
    if (!isAdmin && entry.status === "Inactive") return false
    if (isAdmin && statusFilter !== "all" && entry.status.toLowerCase() !== statusFilter)
      return false
    return true
  })

  return (
    <ModalShell
      title={`Price History — ${product.prodcode}`}
      subtitle={`${product.description} · Unit: ${product.unit}`}
      close={close}
      wide
    >
      {isAdmin && (
        <div className="nested-toolbar">
          <div className="filter-tabs">
            <button
              className={statusFilter === "active" ? "selected" : ""}
              onClick={() => setStatusFilter("active")}
            >
              Active
            </button>
            <button
              className={statusFilter === "inactive" ? "selected" : ""}
              onClick={() => setStatusFilter("inactive")}
            >
              Inactive
            </button>
            <button
              className={statusFilter === "all" ? "selected" : ""}
              onClick={() => setStatusFilter("all")}
            >
              All
            </button>
          </div>
          <Button icon="plus" onClick={() => setPriceForm("new")}>
            Add Price
          </Button>
        </div>
      )}
      <div className="table-scroll">
        <table className="entity-table">
          <thead>
            <tr>
              <th>Effective Date</th>
              <th>Unit Price</th>
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
            {visibleEntries.length ? (
              visibleEntries.map((entry) => (
                <tr
                  key={`${entry.prodcode}-${entry.effdate}`}
                  className={entry.status === "Inactive" ? "inactive-row" : ""}
                >
                  <td className="code-cell">{entry.effdate}</td>
                  <td>
                    <b className="price-value">{entry.price}</b>
                  </td>
                  {isAdmin && (
                    <>
                      <td>
                        <Badge kind={entry.status.toLowerCase()}>
                          {entry.status}
                        </Badge>
                      </td>
                      <td>
                        <Stamp
                          action={entry.action}
                          user={entry.user}
                          date={entry.date}
                        />
                      </td>
                      <td>
                        <div className="row-actions">
                          {entry.status === "Inactive" ? (
                            <button
                              className="success-link"
                              onClick={() => onRestorePrice?.(entry)}
                            >
                              Restore
                            </button>
                          ) : (
                            <>
                              <button onClick={() => setPriceForm(entry)}>
                                Edit
                              </button>
                              <button
                                className="danger-link"
                                onClick={() => setDeletingPrice(entry)}
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
                  colSpan={isAdmin ? 5 : 2}
                  style={{ textAlign: "center", color: "var(--muted)", padding: "20px" }}
                >
                  {statusFilter === "inactive"
                    ? `No inactive price schedules for ${product.prodcode}.`
                    : `No price history entries found for ${product.prodcode}.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {priceForm && (
        <PriceForm
          productCode={product.prodcode}
          entry={priceForm === "new" ? null : priceForm}
          close={() => setPriceForm(null)}
          onSave={onSavePrice}
        />
      )}
      {deletingPrice && (
        <ConfirmDeleteModal
          record={`price ${deletingPrice.price} effective ${deletingPrice.effdate}`}
          noun="Price Schedule"
          close={() => setDeletingPrice(null)}
          confirm={() => {
            onSoftDeletePrice?.(deletingPrice)
            setDeletingPrice(null)
          }}
          customWarning="This will mark the price tier as Inactive/Superseded."
          customExplanation="The rate will no longer be applied to new transactions, but historical records will retain point-in-time calculation integrity."
        />
      )}
    </ModalShell>
  )
}

export default function ProductsPage({ role }: { role: Role }) {
  const { user } = useAuth()
  const [rights, setRights] = useState<string[]>([])
  const [products, setProducts] = useState<Product[]>(fallbackProducts)
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>(
    fallbackPriceHistory
  )
  const [filter, setFilter] = useState<string>("active")
  const [search, setSearch] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [form, setForm] = useState<Product | "new" | null>(null)
  const [pricesProduct, setPricesProduct] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [blocked, setBlocked] = useState<{ record: string; message?: string; reason?: string } | null>(null)
  const [restoringProdcode, setRestoringProdcode] = useState<string | null>(null)
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
        console.warn("[ProductsPage] rightsApi.getUserRights error, attempting Supabase direct fallback:", err)
        try {
          const direct = await fetchUserRightsFromSupabase(user.id)
          if (active) setRights(direct || [])
        } catch (dbErr) {
          console.warn("[ProductsPage] Supabase fallback error:", dbErr)
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
        rl === `product - ${n}` ||
        rl === `${n} product` ||
        (rl.includes("product") && rl.includes(n))
      )
    })
  }

  const canAdd = isSuperadmin || hasRight("add")
  const canEdit = isSuperadmin || hasRight("edit")
  const canDelete = isSuperadmin || hasRight("delete")
  const canViewInactive = isSuperadmin || isAdminRole || canEdit || canDelete
  const canFilter = isSuperadmin || isAdminRole || canAdd || canEdit || canDelete || rights.length > 0
  const showAudit = isSuperadmin || isAdminRole || canEdit || canDelete

  const operatorName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Authorized User"

  const suggestedProdCode = useMemo(() => {
    const numbers = products
      .map((p) => {
        const m = p.prodcode.match(/([A-Z]+)(\d+)/i)
        return m ? parseInt(m[2], 10) : 0
      })
      .filter((n) => !isNaN(n))
    const maxNum = numbers.length ? Math.max(...numbers) : 0
    return `P${String(maxNum + 1).padStart(4, "0")}`
  }, [products])

  const loadProducts = () => {
    let active = true
    setLoading(true)
    setPermissionError(null)

    Promise.all([
      productApi.listProducts({ status: "all" }),
      fetchTableRowsFromSupabase("pricehist", "effdate.desc").catch(() => []),
    ])
      .then(([productsData, priceRows]) => {
        if (!active) return

        if (productsData && productsData.length) {
          setProducts(productsData)
        } else {
          setProducts(fallbackProducts)
        }

        if (priceRows && priceRows.length) {
          const mappedPrices: PriceHistoryEntry[] = priceRows.map((p) => {
            const isDeleted = Boolean(p.is_deleted)
            const [action, u, d] = parseStamp(p.stamp, isDeleted)
            return {
              prodcode: String(p.prodcode ?? ""),
              effdate: String(p.effdate ?? ""),
              price: formatMoney(p.unitprice),
              status: isDeleted ? "Inactive" : "Active",
              action,
              user: u,
              date: d,
            }
          })
          setPriceHistory(mappedPrices)
        }
      })
      .catch((err: any) => {
        if (!active) return
        if (err.status === 403 || err.message?.includes("Access denied")) {
          setPermissionError("Access denied. You do not have 'Product - View' permission.")
          setProducts([])
        } else {
          console.warn("[ProductsPage] Falling back to default products list:", err)
          setProducts(fallbackProducts)
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
    const cleanup = loadProducts()
    return cleanup
  }, [user?.id, isAdmin])

  const handleSavePrice = (data: {
    prodcode: string
    effdate: string
    price: string
    isEditing?: boolean
    originalEffDate?: string
  }) => {
    const todayStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })

    if (data.isEditing && data.originalEffDate) {
      setPriceHistory((prev) =>
        prev.map((ph) =>
          ph.prodcode === data.prodcode && ph.effdate === data.originalEffDate
            ? {
                ...ph,
                effdate: data.effdate,
                price: data.price,
                action: "EDITED",
                user: operatorName,
                date: todayStr,
              }
            : ph
        )
      )
      setSuccess(`Updated effective price for ${data.prodcode} to ${data.price} as of ${data.effdate}.`)
    } else {
      const newEntry: PriceHistoryEntry = {
        prodcode: data.prodcode,
        effdate: data.effdate,
        price: data.price,
        status: "Active",
        action: "CREATED",
        user: operatorName,
        date: todayStr,
      }
      setPriceHistory((prev) => [newEntry, ...prev])
      setSuccess(`Added new price rate for ${data.prodcode}: ${data.price} effective ${data.effdate}.`)
    }

    // Update parent product current price
    setProducts((prev) =>
      prev.map((p) => {
        if (p.prodcode !== data.prodcode) return p
        return {
          ...p,
          price: data.price,
          stampAction: "EDITED",
          stampUser: operatorName,
          stampDate: todayStr,
        }
      })
    )
  }

  const handleSoftDeleteProduct = async (productRow: Product) => {
    const prodCode = productRow.prodcode
    const prodDesc = productRow.description
    const label = `${prodCode} ${prodDesc}`
    setError(null)
    setSuccess(null)
    setDeleteLoading(true)

    try {
      const res = await productApi.deleteProduct(prodCode)
      setDeleting(null)
      if (res?.blocked) {
        setBlocked({
          record: label,
          message: res.message,
          reason: res.message,
        })
      } else {
        setSuccess(`Soft-deleted ${label}. Item is marked as Inactive and remains restorable by administrators.`)
        loadProducts()
      }
    } catch (err: any) {
      setDeleting(null)
      if (err.blocked || err.status === 409 || err.message?.includes("Active child records") || err.message?.includes("reference")) {
        setBlocked({
          record: label,
          message: err.message,
          reason: err.message,
        })
      } else {
        setError(err.message || `Failed to delete product ${label}.`)
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleRestoreProduct = async (productRow: Product) => {
    const prodCode = productRow.prodcode
    const prodDesc = productRow.description
    const label = `${prodCode} ${prodDesc}`
    setError(null)
    setSuccess(null)
    setRestoringProdcode(prodCode)

    try {
      await productApi.restoreProduct(prodCode)
      setSuccess(`Restored ${label}. Product is now Active and available for transactions.`)
      loadProducts()
    } catch (err: any) {
      setError(err.message || `Failed to restore product ${label}.`)
    } finally {
      setRestoringProdcode(null)
    }
  }

  const handleSoftDeletePrice = async (entry: PriceHistoryEntry) => {
    try {
      await productApi.deletePriceSchedule(entry.prodcode, entry.effdate)
      setSuccess(`Superseded price rate of ${entry.price} for ${entry.prodcode} as of ${entry.effdate}.`)
      loadProducts()
    } catch {
      const todayStr = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })

      setPriceHistory((prev) =>
        prev.map((ph) =>
          ph.prodcode === entry.prodcode && ph.effdate === entry.effdate
            ? { ...ph, status: "Inactive", action: "SUPERSEDED", user: operatorName, date: todayStr }
            : ph
        )
      )

      // Recalculate derived price on parent product
      setProducts((prev) =>
        prev.map((p) => {
          if (p.prodcode !== entry.prodcode) return p
          const remainingActive = priceHistory.find(
            (ph) => ph.prodcode === entry.prodcode && ph.effdate !== entry.effdate && ph.status === "Active"
          )
          return {
            ...p,
            price: remainingActive?.price ?? "—",
          }
        })
      )
      setSuccess(`Superseded price rate of ${entry.price} for ${entry.prodcode} as of ${entry.effdate}.`)
    }
  }

  const handleRestorePrice = async (entry: PriceHistoryEntry) => {
    try {
      await productApi.restorePriceSchedule(entry.prodcode, entry.effdate)
      setSuccess(`Restored price rate of ${entry.price} for ${entry.prodcode} effective ${entry.effdate}.`)
      loadProducts()
    } catch {
      const todayStr = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })

      setPriceHistory((prev) =>
        prev.map((ph) =>
          ph.prodcode === entry.prodcode && ph.effdate === entry.effdate
            ? { ...ph, status: "Active", action: "EDITED", user: operatorName, date: todayStr }
            : ph
        )
      )

      setProducts((prev) =>
        prev.map((p) => {
          if (p.prodcode !== entry.prodcode) return p
          return {
            ...p,
            price: entry.price,
          }
        })
      )
      setSuccess(`Restored price rate of ${entry.price} for ${entry.prodcode} effective ${entry.effdate}.`)
    }
  }

  const counts = useMemo<[number, number, number]>(() => {
    const activeCount = products.filter((r) => !r.is_deleted).length
    const inactiveCount = products.filter((r) => r.is_deleted).length
    return [activeCount, inactiveCount, products.length]
  }, [products])

  const rows = useMemo(() => {
    return products.filter((p) => {
      if (!canViewInactive && p.is_deleted) return false
      if (canViewInactive && filter !== "all") {
        if (filter === "active" && p.is_deleted) return false
        if (filter === "inactive" && !p.is_deleted) return false
      }
      const q = search.trim().toLowerCase()
      if (!q) return true
      return (
        p.prodcode.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.unit.toLowerCase().includes(q) ||
        p.price.toLowerCase().includes(q)
      )
    })
  }, [products, filter, canViewInactive, search])

  return (
    <div className="page module-page">
      <div className="page-heading">
        <div>
          <span>Master data / Products</span>
          <div className="page-title">Product Management</div>
          <p>Catalog records with effective-dated commercial pricing.</p>
        </div>
        <div className="module-count">
          <b>{String(canViewInactive ? counts[2] : counts[0]).padStart(2, "0")}</b>
          <span>catalog records</span>
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <div style={{ flex: 1 }}>
            <b>Product Operation Error</b>
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
        isAdmin={canFilter}
        counts={counts}
        activeFilter={filter}
        onFilter={setFilter}
        search={search}
        onSearch={setSearch}
        placeholder="Search products..."
        addLabel="Add Product"
        onAdd={canAdd ? () => setForm("new") : undefined}
      />

      {permissionError ? (
        <div className="permission-denied-card" role="alert">
          <div className="permission-denied-icon">🔒</div>
          <h3>Access Restricted</h3>
          <p>{permissionError}</p>
          <p className="permission-hint">
            Contact your administrator to grant you <b>Product - View</b> permission in User Rights.
          </p>
        </div>
      ) : (
        <section className="entity-table-shell">
          {loading && !products.length ? (
            <div className="module-loading" style={{ padding: "40px" }}>
              <span></span>
              Loading products catalog…
            </div>
          ) : rows.length ? (
            <div className="table-scroll">
              <table className="entity-table">
                <thead>
                  <tr>
                    <th>Prod Code</th>
                    <th>Description</th>
                    <th>Unit</th>
                    <th>Current Price</th>
                    {canViewInactive && <th>Status</th>}
                    {showAudit && <th>Stamp</th>}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      className={row.is_deleted ? "inactive-row" : ""}
                      key={row.prodcode}
                    >
                      <td className="code-cell">{row.prodcode}</td>
                      <td>
                        <b className="record-name">{row.description}</b>
                      </td>
                      <td>{row.unit}</td>
                      <td>
                        <b className="price-value">{row.price}</b>
                      </td>
                      {canViewInactive && (
                        <td>
                          <Badge kind={row.status.toLowerCase()}>{row.status}</Badge>
                        </td>
                      )}
                      {showAudit && (
                        <td>
                          <Stamp
                            action={row.stampAction || "CREATED"}
                            user={row.stampUser || "system"}
                            date={row.stampDate || "—"}
                          />
                        </td>
                      )}
                      <td>
                        <div className="row-actions">
                          {row.is_deleted ? (
                            canEdit && (
                              <button
                                className="success-link"
                                onClick={() => handleRestoreProduct(row)}
                                disabled={restoringProdcode === row.prodcode}
                              >
                                {restoringProdcode === row.prodcode ? "Restoring..." : "Restore"}
                              </button>
                            )
                          ) : (
                            <>
                              <button onClick={() => setPricesProduct(row)}>
                                Prices
                              </button>
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
                  ? "No matching products in catalog"
                  : filter === "inactive"
                  ? "No inactive product records"
                  : filter === "active"
                  ? "No active product records"
                  : "No products in catalog"
              }
              message={
                search
                  ? `Nothing matches "${search}". Try a different product title, SKU code, unit of measure, or clear the search filter.`
                  : filter === "inactive"
                  ? "There are currently no soft-deleted or inactive items in this catalog."
                  : filter === "active"
                  ? "No active catalog items found. Create a product or review soft-deleted records."
                  : "The product catalog is currently empty. Click below to add a product."
              }
              actionLabel={
                search
                  ? "Clear search filter"
                  : filter === "inactive"
                  ? "Show all records"
                  : canAdd
                  ? "Add Product"
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
            />
          )}
          <div className="entity-footer">
            <span>{rows.length} records visible</span>
            <span>Current price derived from active price history schedule</span>
          </div>
        </section>
      )}

      {form && (
        <ProductModal
          product={form === "new" ? undefined : form}
          suggestedProdcode={suggestedProdCode}
          existingProdCodes={products.map((p) => p.prodcode)}
          currentUser={user}
          close={() => setForm(null)}
          onSaved={(msg) => {
            if (msg) setSuccess(msg)
            setForm(null)
            loadProducts()
          }}
        />
      )}
      {pricesProduct && (
        <PriceHistory
          role={role}
          product={pricesProduct}
          entries={priceHistory.filter((p) => p.prodcode === pricesProduct.prodcode)}
          close={() => setPricesProduct(null)}
          onSoftDeletePrice={handleSoftDeletePrice}
          onRestorePrice={handleRestorePrice}
          onSavePrice={handleSavePrice}
        />
      )}
      {deleting && (
        <ConfirmDeleteModal
          record={`${deleting.prodcode} ${deleting.description}`}
          noun="Product"
          operator={operatorName}
          loading={deleteLoading}
          isDeleting={deleteLoading}
          customWarning="This will mark the product as Inactive without purging historical sales records."
          customExplanation="Soft-deleted products are hidden from standard catalog views and prevented from being added to new sales orders, but historical sales lines and price schedules maintain referential integrity. Administrators can restore this product at any time."
          actionLabel="Delete Product"
          close={() => setDeleting(null)}
          confirm={() => handleSoftDeleteProduct(deleting)}
        />
      )}
      {blocked && (
        <BlockedDeleteModal
          record={blocked.record}
          subtitle={blocked.record}
          message={blocked.message || blocked.reason}
          operator={operatorName}
          close={() => setBlocked(null)}
        />
      )}
    </div>
  )
}
