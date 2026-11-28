import React, { useState } from "react"
import ModalShell from "./ModalShell"
import Button from "./Button"
import Icon from "./Icon"
import { productApi } from "../lib/api"
import type { Product } from "../lib/types"

const STANDARD_UNITS = [
  "pcs",
  "box",
  "kg",
  "liter",
  "can",
  "pair",
  "meter",
  "pack",
  "set",
  "roll",
]

export interface ProductModalProps {
  product?: Product
  suggestedProdcode?: string
  existingProdCodes?: string[]
  currentUser?: {
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    role?: string
  } | null
  close: () => void
  onSaved: (message?: string) => void
}

export default function ProductModal({
  product,
  suggestedProdcode = "P0001",
  existingProdCodes = [],
  currentUser,
  close,
  onSaved,
}: ProductModalProps) {
  const editing = Boolean(product)
  const initialUnit = product?.unit ?? "pcs"
  const isStandardUnit = STANDARD_UNITS.includes(initialUnit)

  const [prodcode, setProdcode] = useState(product?.prodcode ?? suggestedProdcode)
  const [description, setDescription] = useState(product?.description ?? "")
  const [unitSelect, setUnitSelect] = useState(
    isStandardUnit ? initialUnit : "Custom"
  )
  const [customUnit, setCustomUnit] = useState(
    isStandardUnit ? "" : initialUnit
  )
  const [initialPrice, setInitialPrice] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ownerName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
    currentUser?.email ||
    "Authorized User"

  const title = editing ? `Edit Product — ${product?.prodcode}` : "Add Product"
  const subtitle = editing
    ? `Update ${product?.description || product?.prodcode} · Last modified by ${product?.stampUser || "system"} (${product?.stampDate || "recent"})`
    : `Enter new product details · Catalog Manager: ${ownerName}`

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmedCode = prodcode.trim().toUpperCase()
    const trimmedDesc = description.trim()

    if (!editing && !trimmedCode) {
      setError("Product Code / SKU is required.")
      return
    }
    if (!trimmedDesc) {
      setError("Product description is required.")
      return
    }
    if (trimmedDesc.length < 2) {
      setError("Product description must be at least 2 characters long.")
      return
    }
    if (
      !editing &&
      existingProdCodes.some((code) => code.trim().toUpperCase() === trimmedCode)
    ) {
      setError(`Product Code "${trimmedCode}" already exists in the catalog.`)
      return
    }

    let parsedInitialPrice: number | undefined = undefined
    if (!editing && initialPrice.trim()) {
      const num = parseFloat(initialPrice.replace(/[^0-9.]/g, ""))
      if (isNaN(num) || num <= 0) {
        setError("Initial unit price must be a valid number greater than 0.")
        return
      }
      parsedInitialPrice = num
    }

    const resolvedUnit =
      unitSelect === "Custom"
        ? customUnit.trim() || "pcs"
        : unitSelect

    setSaving(true)
    setError(null)
    try {
      if (editing && product) {
        await productApi.updateProduct(product.prodcode, {
          description: trimmedDesc,
          unit: resolvedUnit,
        })
        onSaved(`Successfully updated product ${product.prodcode} (${trimmedDesc}).`)
      } else {
        await productApi.createProduct({
          prodcode: trimmedCode || undefined,
          description: trimmedDesc,
          unit: resolvedUnit,
          initialPrice: parsedInitialPrice,
        })
        onSaved(`Successfully created product ${trimmedCode || suggestedProdcode} (${trimmedDesc}).`)
      }
      close()
    } catch (err: any) {
      setError(err.message || "Failed to save product record.")
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
            {saving ? "Saving…" : editing ? "Save Changes" : "Save Product"}
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
      <form onSubmit={handleSubmit} className="record-form">
        {error && (
          <div
            className="form-error-banner form-span"
            role="alert"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Icon name="alert-triangle" size={14} />
            <span>{error}</span>
          </div>
        )}

        <label>
          <span>Product Code / SKU</span>
          <input
            value={prodcode}
            onChange={(e) => {
              setProdcode(e.target.value)
              setError(null)
            }}
            disabled={editing}
            readOnly={editing}
            placeholder={editing ? product?.prodcode : suggestedProdcode}
            aria-label="Product Code"
          />
          <small
            style={{
              display: "block",
              marginTop: "4px",
              fontSize: "10px",
              color: "var(--muted)",
            }}
          >
            {editing
              ? "Locked to protect database referential integrity across sales and price schedules."
              : "Auto-generated sequence. Can be customized."}
          </small>
        </label>

        <label>
          <span>Unit of Measure</span>
          <select
            value={unitSelect}
            onChange={(e) => setUnitSelect(e.target.value)}
            aria-label="Unit of Measure"
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
              style={{ marginTop: "6px" }}
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value)}
              placeholder="e.g. bundle, drum, sheet"
              autoFocus
            />
          )}
          <small
            style={{
              display: "block",
              marginTop: "4px",
              fontSize: "10px",
              color: "var(--muted)",
            }}
          >
            Inventory and billing unit.
          </small>
        </label>

        <label className="form-span">
          <span>Product Description *</span>
          <input
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              setError(null)
            }}
            placeholder="e.g. Industrial Widget A, Heavy Duty Steel Bracket"
            required
            autoFocus={!editing}
            aria-label="Product Description"
          />
        </label>

        {!editing ? (
          <label>
            <span>Initial Commercial Price (Optional)</span>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "11px",
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
                style={{ paddingLeft: "26px" }}
                value={initialPrice}
                onChange={(e) => {
                  setInitialPrice(e.target.value)
                  setError(null)
                }}
                placeholder="0.00"
                aria-label="Initial Unit Price"
              />
            </div>
            <small
              style={{
                display: "block",
                marginTop: "4px",
                fontSize: "10px",
                color: "var(--muted)",
              }}
            >
              Automatically sets initial price schedule in history.
            </small>
          </label>
        ) : (
          <label>
            <span>Current Derived Price Rate</span>
            <input
              value={product?.price || "—"}
              disabled
              readOnly
              aria-label="Current Derived Price"
            />
            <small
              style={{
                display: "block",
                marginTop: "4px",
                fontSize: "10px",
                color: "var(--muted)",
              }}
            >
              Point-in-time rates are managed via the Prices schedule history modal.
            </small>
          </label>
        )}

        <label>
          <span>Catalog Manager</span>
          <input
            value={ownerName}
            disabled
            readOnly
            aria-label="Catalog Manager"
          />
          <small
            style={{
              display: "block",
              marginTop: "4px",
              fontSize: "10px",
              color: "var(--muted)",
            }}
          >
            Logged to the audit trail upon save.
          </small>
        </label>
      </form>
    </ModalShell>
  )
}
