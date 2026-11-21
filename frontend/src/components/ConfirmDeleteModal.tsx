import Button from "./Button"
import Icon from "./Icon"
import ModalShell from "./ModalShell"

export default function ConfirmDeleteModal({
  record,
  targetLabel,
  title,
  noun = "Record",
  operator,
  close,
  onClose,
  confirm,
  onConfirm,
  loading = false,
  isDeleting = false,
  customWarning,
  warningMessage,
  customExplanation,
  actionLabel,
}: {
  record?: string
  targetLabel?: string
  title?: string
  noun?: string
  operator?: string
  close?: () => void
  onClose?: () => void
  confirm?: () => void
  onConfirm?: () => void
  loading?: boolean
  isDeleting?: boolean
  customWarning?: string
  warningMessage?: string
  customExplanation?: string
  actionLabel?: string
}) {
  const handleClose = close || onClose || (() => {})
  const handleConfirm = confirm || onConfirm || (() => {})
  const busy = Boolean(loading || isDeleting)
  const target = targetLabel || record || noun
  const modalTitle = title || `Delete ${target}?`
  const warning =
    warningMessage || customWarning || "This will mark the record as Inactive."
  const explanation =
    customExplanation ||
    "This action uses soft-delete. The record will disappear from standard views but remain preserved in audit logs and restorable by administrators."

  return (
    <ModalShell
      title={modalTitle}
      subtitle={
        operator
          ? `Initiated by ${operator} · Reversible soft-deletion`
          : "This action uses soft-delete and can be reversed by an administrator."
      }
      close={handleClose}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={busy}>
            {busy ? "Deleting…" : (actionLabel ?? `Delete ${noun}`)}
          </Button>
        </>
      }
    >
      <div className="confirm-message">
        <span>
          <Icon name="lock" />
        </span>
        <div>
          <b>{warning}</b>
          <p>{explanation}</p>
        </div>
      </div>
    </ModalShell>
  )
}
