import React, { useState } from "react"
import ModalShell from "./ModalShell"
import Button from "./Button"
import { departmentApi } from "../lib/api"
import type { Department } from "../lib/types"

export interface DepartmentModalProps {
  department?: Department | { deptcode: string; deptname: string }
  suggestedDeptcode?: string
  existingDeptCodes?: string[]
  existingDeptNames?: string[]
  currentUser?: {
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    role?: string
  } | null
  close: () => void
  onSaved: (message?: string) => void
}

export default function DepartmentModal({
  department,
  suggestedDeptcode = "D-005",
  existingDeptCodes = [],
  existingDeptNames = [],
  currentUser,
  close,
  onSaved,
}: DepartmentModalProps) {
  const editing = Boolean(department)

  const [deptcode, setDeptcode] = useState(
    department?.deptcode ?? suggestedDeptcode
  )
  const [deptname, setDeptname] = useState(department?.deptname ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const operatorName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
    currentUser?.email ||
    "Authorized User"

  const validate = (): string | null => {
    const code = deptcode.trim().toUpperCase()
    const name = deptname.trim()

    if (!code) {
      return "Department code is required."
    }
    if (!/^[A-Z0-9_-]{2,10}$/.test(code)) {
      return "Department code must be 2 to 10 alphanumeric characters (e.g., D-005)."
    }

    if (!editing) {
      const codeExists = existingDeptCodes.some(
        (c) => c.toUpperCase() === code
      )
      if (codeExists) {
        return `Department code "${code}" already exists in directory. Choose a unique code.`
      }
    }

    if (!name) {
      return "Department name is required."
    }
    if (name.length < 2) {
      return "Department name must be at least 2 characters long."
    }

    const nameExists = existingDeptNames.some(
      (n) =>
        n.toLowerCase().trim() === name.toLowerCase().trim() &&
        (!editing || department?.deptname.toLowerCase().trim() !== name.toLowerCase().trim())
    )
    if (nameExists) {
      return `A department named "${name}" already exists. Department names should be distinct.`
    }

    return null
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setValidationError(null)

    const err = validate()
    if (err) {
      setValidationError(err)
      return
    }

    const trimmedCode = deptcode.trim().toUpperCase()
    const trimmedName = deptname.trim()

    setSubmitting(true)
    try {
      if (editing && department) {
        await departmentApi.updateDepartment(department.deptcode, {
          deptname: trimmedName,
        })
        onSaved(`Updated department ${department.deptcode} (${trimmedName}).`)
      } else {
        await departmentApi.createDepartment({
          deptcode: trimmedCode,
          deptname: trimmedName,
        })
        onSaved(`Created department ${trimmedCode} (${trimmedName}).`)
      }
      close()
    } catch (apiErr: any) {
      setValidationError(
        apiErr.message ||
          (editing
            ? "Failed to update department record."
            : "Failed to create department record.")
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      title={editing ? "Edit Department" : "Add Department"}
      subtitle={
        editing
          ? `Modify organizational title for ${department?.deptcode}`
          : "Register a new department in the corporate directory"
      }
      close={close}
      footer={
        <div className="modal-footer-duo">
          <Button
            className="btn-save-main"
            onClick={() => handleSubmit()}
            disabled={submitting}
          >
            {submitting
              ? "Saving…"
              : editing
              ? "Save Changes"
              : "Add Department"}
          </Button>
          <Button
            variant="secondary"
            className="btn-cancel-main"
            onClick={close}
            disabled={submitting}
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
              background: "var(--danger-bg, #fee2e2)",
              color: "var(--danger-text, #991b1b)",
              border: "1px solid #ef4444",
              borderRadius: "6px",
              fontWeight: 600,
            }}
          >
            {validationError}
          </div>
        )}

        <div className="form-field">
          <label htmlFor="dept-code">
            Department Code <span className="field-required">*</span>
          </label>
          <input
            id="dept-code"
            type="text"
            className="field-input"
            value={deptcode}
            onChange={(e) => {
              setDeptcode(e.target.value.toUpperCase())
              setValidationError(null)
            }}
            placeholder="e.g. D-005"
            disabled={editing || submitting}
            maxLength={10}
            required
          />
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--color-muted)",
              marginTop: "4px",
              display: "block",
            }}
          >
            {editing
              ? "Department codes serve as primary keys and cannot be altered."
              : "Unique alphanumeric code (e.g., D-001, D-005)."}
          </span>
        </div>

        <div className="form-field">
          <label htmlFor="dept-name">
            Department Name <span className="field-required">*</span>
          </label>
          <input
            id="dept-name"
            type="text"
            className="field-input"
            value={deptname}
            onChange={(e) => {
              setDeptname(e.target.value)
              setValidationError(null)
            }}
            placeholder="e.g. Quality Assurance"
            disabled={submitting}
            maxLength={100}
            required
            autoFocus={editing}
          />
        </div>

        <div
          style={{
            marginTop: "16px",
            padding: "10px 12px",
            background: "var(--color-bg-subtle, rgba(0,0,0,0.02))",
            borderRadius: "6px",
            border: "1px solid var(--color-border-subtle, #e5e7eb)",
            fontSize: "0.8rem",
            color: "var(--color-muted)",
          }}
        >
          <span>
            <b>Action By:</b> {operatorName} · <b>Table:</b> department
          </span>
        </div>
      </form>
    </ModalShell>
  )
}
