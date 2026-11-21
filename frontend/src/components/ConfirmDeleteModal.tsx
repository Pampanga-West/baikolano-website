import Button from "./Button"
import Icon from "./Icon"
import ModalShell from "./ModalShell"

export default function ConfirmDeleteModal({
  record,
  targetLabel,
  title,
  noun = "Record",
  close,
  onClose,
  confirm,
  onConfirm,
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
  close?: () => void
  onClose?: () => void
  confirm?: () => void
  onConfirm?: () => void
  isDeleting?: boolean
  customWarning?: string
  warningMessage?: string
  customExplanation?: string
  actionLabel?: string
}) {
  const handleClose = close || onClose || (() => {})
  const handleConfirm = confirm || onConfirm || (() => {})
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
      subtitle="This action uses soft-delete and can be reversed by an administrator."
      close={handleClose}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting…" : (actionLabel ?? `Delete ${noun}`)}
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
