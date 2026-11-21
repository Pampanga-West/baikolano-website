import Button from "./Button"
import Icon from "./Icon"
import ModalShell from "./ModalShell"

export default function BlockedDeleteModal({
  record,
  subtitle,
  message,
  reason,
  operator,
  close,
  onClose,
  title = "Referential Integrity Guard",
}: {
  record?: string
  subtitle?: string
  message?: string
  reason?: string
  operator?: string
  close?: () => void
  onClose?: () => void
  title?: string
}) {
  const handleClose = close || onClose || (() => {})
  const baseSubtitle = subtitle || record
  const displaySubtitle =
    operator && baseSubtitle ? `${baseSubtitle} · Attempted by ${operator}` : baseSubtitle

  return (
    <ModalShell
      title={title}
      subtitle={displaySubtitle}
      close={handleClose}
      footer={<Button onClick={handleClose}>Return to records</Button>}
    >
      <div className="blocked-message">
        <Icon name="shield" />
        <div>
          <b>Active child records reference this item.</b>
          <p>
            {message ||
              reason ||
              "Remove or supersede those records first. No changes were made, and this attempt remains logged in the audit trail."}
          </p>
        </div>
      </div>
    </ModalShell>
  )
}
