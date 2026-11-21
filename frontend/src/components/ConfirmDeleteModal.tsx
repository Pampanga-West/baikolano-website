import Button from "./Button"
import Icon from "./Icon"
import ModalShell from "./ModalShell"

export default function ConfirmDeleteModal({
  record,
  noun,
  operator,
  close,
  confirm,
  loading = false,
}: {
  record: string
  noun: string
  operator?: string
  close: () => void
  confirm: () => void
  loading?: boolean
}) {
  return (
    <ModalShell
      title={`Delete ${record}?`}
      subtitle={
        operator
          ? `Initiated by ${operator} · Reversible soft-deletion`
          : "This action uses soft-delete and can be reversed by an administrator."
      }
      close={close}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} disabled={loading}>
            {loading ? "Deleting…" : `Delete ${noun}`}
          </Button>
        </>
      }
    >
      <div className="confirm-message">
        <span>
          <Icon name="lock" />
        </span>
        <div>
          <b>This will mark the record as Inactive.</b>
          <p>
            The record disappears immediately from active views for standard team members,
            but remains available for full restoration and audit inspection.
          </p>
        </div>
      </div>
    </ModalShell>
  )
}
