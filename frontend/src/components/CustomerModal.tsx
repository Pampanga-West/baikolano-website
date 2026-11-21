import React, { useState } from "react"
import ModalShell from "./ModalShell"
import Button from "./Button"
import Icon from "./Icon"
import { customerApi } from "../lib/api"
import type { Customer } from "../lib/types"

const STANDARD_PAY_TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "COD", "Prepaid", "30D", "45D"]

export interface CustomerModalProps {
  customer?: Customer
  suggestedCustno?: string
  existingCustNos?: string[]
  currentUser?: {
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    role?: string
  } | null
  close: () => void
  onSaved: (message?: string) => void
}

export default function CustomerModal({
  customer,
  suggestedCustno = "C0001",
  existingCustNos = [],
  currentUser,
  close,
  onSaved,
}: CustomerModalProps) {
  const editing = Boolean(customer)
  const initialPayTerm = customer?.payterm ?? "Net 30"
  const isStandardTerm = STANDARD_PAY_TERMS.includes(initialPayTerm)

  const [custno, setCustno] = useState(customer?.custno ?? suggestedCustno)
  const [custname, setCustname] = useState(customer?.custname ?? "")
  const [address, setAddress] = useState(customer?.address ?? "")
  const [payTermSelect, setPayTermSelect] = useState(
    isStandardTerm ? initialPayTerm : "Custom"
  )
  const [customPayTerm, setCustomPayTerm] = useState(
    isStandardTerm ? "" : initialPayTerm
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ownerName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
    currentUser?.email ||
    "Authorized User"

  const title = editing ? `Edit Customer — ${customer?.custno}` : "Add Customer"
  const subtitle = editing
    ? `Update ${customer?.custname || customer?.custno} · Last modified by ${customer?.stampUser || "system"} (${customer?.stampDate || "recent"})`
    : `Enter new customer details · Account Owner: ${ownerName}`

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmedNo = custno.trim()
    const trimmedName = custname.trim()
    if (!editing && !trimmedNo) {
      setError("Customer No. is required.")
      return
    }
    if (!trimmedName) {
      setError("Customer Name is required.")
      return
    }
    if (trimmedName.length < 2) {
      setError("Customer Name must be at least 2 characters long.")
      return
    }
    if (
      !editing &&
      existingCustNos.some((no) => no.toLowerCase() === trimmedNo.toLowerCase())
    ) {
      setError(`Customer No. "${trimmedNo}" already exists.`)
      return
    }

    const resolvedPayTerm =
      payTermSelect === "Custom"
        ? customPayTerm.trim() || "Net 30"
        : payTermSelect

    setSaving(true)
    setError(null)
    try {
      if (editing && customer) {
        await customerApi.updateCustomer(customer.custno, {
          custname: trimmedName,
          address: address.trim(),
          payterm: resolvedPayTerm,
        })
        onSaved(`Successfully updated customer ${customer.custno} (${trimmedName}).`)
      } else {
        await customerApi.createCustomer({
          custno: trimmedNo || undefined,
          custname: trimmedName,
          address: address.trim(),
          payterm: resolvedPayTerm,
        })
        onSaved(`Successfully created customer ${trimmedNo || suggestedCustno} (${trimmedName}).`)
      }
      close()
    } catch (err: any) {
      setError(err.message || "Failed to save customer record.")
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
            {saving ? "Saving…" : editing ? "Save Changes" : "Save Customer"}
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
          <div className="form-error-banner form-span" role="alert" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name="alert-triangle" size={14} />
            <span>{error}</span>
          </div>
        )}

        <label>
          <span>Customer No.</span>
          <input
            value={custno}
            onChange={(e) => {
              setCustno(e.target.value)
              setError(null)
            }}
            disabled={editing}
            readOnly={editing}
            placeholder={editing ? customer?.custno : suggestedCustno}
            aria-label="Customer Number"
          />
          <small style={{ display: "block", marginTop: "4px", fontSize: "10px", color: "var(--muted)" }}>
            {editing
              ? "Locked to protect database referential integrity."
              : "Auto-generated sequence. Can be customized."}
          </small>
        </label>

        <label>
          <span>Payment Terms</span>
          <select
            value={payTermSelect}
            onChange={(e) => setPayTermSelect(e.target.value)}
            aria-label="Payment Terms"
          >
            <option value="Net 15">Net 15</option>
            <option value="Net 30">Net 30</option>
            <option value="Net 45">Net 45</option>
            <option value="Net 60">Net 60</option>
            <option value="COD">COD (Cash on Delivery)</option>
            <option value="Prepaid">Prepaid</option>
            <option value="30D">30D</option>
            <option value="45D">45D</option>
            <option value="Custom">Custom terms...</option>
          </select>
          {payTermSelect === "Custom" && (
            <input
              style={{ marginTop: "6px" }}
              value={customPayTerm}
              onChange={(e) => setCustomPayTerm(e.target.value)}
              placeholder="e.g. Net 90, Installment"
              autoFocus
            />
          )}
          <small style={{ display: "block", marginTop: "4px", fontSize: "10px", color: "var(--muted)" }}>
            Commercial credit settlement window.
          </small>
        </label>

        <label className="form-span">
          <span>Customer Name *</span>
          <input
            value={custname}
            onChange={(e) => {
              setCustname(e.target.value)
              setError(null)
            }}
            placeholder="Company or person name"
            required
            autoFocus={!editing}
            aria-label="Customer Name"
          />
        </label>

        <label className="form-span">
          <span>Billing & Delivery Address</span>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Full address (Street, suite, city, state/province, ZIP)"
            rows={3}
            aria-label="Address"
          />
        </label>

        <label className="form-span">
          <span>Assigned Account Representative</span>
          <input
            value={ownerName}
            disabled
            readOnly
            aria-label="Account Representative"
          />
        </label>
      </form>
    </ModalShell>
  )
}
