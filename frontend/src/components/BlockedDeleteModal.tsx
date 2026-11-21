import Button from "./Button"
import Icon from "./Icon"
import ModalShell from "./ModalShell"

export default function BlockedDeleteModal({
  record,
  message,
  operator,
  close,
}: {
  record: string
  message?: string
  operator?: string
  close: () => void
}) {
  return (
    <ModalShell
      title="Record cannot be deleted"
      subtitle={
        operator
          ? `${record} · Attempted by ${operator}`
          : record
      }
      close={close}
      footer={<Button onClick={close}>Return to records</Button>}
    >
      <div className="blocked-message">
        <Icon name="shield" />
        <div>
          <b>Active child records reference this item.</b>
          <p>
            {message ||
              "Remove or reassign those records first. No changes were made, and this attempt remains logged in the audit trail."}
          </p>
        </div>
      </div>
    </ModalShell>
  )
}
