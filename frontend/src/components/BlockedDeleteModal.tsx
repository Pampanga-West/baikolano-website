import Button from "./Button"
import Icon from "./Icon"
import ModalShell from "./ModalShell"

export default function BlockedDeleteModal({
  record,
  subtitle,
  close,
  onClose,
  title = "Referential Integrity Guard",
  reason,
}: {
  record?: string
  subtitle?: string
  close?: () => void
  onClose?: () => void
  title?: string
  reason?: string
}) {
  const handleClose = close || onClose || (() => {})
  const displaySubtitle = subtitle || record

  return (
    <ModalShell
      title={title}
      subtitle={displaySubtitle}
      close={handleClose}
      footer={
        <Button onClick={handleClose}>
          Return to records
        </Button>
      }
    >
      <div className="blocked-message">
        <Icon name="shield" />
        <div>
          <b>Active child records reference this item.</b>
          <p>
            {reason ??
              "Remove or supersede those records first. No changes were made, and this attempt remains logged in the audit trail."}
          </p>
        </div>
      </div>
    </ModalShell>
  )
}
