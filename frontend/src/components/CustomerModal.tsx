import React, { useState } from "react"
import ModalShell from "./ModalShell"
import Button from "./Button"
import Icon from "./Icon"
import { customerApi } from "../lib/api"
import type { Customer } from "../lib/types"

export interface CustomerModalProps {
  customer?: Customer
  suggestedCustno?: string
  currentUser?: {
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    role?: string
  } | null
  close: () => void
  onSaved: () => void
}

export default function CustomerModal({
  customer,
  suggestedCustno = "C0001",
  currentUser,
  close,
  onSaved,
}: CustomerModalProps) {
  const editing = Boolean(customer)
  const [custno, setCustno] = useState(customer?.custno ?? suggestedCustno)
  const [custname, setCustname] = useState(customer?.custname ?? "")
  const [address, setAddress] = useState(customer?.address ?? "")
  const [payterm, setPayterm] = useState(customer?.payterm ?? "Net 30")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ownerName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
    currentUser?.email ||
    "Authorized User"

  const title = editing ? `Edit Customer — ${customer?.custno}` : "Add Customer"
  const subtitle = editing
    ? `Update ${customer?.custname || customer?.custno} · Last modified by ${customer?.stampUser || "system"} (${customer?.stampDate || "recent"})`
    : `Create a customer master record · Account Owner: ${ownerName}`

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmedName = custname.trim()
    if (!trimmedName) {
      setError("Customer Name is required.")
      return
    }
    if (trimmedName.length < 2) {
      setError("Customer Name must be at least 2 characters long.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (editing && customer) {
        await customerApi.updateCustomer(customer.custno, {
          custname: trimmedName,
          address: address.trim(),
          payterm,
        })
      } else {
        await customerApi.createCustomer({
          custno: custno.trim() || undefined,
          custname: trimmedName,
          address: address.trim(),
          payterm,
        })
      }
      onSaved()
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
        {error && (
          <div className="form-error-banner form-span" role="alert" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name="alert-triangle" size={14} />
            <span>{error}</span>
          </div>
        )}

        <label>
          <span>Cust No</span>
          <input
            value={custno}
            onChange={(e) => setCustno(e.target.value)}
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
          <span>Pay Terms</span>
          <select
            value={payterm}
            onChange={(e) => setPayterm(e.target.value)}
            aria-label="Payment Terms"
          >
            {["Net 15", "Net 30", "Net 45", "COD", "Prepaid", "30D", "45D"].map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
          <small style={{ display: "block", marginTop: "4px", fontSize: "10px", color: "var(--muted)" }}>
            Commercial credit settlement window.
          </small>
        </label>

        <label className="form-span">
          <span>Customer Name *</span>
          <input
            value={custname}
            onChange={(e) => setCustname(e.target.value)}
            placeholder="e.g. Wayne Enterprises Inc."
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
            placeholder="Street, suite, city, state/province, ZIP"
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
