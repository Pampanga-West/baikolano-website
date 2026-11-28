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
import ProductModal from "../components/ProductModal"
import PriceHistoryModal from "../components/PriceHistoryModal"
import Stamp from "../components/Stamp"
import type { PriceHistoryRecord, Product, Role } from "../lib/types"

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

const fallbackPriceHistory: PriceHistoryRecord[] = [
  {
    prodcode: "P-001",
    effdate: "2026-01-01",
    unitprice: 13.75,
    price: "$13.75",
    is_deleted: false,
    status: "Active",
    stampAction: "CREATED",
    stampUser: "system",
    stampDate: "2026-01-01 9:00 AM",
  },
  {
    prodcode: "P-002",
    effdate: "2026-01-15",
    unitprice: 48.5,
    price: "$48.50",
    is_deleted: false,
    status: "Active",
    stampAction: "CREATED",
    stampUser: "system",
    stampDate: "2026-01-15 10:00 AM",
  },
  {
    prodcode: "P-003",
    effdate: "2026-02-01",
    unitprice: 28.0,
    price: "$28.00",
    is_deleted: false,
    status: "Active",
    stampAction: "CREATED",
    stampUser: "system",
    stampDate: "2026-02-01 10:00 AM",
  },
  {
    prodcode: "P-005",
    effdate: "2026-01-20",
    unitprice: 2.35,
    price: "$2.35",
    is_deleted: false,
    status: "Active",
    stampAction: "CREATED",
    stampUser: "system",
    stampDate: "2026-01-20 3:30 PM",
  },
]

export default function ProductsPage({ role }: { role: Role }) {
  const { user } = useAuth()
  const [rights, setRights] = useState<string[]>([])
  const [products, setProducts] = useState<Product[]>(fallbackProducts)
  const [priceHistory, setPriceHistory] = useState<PriceHistoryRecord[]>(
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
          const mappedPrices: PriceHistoryRecord[] = priceRows.map((p) => {
            const isDeleted = Boolean(p.is_deleted)
            const [action, u, d] = parseStamp(p.stamp, isDeleted)
            const num = Number(p.unitprice ?? 0)
            return {
              prodcode: String(p.prodcode ?? ""),
              effdate: String(p.effdate ?? ""),
              unitprice: num,
              price: formatMoney(num),
              is_deleted: isDeleted,
              status: isDeleted ? "Inactive" : "Active",
              stamp: p.stamp,
              stampAction: action,
              stampUser: u,
              stampDate: d,
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
        <PriceHistoryModal
          role={role}
          product={pricesProduct}
          currentUser={user}
          canManagePrices={canEdit || isSuperadmin || isAdminRole}
          initialEntries={priceHistory.filter((p) => p.prodcode === pricesProduct.prodcode)}
          close={() => setPricesProduct(null)}
          onPriceChanged={() => {
            loadProducts()
          }}
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
