import { useEffect, useMemo, useState, useCallback } from "react"
import { useAuth } from "../contexts/AuthContext"
import {
  fetchTableRowsFromSupabase,
  fetchUserRightsFromSupabase,
  formatMoney,
  parseStamp,
} from "../backend/supabaseClient"
import { rightsApi, salesApi } from "../lib/api"
import Badge from "../components/Badge"
import BlockedDeleteModal from "../components/BlockedDeleteModal"
import Button from "../components/Button"
import ConfirmDeleteModal from "../components/ConfirmDeleteModal"
import EmptyState from "../components/EmptyState"
import EntityControls from "../components/EntityControls"
import Icon from "../components/Icon"
import ModalShell from "../components/ModalShell"
import SaleModal from "../components/SaleModal"
import Stamp from "../components/Stamp"
import type {
  Role,
  SaleLineItem,
  SaleProductOption,
  PaymentRecord,
  CustomerBalanceSummary,
} from "../lib/types"

const fallbackSales = [
  [
    "T-001",
    "2026-10-01",
    "C-001 — Acme Corporation",
    "E-002 — Juan Reyes",
    "$234.50",
    "Active",
    "CREATED",
    "system",
    "2026-10-01 11:00 AM",
  ],
  [
    "T-002",
    "2026-10-05",
    "C-002 — Globex Industries",
    "E-001 — Maria Santos",
    "$140.00",
    "Active",
    "EDITED",
    "user1",
    "2026-10-13 1:01 PM",
  ],
  [
    "T-003",
    "2026-10-08",
    "C-003 — Initech LLC",
    "E-002 — Juan Reyes",
    "$510.00",
    "Active",
    "CREATED",
    "system",
    "2026-10-08 2:00 PM",
  ],
  [
    "T-004",
    "2026-09-20",
    "C-005 — Stark Enterprises",
    "E-003 — Ana Cruz",
    "$0.00",
    "Inactive",
    "DELETED",
    "user2",
    "2026-10-13 1:01 PM",
  ],
]


const fallbackSaleLines: SaleLineItem[] = [
  {
    transno: "T-001",
    prodcode: "P-001",
    product: "P-001 — Industrial Widget A",
    qty: "10",
    quantity: 10,
    unitPrice: "$13.75",
    unitPriceNum: 13.75,
    lineTotal: "$137.50",
    lineTotalNum: 137.5,
    is_deleted: false,
    status: "Active",
    action: "CREATED",
    user: "system",
    date: "2026-10-01 11:02 AM",
  },
  {
    transno: "T-001",
    prodcode: "P-002",
    product: "P-002 — Steel Bracket Heavy",
    qty: "2",
    quantity: 2,
    unitPrice: "$48.50",
    unitPriceNum: 48.5,
    lineTotal: "$97.00",
    lineTotalNum: 97,
    is_deleted: false,
    status: "Active",
    action: "CREATED",
    user: "system",
    date: "2026-10-01 11:02 AM",
  },
]

const fallbackPayments: PaymentRecord[] = [
  {
    orno: "OR-1000",
    transno: "T-001",
    paydate: "2026-10-08",
    amount: "$100.00",
    amountNum: 100,
    status: "Active",
    action: "CREATED",
    user: "system",
    date: "2026-10-08 9:15 AM",
  },
]

function LineForm({
  transno,
  salesdate,
  initialLine,
  productOptions,
  close,
  onSaved,
}: {
  transno: string
  salesdate: string
  initialLine?: SaleLineItem | null
  productOptions: SaleProductOption[]
  close: () => void
  onSaved: (msg: string) => void
}) {
  const isEditing = Boolean(initialLine)
  const defaultProd =
    initialLine?.prodcode ||
    (initialLine?.product ? initialLine.product.split(" ")[0] : "") ||
    productOptions[0]?.prodcode ||
    "P-001"

  const [selectedProd, setSelectedProd] = useState(defaultProd)
  const [qty, setQty] = useState(
    initialLine
      ? String(initialLine.quantity || initialLine.qty || 1)
      : "1"
  )
  const [unitPrice, setUnitPrice] = useState<number>(
    initialLine?.unitPriceNum || 0
  )
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isEditing && initialLine?.unitPriceNum !== undefined && (initialLine.prodcode === selectedProd || !selectedProd)) {
      setUnitPrice(initialLine.unitPriceNum)
      return
    }

    const matched = productOptions.find((p) => p.prodcode === selectedProd)
    if (matched?.currentPrice !== undefined) {
      setUnitPrice(matched.currentPrice)
    }

    if (transno && selectedProd) {
      let active = true
      setLoadingPrice(true)
      salesApi
        .resolveUnitPrice(transno, selectedProd)
        .then((res) => {
          if (active && typeof res?.unitPrice === "number") {
            setUnitPrice(res.unitPrice)
          }
        })
        .catch((err) => {
          console.warn("Failed to resolve unit price:", err)
        })
        .finally(() => {
          if (active) setLoadingPrice(false)
        })
      return () => {
        active = false
      }
    }
  }, [transno, selectedProd, isEditing, initialLine, productOptions])

  const parsedQty = Number(qty)
  const isQtyValid = Number.isInteger(parsedQty) && parsedQty > 0
  const calculatedTotal = (isQtyValid ? parsedQty : 0) * (unitPrice || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedProd) {
      setError("Please select a product.")
      return
    }

    if (!isQtyValid) {
      setError("Quantity must be a positive integer greater than 0.")
      return
    }

    setSaving(true)
    try {
      if (isEditing && initialLine) {
        const prodcode = initialLine.prodcode || selectedProd
        await salesApi.updateDetail(transno, prodcode, {
          quantity: parsedQty,
        })
        onSaved(`Line item for ${initialLine.product || prodcode} updated successfully.`)
      } else {
        await salesApi.addDetail(transno, {
          prodcode: selectedProd,
          quantity: parsedQty,
        })
        onSaved(`Line item added successfully to transaction ${transno}.`)
      }
      close()
    } catch (err: any) {
      setError(err.message || "Failed to save sale line item.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      title={isEditing ? `Edit Sale Line — ${transno}` : `Add Sale Line — ${transno}`}
      subtitle={`Unit price is resolved from price history as of ${salesdate || "sales date"}.`}
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || loadingPrice}>
            {saving ? "Saving..." : isEditing ? "Save Line" : "Add Line"}
          </Button>
        </>
      }
    >
      <form className="record-form" onSubmit={handleSubmit}>
        {error && (
          <div className="alert-banner alert-banner-error form-span">
            <Icon name="alert-triangle" size={16} />
            <span>{error}</span>
          </div>
        )}

        <label className="form-span">
          <span>Product</span>
          {isEditing ? (
            <input
              type="text"
              readOnly
              value={initialLine?.product || selectedProd}
              className="read-only-input"
            />
          ) : (
            <select
              value={selectedProd}
              onChange={(e) => setSelectedProd(e.target.value)}
              disabled={saving}
            >
              {productOptions.length ? (
                productOptions.map((opt) => (
                  <option key={opt.prodcode} value={opt.prodcode}>
                    {opt.label || `${opt.prodcode} — ${opt.description}`}
                  </option>
                ))
              ) : (
                <>
                  <option value="P-001">P-001 — Industrial Widget A</option>
                  <option value="P-002">P-002 — Steel Bracket Heavy</option>
                </>
              )}
            </select>
          )}
        </label>

        <label>
          <span>Quantity</span>
          <input
            type="number"
            min="1"
            step="1"
            value={qty}
            onChange={(e) => {
              setQty(e.target.value)
              if (error) setError(null)
            }}
            disabled={saving}
            required
          />
        </label>

        <label>
          <span>Unit Price</span>
          <input
            value={`${formatMoney(unitPrice)} · auto-filled`}
            readOnly
            className="read-only-input"
          />
        </label>

        <div
          className="form-span"
          style={{
            marginTop: "8px",
            padding: "10px 14px",
            background: "var(--surface-muted, #f8f9fa)",
            borderRadius: "6px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Line Total:</span>
          <b style={{ fontSize: "1.1rem", color: "var(--primary, #0284c7)" }}>
            {formatMoney(calculatedTotal)}
          </b>
        </div>
      </form>
    </ModalShell>
  )
}

