import React, { useEffect, useState } from "react"
import ModalShell from "./ModalShell"
import Button from "./Button"
import { salesApi } from "../lib/api"
import type { CustomerOption, SalespersonOption, SaleHeader } from "../lib/types"

export interface SaleModalProps {
  sale?:
    | SaleHeader
    | {
        transno: string
        salesdate?: string
        custno?: string
        empno?: string
        customer?: string
        salesperson?: string
      }
    | null
  suggestedTransno?: string
  customers?: CustomerOption[]
  salespersons?: SalespersonOption[]
  currentUser?: {
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    role?: string
  } | null
  close: () => void
  onSaved: (message?: string, createdSale?: SaleHeader) => void
}

export default function SaleModal({
  sale,
  suggestedTransno = "T-005",
  customers: initialCustomers,
  salespersons: initialSalespersons,
  currentUser,
  close,
  onSaved,
}: SaleModalProps) {
  const editing = Boolean(sale)

  const [transno, setTransno] = useState(
    sale?.transno ?? suggestedTransno
  )
  const [salesdate, setSalesdate] = useState(
    sale?.salesdate && sale.salesdate !== "—"
      ? sale.salesdate
      : new Date().toISOString().split("T")[0]
  )
  const [custno, setCustno] = useState(sale?.custno ?? "")
  const [empno, setEmpno] = useState(sale?.empno ?? "")

  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>(
    initialCustomers || []
  )
  const [salespersonOptions, setSalespersonOptions] = useState<
    SalespersonOption[]
  >(initialSalespersons || [])
  const [loadingOptions, setLoadingOptions] = useState(
    !initialCustomers?.length || !initialSalespersons?.length
  )
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    salesdate?: string
    custno?: string
    empno?: string
    general?: string
  }>({})

  useEffect(() => {
    let active = true
    if (!initialCustomers?.length || !initialSalespersons?.length) {
      salesApi
        .getOptions()
        .then((res) => {
          if (!active) return
          if (res.customers?.length) setCustomerOptions(res.customers)
          if (res.salespersons?.length) setSalespersonOptions(res.salespersons)
          if (!editing && res.suggestedTransno) {
            setTransno(res.suggestedTransno)
          }
          setLoadingOptions(false)
        })
        .catch(() => {
          if (active) setLoadingOptions(false)
        })
    }
    return () => {
      active = false
    }
  }, [editing, initialCustomers, initialSalespersons])

  // If editing and sale has customer/salesperson labels but not raw codes, match them
  useEffect(() => {
    if (sale && customerOptions.length && !custno) {
      const matchCust = customerOptions.find(
        (c) =>
          c.custno === sale.custno ||
          c.label === sale.customer ||
          (sale.customer && c.label.includes(sale.customer))
      )
      if (matchCust) setCustno(matchCust.custno)
    }
    if (sale && salespersonOptions.length && !empno) {
      const matchEmp = salespersonOptions.find(
        (e) =>
          e.empno === sale.empno ||
          e.label === sale.salesperson ||
          (sale.salesperson && e.label.includes(sale.salesperson))
      )
      if (matchEmp) setEmpno(matchEmp.empno)
    }
  }, [sale, customerOptions, salespersonOptions, custno, empno])

  const operatorName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
    currentUser?.email ||
    "Authorized User"

  const validate = (): boolean => {
    const errors: { salesdate?: string; custno?: string; empno?: string } = {}

    if (!salesdate.trim()) {
      errors.salesdate = "Sales date is required."
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(salesdate.trim())) {
      errors.salesdate = "Please enter a valid date in YYYY-MM-DD format."
    }

    if (!custno.trim()) {
      errors.custno = "Please select a customer."
    }

    if (!empno.trim()) {
      errors.empno = "Please select a salesperson."
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setValidationErrors({})

    if (!validate()) {
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        transno: transno.trim() || undefined,
        salesdate: salesdate.trim(),
        custno: custno.trim(),
        empno: empno.trim(),
      }

      const created = await salesApi.createSale(payload)
      onSaved(
        `Sales transaction ${created.transno || transno} recorded successfully.`,
        created
      )
      close()
    } catch (err: any) {
      setValidationErrors({
        general:
          err.message ||
          "Failed to record sales transaction. Please review inputs and try again.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      title={editing ? "Edit Sale" : "New Sale"}
      subtitle="Transaction header · product line items are added after saving."
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? "Saving..."
              : editing
              ? "Save Changes"
              : "Save Sale"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="record-form">
        {validationErrors.general && (
          <div
            className="alert-banner alert-banner-error form-span"
            style={{ marginBottom: "12px" }}
          >
            <span>{validationErrors.general}</span>
          </div>
        )}

        <label>
          <span>
            Transaction No. <small style={{ color: "var(--muted)" }}>(auto-numbered)</small>
          </span>
          <input
            value={transno}
            readOnly
            style={{
              backgroundColor: "var(--bg-muted, #f3f4f6)",
              cursor: "not-allowed",
              fontWeight: 600,
            }}
          />
        </label>

        <label>
          <span>
            Sales Date <span style={{ color: "var(--danger, #ef4444)" }}>*</span>
          </span>
          <input
            type="date"
            value={salesdate}
            onChange={(e) => {
              setSalesdate(e.target.value)
              if (validationErrors.salesdate) {
                setValidationErrors((prev) => ({ ...prev, salesdate: undefined }))
              }
            }}
            disabled={submitting}
          />
          {validationErrors.salesdate && (
            <span
              style={{
                color: "var(--danger, #ef4444)",
                fontSize: "0.75rem",
                marginTop: "4px",
              }}
            >
              {validationErrors.salesdate}
            </span>
          )}
        </label>

        <label className="form-span">
          <span>
            Customer <span style={{ color: "var(--danger, #ef4444)" }}>*</span>
          </span>
          <select
            value={custno}
            onChange={(e) => {
              setCustno(e.target.value)
              if (validationErrors.custno) {
                setValidationErrors((prev) => ({ ...prev, custno: undefined }))
              }
            }}
            disabled={submitting || loadingOptions}
          >
            <option value="">
              {loadingOptions ? "Loading customers..." : "-- Select Customer --"}
            </option>
            {customerOptions.map((c) => (
              <option key={c.custno} value={c.custno}>
                {c.label}
              </option>
            ))}
          </select>
          {validationErrors.custno && (
            <span
              style={{
                color: "var(--danger, #ef4444)",
                fontSize: "0.75rem",
                marginTop: "4px",
              }}
            >
              {validationErrors.custno}
            </span>
          )}
        </label>

        <label className="form-span">
          <span>
            Salesperson <span style={{ color: "var(--danger, #ef4444)" }}>*</span>
          </span>
          <select
            value={empno}
            onChange={(e) => {
              setEmpno(e.target.value)
              if (validationErrors.empno) {
                setValidationErrors((prev) => ({ ...prev, empno: undefined }))
              }
            }}
            disabled={submitting || loadingOptions}
          >
            <option value="">
              {loadingOptions ? "Loading salespersons..." : "-- Select Salesperson --"}
            </option>
            {salespersonOptions.map((e) => (
              <option key={e.empno} value={e.empno}>
                {e.label}
              </option>
            ))}
          </select>
          {validationErrors.empno && (
            <span
              style={{
                color: "var(--danger, #ef4444)",
                fontSize: "0.75rem",
                marginTop: "4px",
              }}
            >
              {validationErrors.empno}
            </span>
          )}
        </label>

        <div
          className="form-span"
          style={{
            marginTop: "12px",
            padding: "10px 14px",
            backgroundColor: "var(--bg-subtle, #f9fafb)",
            border: "1px solid var(--border-color, #e5e7eb)",
            borderRadius: "6px",
            fontSize: "0.8rem",
            color: "var(--muted, #6b7280)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>
            Audit &amp; Provenance Preview
          </div>
          <div>
            <b>Action:</b> {editing ? "UPDATE" : "CREATE"} · <b>Operator:</b>{" "}
            {operatorName} · <b>Timestamp:</b> Automatically stamped on save
          </div>
        </div>
      </form>
    </ModalShell>
  )
}
