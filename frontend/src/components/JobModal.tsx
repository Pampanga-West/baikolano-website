import React, { useState } from "react"
import ModalShell from "./ModalShell"
import Button from "./Button"
import { jobApi } from "../lib/api"
import type { Job } from "../lib/types"

export interface JobModalProps {
  job?: Job | { jobcode: string; jobdesc: string }
  suggestedJobcode?: string
  existingJobCodes?: string[]
  existingJobDescs?: string[]
  currentUser?: {
    firstName?: string | null
    lastName?: string | null
    email?: string | null
    role?: string
  } | null
  close: () => void
  onSaved: (message?: string) => void
}

export default function JobModal({
  job,
  suggestedJobcode = "J-005",
  existingJobCodes = [],
  existingJobDescs = [],
  currentUser,
  close,
  onSaved,
}: JobModalProps) {
  const editing = Boolean(job)

  const [jobcode, setJobcode] = useState(
    job?.jobcode ?? suggestedJobcode
  )
  const [jobdesc, setJobdesc] = useState(job?.jobdesc ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const operatorName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
    currentUser?.email ||
    "Authorized User"

  const validate = (): string | null => {
    const code = jobcode.trim().toUpperCase()
    const desc = jobdesc.trim()

    if (!code) {
      return "Job code is required."
    }
    if (!/^[A-Z0-9_-]{2,10}$/.test(code)) {
      return "Job code must be 2 to 10 alphanumeric characters (e.g., J-005)."
    }

    if (!editing) {
      const codeExists = existingJobCodes.some(
        (c) => c.toUpperCase() === code
      )
      if (codeExists) {
        return `Job code "${code}" already exists in catalogue. Choose a unique code.`
      }
    }

    if (!desc) {
      return "Job title / description is required."
    }
    if (desc.length < 2) {
      return "Job title must be at least 2 characters long."
    }

    const descExists = existingJobDescs.some(
      (d) =>
        d.toLowerCase().trim() === desc.toLowerCase().trim() &&
        (!editing || job?.jobdesc.toLowerCase().trim() !== desc.toLowerCase().trim())
    )
    if (descExists) {
      return `A job title named "${desc}" already exists. Job descriptions should be distinct.`
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

    const trimmedCode = jobcode.trim().toUpperCase()
    const trimmedDesc = jobdesc.trim()

    setSubmitting(true)
    try {
      if (editing && job) {
        await jobApi.updateJob(job.jobcode, {
          jobdesc: trimmedDesc,
        })
        onSaved(`Updated job ${job.jobcode} (${trimmedDesc}).`)
      } else {
        await jobApi.createJob({
          jobcode: trimmedCode,
          jobdesc: trimmedDesc,
        })
        onSaved(`Created job ${trimmedCode} (${trimmedDesc}).`)
      }
      close()
    } catch (apiErr: any) {
      setValidationError(
        apiErr.message ||
          (editing
            ? "Failed to update job record."
            : "Failed to create job record.")
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      title={editing ? "Edit Job" : "Add Job"}
      subtitle={
        editing
          ? `Modify title definition for ${job?.jobcode}`
          : "Register a new job classification in the HR catalogue"
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
              : "Add Job"}
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
          <label htmlFor="job-code">
            Job Code <span className="field-required">*</span>
          </label>
          <input
            id="job-code"
            type="text"
            className="field-input"
            value={jobcode}
            onChange={(e) => {
              setJobcode(e.target.value.toUpperCase())
              setValidationError(null)
            }}
            placeholder="e.g. J-005"
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
              ? "Job codes serve as primary keys and cannot be altered."
              : "Unique alphanumeric code (e.g., J-001, J-005)."}
          </span>
        </div>

        <div className="form-field">
          <label htmlFor="job-desc">
            Job Title / Description <span className="field-required">*</span>
          </label>
          <input
            id="job-desc"
            type="text"
            className="field-input"
            value={jobdesc}
            onChange={(e) => {
              setJobdesc(e.target.value)
              setValidationError(null)
            }}
            placeholder="e.g. Software Engineer"
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
            <b>Action By:</b> {operatorName} · <b>Table:</b> job
          </span>
        </div>
      </form>
    </ModalShell>
  )
}