function SaleDetails({
  role,
  sale,
  lines,
  productOptions,
  canAddDetail,
  canEditDetail,
  canDeleteDetail,
  canViewInactive,
  onSoftDeleteLine,
  onRestoreLine,
  onLineSaved,
  close,
}: {
  role: Role
  sale: string[]
  lines: SaleLineItem[]
  productOptions: SaleProductOption[]
  canAddDetail: boolean
  canEditDetail: boolean
  canDeleteDetail: boolean
  canViewInactive: boolean
  onSoftDeleteLine: (line: SaleLineItem) => Promise<void> | void
  onRestoreLine: (line: SaleLineItem) => Promise<void> | void
  onLineSaved: (msg: string) => Promise<void> | void
  close: () => void
}) {
  const [showLineForm, setShowLineForm] = useState(false)
  const [editingLine, setEditingLine] = useState<SaleLineItem | null>(null)
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active")
  const [deletingLine, setDeletingLine] = useState<SaleLineItem | null>(null)

  const visibleLines = lines.filter((line) => {
    if (!canViewInactive && line.status === "Inactive") return false
    if (canViewInactive && statusFilter !== "all" && line.status.toLowerCase() !== statusFilter) {
      return false
    }
    return true
  })

  const activeTotal = lines
    .filter((l) => l.status === "Active")
    .reduce((sum, l) => sum + (l.lineTotalNum || 0), 0)

  return (
    <ModalShell
      title={`Sale Details — ${sale[0]}`}
      subtitle={`${sale[1]} · ${sale[2]}`}
      close={close}
      wide
      footer={
        <div className="detail-total">
          <span>
            {lines.filter((l) => l.status === "Active").length} active lines
          </span>
          <b>Total: {formatMoney(activeTotal || Number(sale[4]?.replace(/[^0-9.-]+/g, "")) || 0)}</b>
        </div>
      }
    >
      {(canViewInactive || canAddDetail) && (
        <div className="nested-toolbar">
          {canViewInactive ? (
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
          ) : <div />}
          {canAddDetail && (
            <Button
              icon="plus"
              onClick={() => {
                setEditingLine(null)
                setShowLineForm(true)
              }}
            >
              Add Line
            </Button>
          )}
        </div>
      )}
      <div className="table-scroll">
        <table className="entity-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Line Total</th>
              {canViewInactive && (
                <>
                  <th>Status</th>
                  <th>Stamp</th>
                </>
              )}
              {(canEditDetail || canDeleteDetail) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {visibleLines.length ? (
              visibleLines.map((row, idx) => (
                <tr
                  key={`${row.prodcode || row.product}-${idx}`}
                  className={row.status === "Inactive" ? "inactive-row" : ""}
                >
                  <td>
                    <b className="record-name">{row.product || row.prodcode}</b>
                  </td>
                  <td>{row.qty}</td>
                  <td>{row.unitPrice}</td>
                  <td>
                    <b className="price-value">{row.lineTotal}</b>
                  </td>
                  {canViewInactive && (
                    <>
                      <td>
                        <Badge kind={row.status.toLowerCase()}>
                          {row.status}
                        </Badge>
                      </td>
                      <td>
                        <Stamp
                          action={row.action || "CREATED"}
                          user={row.user || "system"}
                          date={row.date || ""}
                        />
                      </td>
                    </>
                  )}
                  {(canEditDetail || canDeleteDetail) && (
                    <td>
                      <div className="row-actions">
                        {row.status === "Inactive" ? (
                          (canEditDetail || canDeleteDetail) && (
                            <button
                              className="success-link"
                              onClick={() => onRestoreLine(row)}
                            >
                              Restore
                            </button>
                          )
                        ) : (
                          <>
                            {canEditDetail && (
                              <button
                                onClick={() => {
                                  setEditingLine(row)
                                  setShowLineForm(true)
                                }}
                              >
                                Edit
                              </button>
                            )}
                            {canDeleteDetail && (
                              <button
                                className="danger-link"
                                onClick={() => setDeletingLine(row)}
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
              ))
            ) : (
              <tr>
                <td
                  colSpan={(canViewInactive ? 6 : 4) + (canEditDetail || canDeleteDetail ? 1 : 0)}
                  style={{
                    textAlign: "center",
                    color: "var(--muted)",
                    padding: "20px",
                  }}
                >
                  No line items found for {sale[0]}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showLineForm && (
        <LineForm
          transno={sale[0]}
          salesdate={sale[1]}
          initialLine={editingLine}
          productOptions={productOptions}
          close={() => {
            setShowLineForm(false)
            setEditingLine(null)
          }}
          onSaved={onLineSaved}
        />
      )}
      {deletingLine && (
        <ConfirmDeleteModal
          title="Deactivate Line Item?"
          targetLabel={`${deletingLine.product || deletingLine.prodcode} (Qty: ${deletingLine.qty})`}
          warningMessage={`Are you sure you want to deactivate this line item from transaction ${sale[0]}? The item will be soft-deleted, marked Inactive, and the invoice amount updated.`}
          actionLabel="Deactivate Line Item"
          onConfirm={async () => {
            const target = deletingLine
            setDeletingLine(null)
            await onSoftDeleteLine(target)
          }}
          onClose={() => setDeletingLine(null)}
        />
      )}
    </ModalShell>
  )
}

function Payments({
  role,
  sale,
  receipts,
  customerBalances,
  canRecordPayment,
  canVoidPayment,
  canViewInactive,
  onSoftDeleteReceipt,
  onRestoreReceipt,
  onPaymentRecorded,
  close,
}: {
  role: Role
  sale: string[]
  receipts: PaymentRecord[]
  customerBalances: CustomerBalanceSummary[]
  canRecordPayment: boolean
  canVoidPayment: boolean
  canViewInactive: boolean
  onSoftDeleteReceipt: (receipt: PaymentRecord) => Promise<void> | void
  onRestoreReceipt: (receipt: PaymentRecord) => Promise<void> | void
  onPaymentRecorded: (msg?: string) => Promise<void> | void
  close: () => void
}) {
  const [tab, setTab] = useState<"payments" | "balances">("payments")
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active")
  const [deletingReceipt, setDeletingReceipt] = useState<PaymentRecord | null>(null)

  // Payment Form state
  const [orno, setOrno] = useState("")
  const [paydate, setPaydate] = useState(new Date().toISOString().split("T")[0])
  const [amount, setAmount] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const visibleReceipts = receipts.filter((r) => {
    if (!canViewInactive && r.status === "Inactive") return false
    if (canViewInactive && statusFilter !== "all" && r.status.toLowerCase() !== statusFilter) {
      return false
    }
    return true
  })

  const saleTotalNum = Number(sale[4]?.replace(/[^0-9.-]+/g, "")) || 0
  const totalPaidNum = receipts
    .filter((r) => r.status === "Active")
    .reduce((sum, r) => sum + r.amountNum, 0)
  const remainingNum = Math.max(0, saleTotalNum - totalPaidNum)

  // Load next OR number on open
  useEffect(() => {
    let active = true
    salesApi
      .getNextOrno()
      .then((res) => {
        if (active && res?.nextOrno) {
          setOrno(res.nextOrno)
        }
      })
      .catch(() => {
        if (active) setOrno("OR-1001")
      })
    return () => {
      active = false
    }
  }, [sale[0]])

  // Set default amount to remaining balance if empty
  useEffect(() => {
    if (remainingNum > 0 && !amount) {
      setAmount(remainingNum.toFixed(2))
    }
  }, [remainingNum])

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const cleanOrno = orno.trim().toUpperCase()
    if (!cleanOrno) {
      setFormError("Official Receipt No. is required.")
      return
    }

    if (!paydate) {
      setFormError("Payment date is required.")
      return
    }

    const numAmount = Number(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("Payment amount must be greater than 0.")
      return
    }

    if (remainingNum > 0 && numAmount > remainingNum + 0.001) {
      setFormError(
        `Payment amount (${formatMoney(numAmount)}) cannot exceed remaining invoice balance of ${formatMoney(remainingNum)}.`
      )
      return
    }

    setSaving(true)
    try {
      await salesApi.recordPayment(sale[0], {
        orno: cleanOrno,
        paydate,
        amount: numAmount,
      })
      await onPaymentRecorded(`Payment of ${formatMoney(numAmount)} recorded under receipt ${cleanOrno}.`)
      // Refresh next OR number and reset amount
      const nextRes = await salesApi.getNextOrno().catch(() => null)
      if (nextRes?.nextOrno) setOrno(nextRes.nextOrno)
      setAmount("")
    } catch (err: any) {
      setFormError(err.message || "Failed to record payment.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell
      title={`Payments & Balance — ${sale[0]}`}
      subtitle={`${sale[2]} · ${sale[1]}`}
      close={close}
      wide
      footer={
        <Button variant="secondary" onClick={close}>
          Close
        </Button>
      }
    >
      <div className="module-subnav compact-subnav">
        <button
          className={tab === "payments" ? "selected" : ""}
          onClick={() => setTab("payments")}
        >
          Payment History
        </button>
        <button
          className={tab === "balances" ? "selected" : ""}
          onClick={() => setTab("balances")}
        >
          Customer Balance Summary
        </button>
      </div>
      {tab === "payments" ? (
        <>
          <div className="balance-strip">
            <div>
              <span>Sale Total</span>
              <b>{formatMoney(saleTotalNum)}</b>
            </div>
            <div>
              <span>Total Paid</span>
              <b className="paid">{formatMoney(totalPaidNum)}</b>
            </div>
            <div>
              <span>Remaining Balance</span>
              <b className="owing">{formatMoney(remainingNum)}</b>
            </div>
          </div>
          <div
            className="payments-layout"
            style={!canRecordPayment ? { gridTemplateColumns: "1fr" } : undefined}
          >
            <div className="payment-table">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div className="section-kicker" style={{ margin: 0 }}>Receipt history</div>
                {canViewInactive && (
                  <div className="filter-tabs" style={{ margin: 0 }}>
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
                )}
              </div>
              <div className="table-scroll">
                <table className="entity-table">
                  <thead>
                    <tr>
                      <th>OR No</th>
                      <th>Pay Date</th>
                      <th>Amount</th>
                      {canViewInactive && (
                        <>
                          <th>Status</th>
                          <th>Stamp</th>
                        </>
                      )}
                      {canVoidPayment && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleReceipts.length ? (
                      visibleReceipts.map((r) => (
                        <tr
                          key={r.orno}
                          className={r.status === "Inactive" ? "inactive-row" : ""}
                        >
                          <td className="code-cell">{r.orno}</td>
                          <td>{r.paydate}</td>
                          <td>
                            <b className="price-value">{r.amount}</b>
                          </td>
                          {canViewInactive && (
                            <>
                              <td>
                                <Badge kind={r.status.toLowerCase()}>
                                  {r.status}
                                </Badge>
                              </td>
                              <td>
                                <Stamp
                                  action={r.action || "CREATED"}
                                  user={r.user || "system"}
                                  date={r.date || ""}
                                />
                              </td>
                            </>
                          )}
                          {canVoidPayment && (
                            <td>
                              <div className="row-actions">
                                {r.status === "Inactive" ? (
                                  <button
                                    className="success-link"
                                    onClick={() => onRestoreReceipt(r)}
                                  >
                                    Restore
                                  </button>
                                ) : (
                                  <button
                                    className="danger-link"
                                    onClick={() => setDeletingReceipt(r)}
                                  >
                                    Void
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3 + (canViewInactive ? 2 : 0) + (canVoidPayment ? 1 : 0)}
                          style={{
                            textAlign: "center",
                            color: "var(--muted)",
                            padding: "20px",
                          }}
                        >
                          No payments recorded for {sale[0]}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {canRecordPayment && (
              <form className="payment-form" onSubmit={handleSavePayment}>
                <div className="section-kicker">Record payment</div>
                {formError && (
                  <div className="alert-banner alert-banner-error" style={{ marginBottom: "12px", padding: "8px 12px" }}>
                    <Icon name="alert-triangle" size={14} />
                    <span>{formError}</span>
                  </div>
                )}
                <label>
                  <span>Official Receipt No.</span>
                  <input
                    value={orno}
                    onChange={(e) => {
                      setOrno(e.target.value)
                      if (formError) setFormError(null)
                    }}
                    placeholder="OR-1001"
                    required
                    disabled={saving}
                  />
                </label>
                <label>
                  <span>Payment Date</span>
                  <input
                    type="date"
                    value={paydate}
                    onChange={(e) => {
                      setPaydate(e.target.value)
                      if (formError) setFormError(null)
                    }}
                    required
                    disabled={saving}
                  />
                </label>
                <label>
                  <span>Amount</span>
                  <div className="money-input">
                    <span>$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value)
                        if (formError) setFormError(null)
                      }}
                      placeholder="0.00"
                      required
                      disabled={saving}
                    />
                  </div>
                </label>
                <Button className="full" disabled={saving || (saleTotalNum > 0 && remainingNum <= 0)}>
                  {saving ? "Saving Payment..." : (saleTotalNum > 0 && remainingNum <= 0) ? "Fully Paid" : "Save Payment"}
                </Button>
              </form>
            )}
          </div>
        </>
      ) : (
        <div className="balance-summary">
          <div className="section-kicker">Accounts receivable by customer</div>
          <div className="table-scroll">
            <table className="entity-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Total Billed</th>
                  <th>Total Paid</th>
                  <th>Open Balance</th>
                </tr>
              </thead>
              <tbody>
                {customerBalances.map((cb) => (
                  <tr key={cb.customer}>
                    <td>
                      <b className="record-name">{cb.customer}</b>
                    </td>
                    <td>{formatMoney(cb.billed)}</td>
                    <td className="paid-text">{formatMoney(cb.paid)}</td>
                    <td>
                      {cb.open > 0 ? (
                        <b className="owing-text">{formatMoney(cb.open)}</b>
                      ) : (
                        formatMoney(0)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {deletingReceipt && (
        <ConfirmDeleteModal
          title="Void / Deactivate Receipt?"
          targetLabel={`${deletingReceipt.orno} — ${deletingReceipt.amount}`}
          warningMessage={`Are you sure you want to void receipt ${deletingReceipt.orno}? The payment will be soft-deleted and marked Inactive. Customer open balance will be automatically adjusted.`}
          actionLabel="Void Receipt"
          onConfirm={async () => {
            const target = deletingReceipt
            setDeletingReceipt(null)
            await onSoftDeleteReceipt(target)
          }}
          onClose={() => setDeletingReceipt(null)}
        />
      )}
    </ModalShell>
  )
}

export default function SalesPage({ role }: { role: Role }) {
  const { user } = useAuth()
  const [rights, setRights] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

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
      .catch(async () => {
        try {
          const direct = await fetchUserRightsFromSupabase(user.id)
          if (active) setRights(direct || [])
        } catch {
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
        rl === `sale - ${n}` ||
        rl === `sales - ${n}` ||
        rl === `${n} sale` ||
        rl === `${n} sales` ||
        (rl.includes("sale") && rl.includes(n))
      )
    })
  }

  const canAdd =
    isSuperadmin ||
    hasRight("add sale") ||
    hasRight("add sales") ||
    (hasRight("add") && !rights.some((r) => r.toLowerCase().includes("detail")))
  const canEdit =
    isSuperadmin ||
    hasRight("edit sale") ||
    hasRight("edit sales") ||
    (hasRight("edit") && !rights.some((r) => r.toLowerCase().includes("detail")))
  const canDelete =
    isSuperadmin ||
    hasRight("delete sale") ||
    hasRight("delete sales") ||
    (hasRight("delete") && !rights.some((r) => r.toLowerCase().includes("detail")))
  const canViewInactive = isSuperadmin || isAdminRole || canEdit || canDelete
  const canFilter = isSuperadmin || isAdminRole || canAdd || canEdit || canDelete || rights.length > 0
  const showAudit = isSuperadmin || isAdminRole || canEdit || canDelete
  const hasActions = canEdit || canDelete

  // Sale Detail Rights (TC-SALE-06)
  const canViewDetail =
    isSuperadmin ||
    isAdminRole ||
    rights.some((r) => {
      const l = r.toLowerCase().trim()
      return (
        l.includes("view sale detail") ||
        l.includes("sale detail") ||
        l === "view sales" ||
        l === "sales"
      )
    }) ||
    rights.length === 0
  const canAddDetail =
    isSuperadmin ||
    isAdminRole ||
    rights.some((r) => {
      const l = r.toLowerCase().trim()
      return (
        l === "add sale detail" ||
        l === "sale detail - add" ||
        (l.includes("add") && l.includes("detail"))
      )
    })
  const canEditDetail =
    isSuperadmin ||
    isAdminRole ||
    rights.some((r) => {
      const l = r.toLowerCase().trim()
      return (
        l === "edit sale detail" ||
        l === "sale detail - edit" ||
        (l.includes("edit") && l.includes("detail"))
      )
    })
  const canDeleteDetail =
    isSuperadmin ||
    isAdminRole ||
    rights.some((r) => {
      const l = r.toLowerCase().trim()
      return (
        l === "delete sale detail" ||
        l === "sale detail - delete" ||
        (l.includes("delete") && l.includes("detail"))
      )
    })
  const canViewInactiveDetail = isSuperadmin || isAdminRole || canEditDetail || canDeleteDetail

  // Payment Rights (S4-DEV-03)
  const canRecordPayment =
    isSuperadmin ||
    isAdminRole ||
    rights.some((r) => {
      const l = r.toLowerCase().trim()
      return (
        l.includes("record payment") ||
        l.includes("add payment") ||
        l === "add sale" ||
        l === "edit sale"
      )
    }) ||
    canEdit ||
    canAdd
  const canVoidPayment =
    isSuperadmin ||
    isAdminRole ||
    rights.some((r) => {
      const l = r.toLowerCase().trim()
      return (
        l.includes("delete payment") ||
        l.includes("void payment") ||
        l === "delete sale"
      )
    }) ||
    canDelete
  const canViewInactivePayment = isSuperadmin || isAdminRole || canVoidPayment

  const [sales, setSales] = useState<string[][]>(fallbackSales)
  const [saleLines, setSaleLines] =
    useState<SaleLineItem[]>(fallbackSaleLines)
  const [productOptions, setProductOptions] = useState<SaleProductOption[]>([])
  const [paymentRecords, setPaymentRecords] =
    useState<PaymentRecord[]>(fallbackPayments)
  const [filter, setFilter] = useState("active")
  const [search, setSearch] = useState("")
  const [saleForm, setSaleForm] = useState<"new" | "edit" | null>(null)
  const [detailsSale, setDetailsSale] = useState<string[] | null>(null)
  const [paymentsSale, setPaymentsSale] = useState<string[] | null>(null)
  const [deletingSale, setDeletingSale] = useState<string[] | null>(null)
  const [blockedModal, setBlockedModal] = useState<{
    title: string
    subtitle: string
    reason: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const recalculateTransTotal = (
    transno: string,
    updatedLines: SaleLineItem[]
  ) => {
    const activeTotal = updatedLines
      .filter((l) => l.transno === transno && l.status === "Active")
      .reduce((sum, l) => sum + l.lineTotalNum, 0)
    setSales((prev) =>
      prev.map((s) => (s[0] === transno ? [...s.slice(0, 4), formatMoney(activeTotal), ...s.slice(5)] : s))
    )
  }

  const handleDeleteSaleClick = (row: string[]) => {
    const activePayments = paymentRecords.filter(
      (p) => p.transno === row[0] && p.status === "Active"
    )
    if (activePayments.length > 0) {
      setBlockedModal({
        title: "Referential Integrity Guard",
        subtitle: `Cannot deactivate sales transaction ${row[0]}`,
        reason: `Sales transaction ${row[0]} has recorded active payment receipts (${activePayments
          .map((p) => p.orno)
          .join(", ")}). Void all related receipts before deactivating this sales transaction.`,
      })
      return
    }
    setDeletingSale(row)
  }

  const confirmSoftDeleteSale = async () => {
    if (!deletingSale) return
    const transno = deletingSale[0]
    try {
      await salesApi.softDeleteSale(transno)
      setSales((prev) =>
        prev.map((s) =>
          s[0] === transno
            ? [
                s[0],
                s[1],
                s[2],
                s[3],
                s[4],
                "Inactive",
                "DELETED",
                user?.email || "system",
                new Date().toISOString(),
              ]
            : s
        )
      )
      setSuccess(
        `Sales transaction ${transno} has been deactivated (soft-deleted). Record preserved for accounting audit history.`
      )
      setDeletingSale(null)
      loadSalesData()
    } catch (err: any) {
      setDeletingSale(null)
      if (err.referentialIntegrity) {
        setBlockedModal({
          title: "Referential Integrity Guard",
          subtitle: `Cannot deactivate sales transaction ${transno}`,
          reason: err.message,
        })
      } else {
        setError(err.message || `Failed to deactivate sales transaction ${transno}.`)
      }
    }
  }

  const handleRestoreSale = async (transno: string) => {
    try {
      await salesApi.restoreSale(transno)
      setSales((prev) =>
        prev.map((s) =>
          s[0] === transno
            ? [
                s[0],
                s[1],
                s[2],
                s[3],
                s[4],
                "Active",
                "RESTORED",
                user?.email || "system",
                new Date().toISOString(),
              ]
            : s
        )
      )
      setSuccess(`Sales transaction ${transno} restored to active status.`)
      loadSalesData()
    } catch (err: any) {
      setError(err.message || `Failed to restore sales transaction ${transno}.`)
    }
  }

  const handleSoftDeleteLine = async (line: SaleLineItem) => {
    const prodcode = line.prodcode || line.product?.split(" ")[0]?.trim() || ""
    try {
      await salesApi.deleteDetail(line.transno, prodcode)
      setSuccess(`Line item ${line.product || prodcode} deactivated (soft-deleted).`)
      await loadSalesData()
    } catch (err: any) {
      setError(err.message || `Failed to deactivate line item ${line.product || prodcode}.`)
    }
  }

  const handleRestoreLine = async (line: SaleLineItem) => {
    const prodcode = line.prodcode || line.product?.split(" ")[0]?.trim() || ""
    try {
      await salesApi.restoreDetail(line.transno, prodcode)
      setSuccess(`Line item ${line.product || prodcode} restored to active status.`)
      await loadSalesData()
    } catch (err: any) {
      setError(err.message || `Failed to restore line item ${line.product || prodcode}.`)
    }
  }

  const handleSoftDeleteReceipt = async (receipt: PaymentRecord) => {
    try {
      await salesApi.deletePayment(receipt.orno)
      setSuccess(`Official Receipt ${receipt.orno} voided (soft-deleted). Customer open balance updated.`)
      await loadSalesData()
    } catch (err: any) {
      setError(err.message || `Failed to void receipt ${receipt.orno}.`)
    }
  }

  const handleRestoreReceipt = async (receipt: PaymentRecord) => {
    try {
      await salesApi.restorePayment(receipt.orno)
      setSuccess(`Official Receipt ${receipt.orno} restored to active status.`)
      await loadSalesData()
    } catch (err: any) {
      setError(err.message || `Failed to restore receipt ${receipt.orno}.`)
    }
  }

  const loadSalesData = useCallback(async () => {
    try {
      const [
        salesRows,
        detailRows,
        payRows,
        custRows,
        empRows,
        prodRows,
        priceRows,
      ] = await Promise.all([
        fetchTableRowsFromSupabase("sales", "transno.asc").catch(() => []),
        fetchTableRowsFromSupabase("salesdetail", "transno.asc").catch(() => []),
        fetchTableRowsFromSupabase("payment", "orno.asc").catch(() => []),
        fetchTableRowsFromSupabase("customer", "custno.asc").catch(() => []),
        fetchTableRowsFromSupabase("employee", "empno.asc").catch(() => []),
        fetchTableRowsFromSupabase("product", "prodcode.asc").catch(() => []),
        fetchTableRowsFromSupabase("pricehist", "effdate.desc").catch(() => []),
      ])

      if (!salesRows?.length) {
        setLoading(false)
        return
      }

      const custMap = new Map<string, string>()
      for (const c of custRows || []) {
        const cNo = String(c.custno ?? "").trim()
        if (cNo) custMap.set(cNo.toUpperCase(), `${cNo} — ${c.custname ?? ""}`)
      }

      const empMap = new Map<string, string>()
      for (const e of empRows || []) {
        const eNo = String(e.empno ?? "").trim()
        if (eNo)
          empMap.set(
            eNo.toUpperCase(),
            `${eNo} — ${e.firstname ?? ""} ${e.lastname ?? ""}`.trim()
          )
      }

      const prodMap = new Map<string, string>()
      for (const p of prodRows || []) {
        const pCode = String(p.prodcode ?? "").trim()
        if (pCode) prodMap.set(pCode.toUpperCase(), `${pCode} — ${p.description ?? ""}`)
      }

      const priceByProd = new Map<string, { effdate: string; price: number }[]>()
      for (const pr of priceRows || []) {
        if (pr.is_deleted) continue
        const code = String(pr.prodcode ?? "").trim().toUpperCase()
        const list = priceByProd.get(code) ?? []
        list.push({
          effdate: String(pr.effdate ?? ""),
          price: Number(pr.unitprice) || 0,
        })
        priceByProd.set(code, list)
      }

      const saleDateMap = new Map<string, string>()
      for (const s of salesRows || []) {
        saleDateMap.set(
          String(s.transno ?? "").trim().toUpperCase(),
          String(s.salesdate ?? "")
        )
      }

      const resolveUnitPrice = (prodcode: string, salesdate: string) => {
        const list = priceByProd.get(prodcode.toUpperCase()) ?? []
        if (!list.length) return 0
        const match = list.find((p) => !salesdate || p.effdate <= salesdate)
        return match ? match.price : list[0].price
      }

      const activeProductOptions: SaleProductOption[] = (prodRows || [])
        .filter((p) => !p.is_deleted)
        .map((p) => {
          const pCode = String(p.prodcode ?? "").trim()
          const desc = String(p.description ?? "").trim()
          return {
            prodcode: pCode,
            description: desc,
            unit: String(p.unit ?? "pcs").trim(),
            label: `${pCode} — ${desc}`,
          }
        })
      setProductOptions(activeProductOptions)

      const totalByTrans = new Map<string, number>()
      const mappedLines: SaleLineItem[] = (detailRows || []).map((d) => {
        const isDeleted = Boolean(d.is_deleted)
        const [action, lineUser, date] = parseStamp(d.stamp, isDeleted)
        const tNo = String(d.transno ?? "").trim()
        const pCode = String(d.prodcode ?? "").trim()
        const qty = Number(d.quantity) || 0
        const uPrice = resolveUnitPrice(pCode, saleDateMap.get(tNo.toUpperCase()) ?? "")
        const lineTotalNum = qty * uPrice
        if (!isDeleted) {
          totalByTrans.set(
            tNo.toUpperCase(),
            (totalByTrans.get(tNo.toUpperCase()) ?? 0) + lineTotalNum
          )
        }
        return {
          transno: tNo,
          prodcode: pCode,
          product: prodMap.get(pCode.toUpperCase()) || pCode,
          qty: String(qty),
          quantity: qty,
          unitPrice: formatMoney(uPrice),
          unitPriceNum: uPrice,
          lineTotal: formatMoney(lineTotalNum),
          lineTotalNum,
          is_deleted: isDeleted,
          status: isDeleted ? "Inactive" : "Active",
          action,
          user: lineUser,
          date,
        }
      })
      setSaleLines(mappedLines)

      const mappedPayments: PaymentRecord[] = (payRows || []).map((p) => {
        const isDeleted = Boolean(p.is_deleted)
        const [action, payUser, date] = parseStamp(p.stamp, isDeleted)
        const amt = Number(p.amount) || 0
        return {
          orno: String(p.orno ?? ""),
          transno: String(p.transno ?? ""),
          paydate: String(p.paydate ?? ""),
          amount: formatMoney(amt),
          amountNum: amt,
          status: isDeleted ? "Inactive" : "Active",
          action,
          user: payUser,
          date,
        }
      })
      setPaymentRecords(mappedPayments)

      const fallbackTotals: Record<string, number> = {
        "T-001": 234.50,
        "T-002": 140.00,
        "T-003": 510.00,
        "T-004": 0.00,
      }

      const mappedSales = (salesRows || []).map((s) => {
        const isDeleted = Boolean(s.is_deleted)
        const [action, stampUser, date] = parseStamp(s.stamp, isDeleted)
        const tNo = String(s.transno ?? "").trim()
        const cNo = String(s.custno ?? "").trim().toUpperCase()
        const eNo = String(s.empno ?? "").trim().toUpperCase()
        const calculatedTotal =
          totalByTrans.get(tNo.toUpperCase()) ?? (fallbackTotals[tNo] || 0)

        return [
          tNo,
          String(s.salesdate ?? "—"),
          custMap.get(cNo) || cNo,
          empMap.get(eNo) || eNo,
          formatMoney(calculatedTotal),
          isDeleted ? "Inactive" : "Active",
          action,
          stampUser,
          date,
        ]
      })
      setSales(mappedSales)
      setDetailsSale((prev) => {
        if (!prev) return null
        const found = mappedSales.find((s) => s[0] === prev[0])
        return found || prev
      })
      setPaymentsSale((prev) => {
        if (!prev) return null
        const found = mappedSales.find((s) => s[0] === prev[0])
        return found || prev
      })
      setLoading(false)
    } catch (err: any) {
      console.warn("[SalesPage] Error loading sales data:", err)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSalesData()
  }, [loadSalesData])

  const counts = useMemo<[number, number, number]>(() => {
    const activeCount = sales.filter((r) => r[5] === "Active").length
    const inactiveCount = sales.filter((r) => r[5] === "Inactive").length
    return [activeCount, inactiveCount, sales.length]
  }, [sales])

  const activeSalesSum = useMemo(() => {
    return sales
      .filter((r) => r[5] === "Active")
      .reduce(
        (sum, r) => sum + (Number(r[4]?.replace(/[^0-9.-]+/g, "")) || 0),
        0
      )
  }, [sales])

  const customerBalances = useMemo(() => {
    const map = new Map<string, { billed: number; paid: number }>()
    const paidByTrans = new Map<string, number>()
    for (const p of paymentRecords) {
      if (p.status !== "Active") continue
      paidByTrans.set(
        p.transno,
        (paidByTrans.get(p.transno) ?? 0) + p.amountNum
      )
    }
    for (const s of sales) {
      if (s[5] !== "Active") continue
      const cust = s[2]
      const billed = Number(s[4]?.replace(/[^0-9.-]+/g, "")) || 0
      const paid = paidByTrans.get(s[0]) ?? 0
      const prev = map.get(cust) ?? { billed: 0, paid: 0 }
      map.set(cust, {
        billed: prev.billed + billed,
        paid: prev.paid + paid,
      })
    }
    return Array.from(map.entries()).map(([customer, vals]) => ({
      customer,
      billed: vals.billed,
      paid: vals.paid,
      open: Math.max(0, vals.billed - vals.paid),
    }))
  }, [sales, paymentRecords])

  const rows = useMemo(
    () =>
      sales.filter((row) => {
        if (!canViewInactive && row[5] === "Inactive") return false
        if (canFilter && filter !== "all" && row[5].toLowerCase() !== filter)
          return false
        if (!canFilter && row[5] === "Inactive") return false

        const q = search.trim().toLowerCase()
        if (!q) return true
        return row.join(" ").toLowerCase().includes(q)
      }),
    [sales, filter, canViewInactive, canFilter, search]
  )
  return (
    <div className="page module-page">
      <div className="page-heading">
        <div>
          <span>Transactions / Sales</span>
          <div className="page-title">Sales Management</div>
          <p>
            Master-detail transactions with effective pricing and receipt
            balances.
          </p>
        </div>
        <div className="module-count">
          <b>{formatMoney(activeSalesSum)}</b>
          <span>active sales value</span>
        </div>
      </div>
      {error && (
        <div className="alert-banner alert-banner-error">
          <Icon name="alert-triangle" size={16} />
          <span>{error}</span>
          <button className="alert-close" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}
      {success && (
        <div className="alert-banner alert-banner-success">
          <Icon name="check-circle" size={16} />
          <span>{success}</span>
          <button className="alert-close" onClick={() => setSuccess(null)}>
            ×
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
        placeholder="Search sales..."
        addLabel="New Sale"
        canAdd={canAdd}
        showAdd={canAdd}
        onAdd={() => {
          if (canAdd) setSaleForm("new")
        }}
      />
      <section className="entity-table-shell">
        {rows.length ? (
          <div className="table-scroll">
            <table className="entity-table">
              <thead>
                <tr>
                  <th>Trans No</th>
                  <th>Sales Date</th>
                  <th>Customer</th>
                  <th>Salesperson</th>
                  <th>Total Amount</th>
                  {showAudit && (
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
                    className={row[5] === "Inactive" ? "inactive-row" : ""}
                    key={row[0]}
                  >
                    <td className="code-cell">{row[0]}</td>
                    <td>{row[1]}</td>
                    <td>
                      <b className="record-name">{row[2]}</b>
                    </td>
                    <td>{row[3]}</td>
                    <td>
                      <b className="price-value">{row[4]}</b>
                    </td>
                    {showAudit && (
                      <>
                        <td>
                          <Badge kind={row[5]}>{row[5]}</Badge>
                        </td>
                        <td>
                          <Stamp action={row[6]} user={row[7]} date={row[8]} />
                        </td>
                      </>
                    )}
                    <td>
                      <div className="row-actions">
                        {row[5] === "Inactive" ? (
                          (isSuperadmin || canEdit || canDelete) && (
                            <button
                              className="success-link"
                              onClick={() => handleRestoreSale(row[0])}
                            >
                              Restore
                            </button>
                          )
                        ) : (
                          <>
                            {canViewDetail && (
                              <button onClick={() => setDetailsSale(row)}>
                                Details
                              </button>
                            )}
                            <button onClick={() => setPaymentsSale(row)}>
                              Payments
                            </button>
                            {canEdit && (
                              <button onClick={() => setSaleForm("edit")}>
                                Edit
                              </button>
                            )}
                            {canDelete && (
                              <button
                                className="danger-link"
                                onClick={() => handleDeleteSaleClick(row)}
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
                ? "No matching sales orders"
                : filter === "inactive"
                ? "No inactive sales orders"
                : "No sales orders in ledger"
            }
            message={
              search
                ? `Nothing matches "${search}". Try searching with a different transaction ID, customer, or employee.`
                : filter === "inactive"
                ? "There are currently no deactivated or cancelled sales orders."
                : "Create your first sales order to begin recording transactions."
            }
            onClear={() => setSearch("")}
          />
        )}
      </section>
      {saleForm && (
        <SaleModal
          sale={
            saleForm === "edit" && detailsSale
              ? {
                  transno: detailsSale[0],
                  salesdate: detailsSale[1],
                  customer: detailsSale[2],
                  salesperson: detailsSale[3],
                }
              : null
          }
          currentUser={user}
          close={() => setSaleForm(null)}
          onSaved={(msg) => {
            setSaleForm(null)
            if (msg) setSuccess(msg)
            loadSalesData()
          }}
        />
      )}
      {detailsSale && (
        <SaleDetails
          role={role}
          sale={detailsSale}
          lines={saleLines.filter((l) => l.transno === detailsSale[0])}
          productOptions={productOptions}
          canAddDetail={canAddDetail}
          canEditDetail={canEditDetail}
          canDeleteDetail={canDeleteDetail}
          canViewInactive={canViewInactiveDetail}
          onSoftDeleteLine={handleSoftDeleteLine}
          onRestoreLine={handleRestoreLine}
          onLineSaved={async (msg) => {
            if (msg) setSuccess(msg)
            await loadSalesData()
          }}
          close={() => setDetailsSale(null)}
        />
      )}
      {paymentsSale && (
        <Payments
          role={role}
          sale={paymentsSale}
          receipts={paymentRecords.filter((p) => p.transno === paymentsSale[0])}
          customerBalances={customerBalances}
          canRecordPayment={canRecordPayment}
          canVoidPayment={canVoidPayment}
          canViewInactive={canViewInactivePayment}
          onSoftDeleteReceipt={handleSoftDeleteReceipt}
          onRestoreReceipt={handleRestoreReceipt}
          onPaymentRecorded={async (msg) => {
            if (msg) setSuccess(msg)
            await loadSalesData()
          }}
          close={() => setPaymentsSale(null)}
        />
      )}
      {deletingSale && (
        <ConfirmDeleteModal
          title="Deactivate Sales Transaction?"
          targetLabel={`${deletingSale[0]} — ${deletingSale[2]} (${deletingSale[4]})`}
          warningMessage={`Are you sure you want to deactivate transaction ${deletingSale[0]}? The transaction will be marked Inactive (soft-deleted). Sales revenue will be excluded from active totals, but complete financial audit trails will remain preserved.`}
          actionLabel="Deactivate Sale"
          onConfirm={confirmSoftDeleteSale}
          onClose={() => setDeletingSale(null)}
        />
      )}
      {blockedModal && (
        <BlockedDeleteModal
          title={blockedModal.title}
          subtitle={blockedModal.subtitle}
          reason={blockedModal.reason}
          close={() => setBlockedModal(null)}
          onClose={() => setBlockedModal(null)}
        />
      )}
    </div>
  )
}
