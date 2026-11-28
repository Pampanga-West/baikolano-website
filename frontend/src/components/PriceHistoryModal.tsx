import { useEffect, useMemo, useState } from "react"
import Badge from "./Badge"
import Button from "./Button"
import ConfirmDeleteModal from "./ConfirmDeleteModal"
import ModalShell from "./ModalShell"
import Stamp from "./Stamp"
import { productApi } from "../lib/api"
import type { PriceHistoryRecord, Product, Role } from "../lib/types"

export interface PriceHistoryModalProps {
  role: Role
  product: Product
  currentUser?: {
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    role?: string
  } | null
  canManagePrices?: boolean
  initialEntries?: PriceHistoryRecord[]
  close: () => void
  onPriceChanged?: (newPrice?: string) => void
}

function PriceScheduleFormModal({
  productCode,
  entry,
  existingEffDates = [],
  operatorName,
  close,
  onSave,
}: {
  productCode: string
  entry?: PriceHistoryRecord | null
  existingEffDates?: string[]
  operatorName: string
  close: () => void
  onSave: (data: {
    prodcode: string
    effdate: string
    unitprice: number
    isEditing?: boolean
    originalEffDate?: string
  }) => Promise<void> | void
}) {
  const isEditing = Boolean(entry)
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], [])

  const [effDate, setEffDate] = useState(entry?.effdate ?? todayStr)
  const [unitPrice, setUnitPrice] = useState(
    entry?.unitprice ? String(entry.unitprice) : entry?.price ? entry.price.replace(/[^0-9.]/g, "") : ""
  )
  const [saving, setSaving] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const title = isEditing ? "Edit Price Schedule" : "Add Price Schedule"
  const subtitle = isEditing
    ? `Update rate effective ${entry?.effdate} · Last modified by ${entry?.stampUser || "system"} (${entry?.stampDate || "recent"})`
    : `Set effective commercial rate · Catalog Manager: ${operatorName}`

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmedDate = effDate.trim()
    if (!trimmedDate) {
      setValidationError("Effective Date is required.")
      return
    }

    const numPrice = parseFloat(unitPrice.replace(/[^0-9.]/g, ""))
    if (isNaN(numPrice) || numPrice <= 0) {
      setValidationError("Please enter a valid unit price greater than 0.")
      return
    }

    // Check for collision with existing dates for this SKU (unless editing and date didn't change)
    if (!isEditing || trimmedDate !== entry?.effdate) {
      if (existingEffDates.includes(trimmedDate)) {
        setValidationError(`A price schedule for effective date ${trimmedDate} already exists for ${productCode}.`)
        return
      }
    }

    setSaving(true)
    setValidationError(null)
    try {
      await onSave({
        prodcode: productCode,
        effdate: trimmedDate,
        unitprice: numPrice,
        isEditing,
        originalEffDate: entry?.effdate,
      })
      close()
    } catch (err: any) {
      setValidationError(err.message || "Failed to save price schedule.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      title={title}
      subtitle={subtitle}
      close={close}
      footer={
        <div className="modal-footer-duo">
          <Button
            className="btn-save-main"
            onClick={() => handleSubmit()}
            disabled={saving}
          >
            {saving ? "Saving…" : isEditing ? "Save Changes" : "Save Price"}
          </Button>
          <Button
            variant="secondary"
            className="btn-cancel-main"
            onClick={close}
            disabled={saving}
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
          <label>Product Code / SKU</label>
          <input
            className="field-input"
            value={productCode}
            readOnly
            disabled
          />
        </div>
        <div className="field-group">
          <label>Effective Date *</label>
          <input
            type="date"
            className="field-input"
            value={effDate}
            onChange={(e) => {
              setEffDate(e.target.value)
              setValidationError(null)
            }}
            placeholder="YYYY-MM-DD"
            required
          />
        </div>
        <div className="field-group">
          <label>Unit Price ($) *</label>
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

export default function PriceHistoryModal({
  role,
  product,
  currentUser,
  canManagePrices = true,
  initialEntries = [],
  close,
  onPriceChanged,
}: PriceHistoryModalProps) {
  const isAdmin = role !== "User"
  const operatorName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
    currentUser?.email ||
    "Authorized User"

  const [entries, setEntries] = useState<PriceHistoryRecord[]>(initialEntries)
  const [loading, setLoading] = useState(true)
  const [priceForm, setPriceForm] = useState<"new" | PriceHistoryRecord | null>(null)
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active")
  const [deletingPrice, setDeletingPrice] = useState<PriceHistoryRecord | null>(null)
  const [restoringEffDate, setRestoringEffDate] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null)
  const [bannerError, setBannerError] = useState<string | null>(null)

  const loadPrices = () => {
    let active = true
    setLoading(true)
    productApi
      .listPriceHistory(product.prodcode)
      .then((data) => {
        if (!active) return
        if (data && data.length) {
          setEntries(data)
        } else if (initialEntries && initialEntries.length) {
          setEntries(initialEntries)
        }
      })
      .catch((err) => {
        if (!active) return
        console.warn("[PriceHistoryModal] listPriceHistory fallback:", err)
        if (initialEntries && initialEntries.length) {
          setEntries(initialEntries)
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
    const cleanup = loadPrices()
    return cleanup
  }, [product.prodcode])

  // Derive latest active price
  const latestDerivedPrice = useMemo(() => {
    const activeEntries = entries
      .filter((e) => !e.is_deleted)
      .sort((a, b) => b.effdate.localeCompare(a.effdate))
    return activeEntries.length ? activeEntries[0].price : "—"
  }, [entries])

  const counts = useMemo(() => {
    const activeCount = entries.filter((e) => !e.is_deleted).length
    const inactiveCount = entries.filter((e) => e.is_deleted).length
    return {
      active: activeCount,
      inactive: inactiveCount,
      all: entries.length,
    }
  }, [entries])

  const visibleEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (!isAdmin && entry.is_deleted) return false
      if (isAdmin && statusFilter !== "all") {
        if (statusFilter === "active" && entry.is_deleted) return false
        if (statusFilter === "inactive" && !entry.is_deleted) return false
      }
      return true
    })
  }, [entries, isAdmin, statusFilter])

  const handleSavePrice = async (data: {
    prodcode: string
    effdate: string
    unitprice: number
    isEditing?: boolean
    originalEffDate?: string
  }) => {
    setBannerError(null)
    setBannerSuccess(null)

    if (data.isEditing && data.originalEffDate) {
      try {
        await productApi.updatePriceSchedule(data.prodcode, data.originalEffDate, {
          effdate: data.effdate,
          unitprice: data.unitprice,
        })
        setBannerSuccess(`Updated price rate for ${data.prodcode} to $${data.unitprice.toFixed(2)} effective ${data.effdate}.`)
        loadPrices()
        onPriceChanged?.(`$${data.unitprice.toFixed(2)}`)
      } catch (err: any) {
        throw new Error(err.message || "Failed to update price schedule.")
      }
    } else {
      try {
        await productApi.createPriceSchedule(data.prodcode, {
          effdate: data.effdate,
          unitprice: data.unitprice,
        })
        setBannerSuccess(`Added price rate for ${data.prodcode}: $${data.unitprice.toFixed(2)} effective ${data.effdate}.`)
        loadPrices()
        onPriceChanged?.(`$${data.unitprice.toFixed(2)}`)
      } catch (err: any) {
        throw new Error(err.message || "Failed to add price schedule.")
      }
    }
  }

  const handleSoftDeletePrice = async (entry: PriceHistoryRecord) => {
    setBannerError(null)
    setBannerSuccess(null)
    setDeleteLoading(true)

    try {
      await productApi.deletePriceSchedule(entry.prodcode, entry.effdate)
      setDeletingPrice(null)
      setBannerSuccess(`Superseded price rate of ${entry.price} effective ${entry.effdate}.`)
      loadPrices()
      onPriceChanged?.()
    } catch (err: any) {
      setDeletingPrice(null)
      setBannerError(err.message || "Failed to supersede price schedule.")
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleRestorePrice = async (entry: PriceHistoryRecord) => {
    setBannerError(null)
    setBannerSuccess(null)
    setRestoringEffDate(entry.effdate)

    try {
      await productApi.restorePriceSchedule(entry.prodcode, entry.effdate)
      setBannerSuccess(`Restored price rate of ${entry.price} effective ${entry.effdate}.`)
      loadPrices()
      onPriceChanged?.()
    } catch (err: any) {
      setBannerError(err.message || "Failed to restore price schedule.")
    } finally {
      setRestoringEffDate(null)
    }
  }

  return (
    <ModalShell
      title={`Price History — ${product.prodcode}`}
      subtitle={`${product.description} · Unit: ${product.unit} · Current Price: ${latestDerivedPrice}`}
      close={close}
      wide
    >
      {bannerError && (
        <div className="error-banner" role="alert" style={{ marginBottom: "14px" }}>
          <div style={{ flex: 1 }}>
            <b>Price Schedule Error</b>
            <span>{bannerError}</span>
          </div>
          <button className="dismiss-link" onClick={() => setBannerError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {bannerSuccess && (
        <div className="info-banner" role="status" style={{ marginBottom: "14px" }}>
          <div style={{ flex: 1 }}>
            <b>Success</b>
            <span>{bannerSuccess}</span>
          </div>
          <button className="dismiss-link" onClick={() => setBannerSuccess(null)}>
            Dismiss
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="nested-toolbar">
          <div className="filter-tabs">
            <button
              className={statusFilter === "active" ? "selected" : ""}
              onClick={() => setStatusFilter("active")}
            >
              Active ({counts.active})
            </button>
            <button
              className={statusFilter === "inactive" ? "selected" : ""}
              onClick={() => setStatusFilter("inactive")}
            >
              Inactive ({counts.inactive})
            </button>
            <button
              className={statusFilter === "all" ? "selected" : ""}
              onClick={() => setStatusFilter("all")}
            >
              All ({counts.all})
            </button>
          </div>
          {canManagePrices && (
            <Button icon="plus" onClick={() => setPriceForm("new")}>
              Add Price
            </Button>
          )}
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
            {loading && !entries.length ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 2} style={{ textAlign: "center", padding: "28px" }}>
                  <div className="module-loading">
                    <span></span>
                    Loading price schedules…
                  </div>
                </td>
              </tr>
            ) : visibleEntries.length ? (
              visibleEntries.map((entry) => (
                <tr
                  key={`${entry.prodcode}-${entry.effdate}`}
                  className={entry.is_deleted ? "inactive-row" : ""}
                >
                  <td className="code-cell">{entry.effdate}</td>
                  <td>
                    <b className="price-value">{entry.price}</b>
                  </td>
                  {isAdmin && (
                    <>
                      <td>
                        <Badge kind={entry.is_deleted ? "inactive" : "active"}>
                          {entry.is_deleted ? "Inactive" : "Active"}
                        </Badge>
                      </td>
                      <td>
                        <Stamp
                          action={entry.stampAction || "CREATED"}
                          user={entry.stampUser || "system"}
                          date={entry.stampDate || "—"}
                        />
                      </td>
                      <td>
                        <div className="row-actions">
                          {entry.is_deleted ? (
                            canManagePrices && (
                              <button
                                className="success-link"
                                onClick={() => handleRestorePrice(entry)}
                                disabled={restoringEffDate === entry.effdate}
                              >
                                {restoringEffDate === entry.effdate ? "Restoring…" : "Restore"}
                              </button>
                            )
                          ) : (
                            canManagePrices && (
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
                            )
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
                  style={{ textAlign: "center", color: "var(--muted)", padding: "24px" }}
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
        <PriceScheduleFormModal
          productCode={product.prodcode}
          entry={priceForm === "new" ? null : priceForm}
          existingEffDates={entries.filter((e) => !e.is_deleted).map((e) => e.effdate)}
          operatorName={operatorName}
          close={() => setPriceForm(null)}
          onSave={handleSavePrice}
        />
      )}

      {deletingPrice && (
        <ConfirmDeleteModal
          record={`price ${deletingPrice.price} effective ${deletingPrice.effdate}`}
          noun="Price Schedule"
          operator={operatorName}
          loading={deleteLoading}
          isDeleting={deleteLoading}
          actionLabel="Supersede Price"
          close={() => setDeletingPrice(null)}
          confirm={() => handleSoftDeletePrice(deletingPrice)}
          customWarning="This will mark the price tier as Inactive/Superseded."
          customExplanation="The rate will no longer be applied to new transactions, but historical records will retain point-in-time calculation integrity."
        />
      )}
    </ModalShell>
  )
}
