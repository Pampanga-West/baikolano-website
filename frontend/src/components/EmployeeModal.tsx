import React, { useMemo, useState } from "react"
import ModalShell from "./ModalShell"
import Button from "./Button"
import { employeeApi } from "../lib/api"
import type { Employee } from "../lib/types"

export interface EmployeeModalProps {
  employee?: Employee | Record<string, any> | null
  suggestedEmpno?: string
  existingEmpnos?: string[]
  currentUser?: {
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    role?: string
  } | null
  close: () => void
  onSaved: (message?: string) => void
}

export default function EmployeeModal({
  employee,
  suggestedEmpno = "E-005",
  existingEmpnos = [],
  currentUser,
  close,
  onSaved,
}: EmployeeModalProps) {
  const editing = Boolean(employee)

  const [empno, setEmpno] = useState(
    employee?.empno ?? suggestedEmpno
  )
  const [lastname, setLastname] = useState(employee?.lastname ?? "")
  const [firstname, setFirstname] = useState(employee?.firstname ?? "")
  const [gender, setGender] = useState<string>(
    employee?.gender === "F" || employee?.gender === "M" ? employee.gender : "M"
  )
  const [birthdate, setBirthdate] = useState(
    employee?.birthdate && employee.birthdate !== "—" ? employee.birthdate : "1992-06-15"
  )
  const [hiredate, setHiredate] = useState(
    employee?.hiredate && employee.hiredate !== "—" ? employee.hiredate : new Date().toISOString().split("T")[0]
  )
  const [sepdate, setSepdate] = useState(
    employee?.sepdate && employee.sepdate !== "—" ? employee.sepdate : ""
  )

  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const operatorName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
    currentUser?.email ||
    "Authorized User"

  // Real-time date sequence validation warning
  const dateSequenceError = useMemo(() => {
    if (birthdate && hiredate && birthdate >= hiredate) {
      return "Birth Date must be earlier than Hire Date."
    }
    if (sepdate && hiredate && sepdate < hiredate) {
      return "Separation Date cannot be earlier than Hire Date."
    }
    return null
  }, [birthdate, hiredate, sepdate])

  const validate = (): string | null => {
    const code = empno.trim().toUpperCase()
    const lName = lastname.trim()
    const fName = firstname.trim()

    if (!code) {
      return "Employee number is required."
    }
    if (!/^[A-Z0-9_-]{2,10}$/.test(code)) {
      return "Employee number must be 2 to 10 alphanumeric characters (e.g., E-005)."
    }

    if (!editing) {
      const codeExists = existingEmpnos.some(
        (c) => c.toUpperCase() === code
      )
      if (codeExists) {
        return `Employee number "${code}" is already in use. Please select a unique identifier.`
      }
    }

    if (!lName) {
      return "Last name is required."
    }
    if (lName.length < 2) {
      return "Last name must be at least 2 characters long."
    }

    if (!fName) {
      return "First name is required."
    }
    if (fName.length < 2) {
      return "First name must be at least 2 characters long."
    }

    if (!gender || (gender !== "M" && gender !== "F")) {
      return "Please select a valid gender option (M or F)."
    }

    if (!birthdate) {
      return "Birth date is required."
    }
    const today = new Date().toISOString().split("T")[0]
    if (birthdate >= today) {
      return "Birth date must be in the past."
    }

    if (!hiredate) {
      return "Hire date is required."
    }

    if (birthdate >= hiredate) {
      return "Birth date must be earlier than hire date."
    }

    if (sepdate && sepdate < hiredate) {
      return "Separation date cannot be earlier than hire date."
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

    const trimmedCode = empno.trim().toUpperCase()
    const trimmedLast = lastname.trim()
    const trimmedFirst = firstname.trim()

    setSubmitting(true)
    try {
      if (editing && employee) {
        await employeeApi.updateEmployee(employee.empno, {
          lastname: trimmedLast,
          firstname: trimmedFirst,
          gender,
          birthdate,
          hiredate,
          sepdate: sepdate.trim() || null,
        })
        onSaved(`Updated employee ${employee.empno} (${trimmedFirst} ${trimmedLast}).`)
      } else {
        await employeeApi.createEmployee({
          empno: trimmedCode,
          lastname: trimmedLast,
          firstname: trimmedFirst,
          gender,
          birthdate,
          hiredate,
          sepdate: sepdate.trim() || null,
        })
        onSaved(`Created employee profile ${trimmedCode} (${trimmedFirst} ${trimmedLast}).`)
      }
      close()
    } catch (apiErr: any) {
      setValidationError(
        apiErr.message ||
          (editing
            ? "Failed to update employee record."
            : "Failed to create employee record.")
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      title={editing ? "Edit Employee Profile" : "Add Employee Profile"}
      subtitle={
        editing
          ? `Modify personnel record and employment dates for ${employee?.empno}`
          : "Register a new team member in the organizational directory"
      }
      close={close}
      footer={
        <div className="modal-footer-duo">
          <Button
            className="btn-save-main"
            onClick={() => handleSubmit()}
            disabled={submitting || Boolean(dateSequenceError)}
          >
            {submitting
              ? "Saving…"
              : editing
              ? "Save Changes"
              : "Add Employee"}
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
        {(validationError || dateSequenceError) && (
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
            {validationError || dateSequenceError}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="form-field">
            <label htmlFor="emp-no">
              Employee No <span className="field-required">*</span>
            </label>
            <input
              id="emp-no"
              type="text"
              className="field-input"
              value={empno}
              onChange={(e) => {
                setEmpno(e.target.value.toUpperCase())
                setValidationError(null)
              }}
              placeholder="e.g. E-005"
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
                ? "Employee numbers serve as primary keys and cannot be altered."
                : "Unique identifier (e.g. E-001, E-005)."}
            </span>
          </div>

          <div className="form-field">
            <label htmlFor="emp-gender">
              Gender <span className="field-required">*</span>
            </label>
            <select
              id="emp-gender"
              className="field-input"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={submitting}
              required
            >
              <option value="M">M — Male</option>
              <option value="F">F — Female</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="form-field">
            <label htmlFor="emp-lastname">
              Last Name <span className="field-required">*</span>
            </label>
            <input
              id="emp-lastname"
              type="text"
              className="field-input"
              value={lastname}
              onChange={(e) => {
                setLastname(e.target.value)
                setValidationError(null)
              }}
              placeholder="e.g. Santos"
              disabled={submitting}
              maxLength={50}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="emp-firstname">
              First Name <span className="field-required">*</span>
            </label>
            <input
              id="emp-firstname"
              type="text"
              className="field-input"
              value={firstname}
              onChange={(e) => {
                setFirstname(e.target.value)
                setValidationError(null)
              }}
              placeholder="e.g. Maria"
              disabled={submitting}
              maxLength={50}
              required
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="form-field">
            <label htmlFor="emp-birthdate">
              Birth Date <span className="field-required">*</span>
            </label>
            <input
              id="emp-birthdate"
              type="date"
              className="field-input"
              value={birthdate}
              onChange={(e) => {
                setBirthdate(e.target.value)
                setValidationError(null)
              }}
              disabled={submitting}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="emp-hiredate">
              Hire Date <span className="field-required">*</span>
            </label>
            <input
              id="emp-hiredate"
              type="date"
              className="field-input"
              value={hiredate}
              onChange={(e) => {
                setHiredate(e.target.value)
                setValidationError(null)
              }}
              disabled={submitting}
              required
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="emp-sepdate">
            Separation Date <span style={{ color: "var(--color-muted)", fontSize: "0.8rem" }}>(Optional)</span>
          </label>
          <input
            id="emp-sepdate"
            type="date"
            className={`field-input ${sepdate && hiredate && sepdate < hiredate ? "input-error" : ""}`}
            value={sepdate}
            onChange={(e) => {
              setSepdate(e.target.value)
              setValidationError(null)
            }}
            disabled={submitting}
          />
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--color-muted)",
              marginTop: "4px",
              display: "block",
            }}
          >
            Leave empty for currently employed team members. Must be on or after hire date.
          </span>
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
            <b>Action By:</b> {operatorName} · <b>Table:</b> employee
          </span>
        </div>
      </form>
    </ModalShell>
  )
}
