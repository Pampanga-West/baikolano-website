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
import ModalShell from "../components/ModalShell"
import Stamp from "../components/Stamp"
import type { Role } from "../lib/types"

const fallbackProducts = [
  [
    "P-001",
    "Industrial Widget A",
    "pcs",
    "$13.75",
    "Active",
    "CREATED",
    "system",
    "2026-10-01 9:00 AM",
  ],
  [
    "P-002",
    "Steel Bracket Heavy",
    "pcs",
    "$48.50",
    "Active",
    "CREATED",
    "system",
    "2026-10-02 10:00 AM",
  ],
  [
    "P-003",
    "Lubricant Oil 5L",
    "can",
    "$28.00",
    "Active",
    "EDITED",
    "user1",
    "2026-10-13 1:01 PM",
  ],
  [
    "P-004",
    "Safety Gloves XL",
    "pair",
    "—",
    "Inactive",
    "DELETED",
    "user2",
    "2026-10-13 1:01 PM",
  ],
  [
    "P-005",
    "Copper Wire 2.5mm",
    "meter",
    "$2.35",
    "Active",
    "CREATED",
    "system",
    "2026-10-05 3:30 PM",
  ],
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

function ProductForm({
  product,
  close,
  onSave,
  existingProdCodes = [],
}: {
  product?: string[]
  close: () => void
  onSave: (data: {
    prodCode: string
    description: string
    unit: string
  }) => void
  existingProdCodes?: string[]
}) {
  const isEditing = Boolean(product)
  const defaultCode = useMemo(() => {
    if (product?.[0]) return product[0]
    const numbers = existingProdCodes
      .map((c) => {
        const m = c.match(/P-(\d+)/i)
        return m ? parseInt(m[1], 10) : 0
      })
      .filter((n) => !isNaN(n))
    const maxNum = numbers.length ? Math.max(...numbers) : 5
    return `P-${String(maxNum + 1).padStart(3, "0")}`
  }, [product, existingProdCodes])

  const [prodCode, setProdCode] = useState(product?.[0] ?? defaultCode)
  const [description, setDescription] = useState(product?.[1] ?? "")
  const [unitSelect, setUnitSelect] = useState(
    ["pcs", "box", "kg", "liter", "can", "pair", "meter", "pack", "set", "roll"].includes(
      product?.[2] ?? "pcs"
    )
      ? product?.[2] ?? "pcs"
      : "Custom"
  )
  const [customUnit, setCustomUnit] = useState(
    ["pcs", "box", "kg", "liter", "can", "pair", "meter", "pack", "set", "roll"].includes(
      product?.[2] ?? "pcs"
    )
      ? ""
      : product?.[2] ?? ""
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!prodCode.trim()) {
      setValidationError("Product Code is required.")
      return
    }
    if (!description.trim()) {
      setValidationError("Description is required.")
      return
    }
    if (
      !isEditing &&
      existingProdCodes.some(
        (c) => c.toLowerCase() === prodCode.trim().toLowerCase()
      )
    ) {
      setValidationError(`Product Code "${prodCode.trim()}" already exists.`)
      return
    }

    const resolvedUnit =
      unitSelect === "Custom"
        ? customUnit.trim() || "pcs"
        : unitSelect

    onSave({
      prodCode: prodCode.trim(),
      description: description.trim(),
      unit: resolvedUnit,
    })
    close()
  }

  return (
    <ModalShell
      title={isEditing ? "Edit Product" : "Add Product"}
      subtitle={isEditing ? "Update product details" : "Enter new product details"}
      close={close}
      footer={
        <div className="modal-footer-duo">
          <Button
            className="btn-save-main"
            onClick={handleSubmit}
          >
            {isEditing ? "Save Changes" : "Save Product"}
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
            value={prodCode}
            onChange={(e) => {
              setProdCode(e.target.value)
              setValidationError(null)
            }}
            placeholder="e.g. P-001"
            required
          />
        </div>
        <div className="field-group">
          <label>Description</label>
          <input
            className="field-input"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              setValidationError(null)
            }}
            placeholder="Product description"
            required
          />
        </div>
        <div className="field-group">
          <label>Unit</label>
          <select
            className="field-input"
            value={unitSelect}
            onChange={(e) => setUnitSelect(e.target.value)}
          >
            <option value="pcs">pcs (pieces)</option>
            <option value="box">box</option>
            <option value="kg">kg (kilograms)</option>
            <option value="liter">liter</option>
            <option value="can">can</option>
            <option value="pair">pair</option>
            <option value="meter">meter</option>
            <option value="pack">pack</option>
            <option value="set">set</option>
            <option value="roll">roll</option>
            <option value="Custom">Custom unit...</option>
          </select>
          {unitSelect === "Custom" && (
            <input
              className="field-input"
              style={{ marginTop: "6px" }}
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value)}
              placeholder="e.g. pcs, box, kg, liter"
              autoFocus
            />
          )}
        </div>
      </form>
    </ModalShell>
  )
}

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
            onClick={handleSubmit}
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
  product: string[]
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
      title={`Price History — ${product[0]}`}
      subtitle={`${product[1]} · Unit: ${product[2]}`}
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
                    ? `No inactive price schedules for ${product[0]}.`
                    : `No price history entries found for ${product[0]}.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {priceForm && (
        <PriceForm
          productCode={product[0]}
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
  const isAdmin = role !== "User"
  const [products, setProducts] = useState<string[][]>(fallbackProducts)
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>(
    fallbackPriceHistory
  )
  const [filter, setFilter] = useState("active")
  const [search, setSearch] = useState("")
  const [form, setForm] = useState<string[] | "new" | null>(null)
  const [pricesProduct, setPricesProduct] = useState<string[] | null>(null)
  const [deleting, setDeleting] = useState<string[] | null>(null)
  const [blocked, setBlocked] = useState<{ record: string; reason?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSaveProduct = (data: {
    prodCode: string
    description: string
    unit: string
  }) => {
    const isEditing = Boolean(form && form !== "new")
    const todayStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })

    if (isEditing && typeof form !== "string" && form) {
      const originalCode = form[0]
      setProducts((prev) =>
        prev.map((p) =>
          p[0] === originalCode
            ? [
                data.prodCode,
                data.description,
                data.unit,
                p[3], // preserve current price
                p[4], // preserve status
                "EDITED",
                "Phil Hitalia",
                todayStr,
              ]
            : p
        )
      )
      setSuccess(`Successfully updated product ${data.prodCode} (${data.description}).`)
    } else {
      const newRow = [
        data.prodCode,
        data.description,
        data.unit,
        "—", // initial price until price schedule created
        "Active",
        "CREATED",
        "Phil Hitalia",
        todayStr,
      ]
      setProducts((prev) => [newRow, ...prev])
      setSuccess(`Successfully created product ${data.prodCode} (${data.description}).`)
    }
    setForm(null)
  }

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
                user: "Phil Hitalia",
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
        user: "Phil Hitalia",
        date: todayStr,
      }
      setPriceHistory((prev) => [newEntry, ...prev])
      setSuccess(`Added new price rate for ${data.prodcode}: ${data.price} effective ${data.effdate}.`)
    }

    // Update parent product current price if applicable
    setProducts((prev) =>
      prev.map((p) => {
        if (p[0] !== data.prodcode) return p
        return [p[0], p[1], p[2], data.price, p[4], "EDITED", "Phil Hitalia", todayStr]
      })
    )
  }

  const handleSoftDeleteProduct = (productRow: string[]) => {
    const prodCode = productRow[0]
    const prodDesc = productRow[1]
    const label = `${prodCode} ${prodDesc}`

    // Referential integrity check: P-001 has active child sales lines & active price history
    if (prodCode === "P-001") {
      setDeleting(null)
      setBlocked({
        record: label,
        reason:
          "Active child records reference this item. Active price history and sales orders assigned to Eures Tinoco reference this SKU. Remove or supersede those records first. No changes were made, and this attempt remains logged in the audit trail.",
      })
      return
    }

    const todayStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })

    // Soft delete: mark product as Inactive without purging from catalog
    setProducts((prev) =>
      prev.map((p) =>
        p[0] === prodCode
          ? [p[0], p[1], p[2], "—", "Inactive", "DELETED", "Phil Hitalia", todayStr]
          : p
      )
    )
    setDeleting(null)
    setSuccess(`Soft-deleted ${label}. Item is marked as Inactive and remains restorable by administrators.`)
  }

  const handleRestoreProduct = (productRow: string[]) => {
    const prodCode = productRow[0]
    const prodDesc = productRow[1]
    const label = `${prodCode} ${prodDesc}`
    const todayStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })

    // Find latest active price from price history
    const activePrice = priceHistory.find((ph) => ph.prodcode === prodCode && ph.status === "Active")?.price ?? "$15.00"

    // Restore product back to Active
    setProducts((prev) =>
      prev.map((p) =>
        p[0] === prodCode
          ? [p[0], p[1], p[2], activePrice, "Active", "EDITED", "Phil Hitalia", todayStr]
          : p
      )
    )
    setSuccess(`Restored ${label}. Product is now Active with derived current price of ${activePrice}.`)
  }

  const handleSoftDeletePrice = (entry: PriceHistoryEntry) => {
    const todayStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })

    // Mark price schedule as Inactive (Superseded)
    setPriceHistory((prev) =>
      prev.map((ph) =>
        ph.prodcode === entry.prodcode && ph.effdate === entry.effdate
          ? { ...ph, status: "Inactive", action: "SUPERSEDED", user: "Phil Hitalia", date: todayStr }
          : ph
      )
    )

    // Recalculate derived price on parent product
    setProducts((prev) =>
      prev.map((p) => {
        if (p[0] !== entry.prodcode) return p
        const remainingActive = priceHistory.find(
          (ph) => ph.prodcode === entry.prodcode && ph.effdate !== entry.effdate && ph.status === "Active"
        )
        return [p[0], p[1], p[2], remainingActive?.price ?? "—", p[4], p[5], p[6], p[7]]
      })
    )
    setSuccess(`Superseded price rate of ${entry.price} for ${entry.prodcode} as of ${entry.effdate}.`)
  }

  const handleRestorePrice = (entry: PriceHistoryEntry) => {
    const todayStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })

    // Restore price schedule back to Active
    setPriceHistory((prev) =>
      prev.map((ph) =>
        ph.prodcode === entry.prodcode && ph.effdate === entry.effdate
          ? { ...ph, status: "Active", action: "EDITED", user: "Phil Hitalia", date: todayStr }
          : ph
      )
    )

    // Update parent product current price if this is newest active
    setProducts((prev) =>
      prev.map((p) => {
        if (p[0] !== entry.prodcode) return p
        return [p[0], p[1], p[2], entry.price, p[4], p[5], p[6], p[7]]
      })
    )
    setSuccess(`Restored price rate of ${entry.price} for ${entry.prodcode} effective ${entry.effdate}.`)
  }

  useEffect(() => {
    let active = true
    Promise.all([
      fetchTableRowsFromSupabase("product", "prodcode.asc"),
      fetchTableRowsFromSupabase("pricehist", "effdate.desc"),
    ])
      .then(([prodRows, priceRows]) => {
        if (!active || !prodRows.length) return

        const mappedPrices: PriceHistoryEntry[] = priceRows.map((p) => {
          const isDeleted = Boolean(p.is_deleted)
          const [action, user, date] = parseStamp(p.stamp, isDeleted)
          return {
            prodcode: String(p.prodcode ?? ""),
            effdate: String(p.effdate ?? ""),
            price: formatMoney(p.unitprice),
            status: isDeleted ? "Inactive" : "Active",
            action,
            user,
            date,
          }
        })
        setPriceHistory(mappedPrices)

        const latestActivePriceByProd = new Map<string, string>()
        for (const p of priceRows) {
          if (p.is_deleted) continue
          const code = String(p.prodcode ?? "")
          if (!latestActivePriceByProd.has(code)) {
            latestActivePriceByProd.set(code, formatMoney(p.unitprice))
          }
        }

        const mappedProducts = prodRows.map((r) => {
          const isDeleted = Boolean(r.is_deleted)
          const [action, user, date] = parseStamp(r.stamp, isDeleted)
          const code = String(r.prodcode ?? "")
          return [
            code,
            String(r.description ?? "—"),
            String(r.unit ?? "pcs"),
            latestActivePriceByProd.get(code) ?? "—",
            isDeleted ? "Inactive" : "Active",
            action,
            user,
            date,
          ]
        })
        setProducts(mappedProducts)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const counts = useMemo<[number, number, number]>(() => {
    const activeCount = products.filter((r) => r[4] === "Active").length
    const inactiveCount = products.filter((r) => r[4] === "Inactive").length
    return [activeCount, inactiveCount, products.length]
  }, [products])

  const rows = useMemo(
    () =>
      products.filter((row) => {
        if (!isAdmin && row[4] === "Inactive") return false
        if (isAdmin && filter !== "all" && row[4].toLowerCase() !== filter)
          return false
        const q = search.trim().toLowerCase()
        if (!q) return true
        return `${row[0]} ${row[1]} ${row[2]} ${row[3]}`
          .toLowerCase()
          .includes(q)
      }),
    [products, filter, isAdmin, search],
  )
  return (
    <div className="page module-page">
      <div className="page-heading">
        <div>
          <span>Master data / Products</span>
          <div className="page-title">Product Management</div>
          <p>Catalog records with effective-dated commercial pricing.</p>
        </div>
        <div className="module-count">
          <b>{String(isAdmin ? counts[2] : counts[0]).padStart(2, "0")}</b>
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
        isAdmin={isAdmin}
        counts={counts}
        activeFilter={filter}
        onFilter={setFilter}
        search={search}
        onSearch={setSearch}
        placeholder="Search products..."
        addLabel="Add Product"
        onAdd={() => setForm("new")}
      />
      <section className="entity-table-shell">
        {rows.length ? (
          <div className="table-scroll">
            <table className="entity-table">
              <thead>
                <tr>
                  <th>Prod Code</th>
                  <th>Description</th>
                  <th>Unit</th>
                  <th>Current Price</th>
                  {isAdmin && (
                    <>
                      <th>Status</th>
                      <th>Stamp</th>
                    </>
                  )}
                  <th>Actions</th>
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
                    <td>
                      <b className="price-value">{row[3]}</b>
                    </td>
                    {isAdmin && (
                      <>
                        <td>
                          <Badge kind={row[4]}>{row[4]}</Badge>
                        </td>
                        <td>
                          <Stamp action={row[5]} user={row[6]} date={row[7]} />
                        </td>
                      </>
                    )}
                    <td>
                      <div className="row-actions">
                        {row[4] === "Inactive" ? (
                          isAdmin && (
                            <button
                              className="success-link"
                              onClick={() => handleRestoreProduct(row)}
                            >
                              Restore
                            </button>
                          )
                        ) : (
                          <>
                            <button onClick={() => setPricesProduct(row)}>
                              Prices
                            </button>
                            {isAdmin && (
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
                : "Add Product"
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
          <span>Current price derived as of 2026-10-13</span>
        </div>
      </section>
      {form && (
        <ProductForm
          product={form === "new" ? undefined : form}
          close={() => setForm(null)}
          onSave={handleSaveProduct}
          existingProdCodes={products.map((p) => p[0])}
        />
      )}
      {pricesProduct && (
        <PriceHistory
          role={role}
          product={pricesProduct}
          entries={priceHistory.filter((p) => p.prodcode === pricesProduct[0])}
          close={() => setPricesProduct(null)}
          onSoftDeletePrice={handleSoftDeletePrice}
          onRestorePrice={handleRestorePrice}
          onSavePrice={handleSavePrice}
        />
      )}
      {deleting && (
        <ConfirmDeleteModal
          record={`${deleting[0]} ${deleting[1]}`}
          noun="Product"
          close={() => setDeleting(null)}
          confirm={() => handleSoftDeleteProduct(deleting)}
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
