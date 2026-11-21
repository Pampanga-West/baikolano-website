import Button from "./Button"
import Icon from "./Icon"

export interface EmptyStateProps {
  query?: string
  title?: string
  message?: string
  icon?: string
  actionLabel?: string
  onAction?: () => void
  onClear?: () => void
}

export default function EmptyState({
  query = "",
  title,
  message,
  icon = "search",
  actionLabel,
  onAction,
  onClear,
}: EmptyStateProps) {
  const hasQuery = Boolean(query && query.trim().length > 0)
  const displayTitle = title ?? (hasQuery ? "No matching records" : "No records in this view")
  const displayMessage =
    message ??
    (hasQuery
      ? `Nothing matches "${query}". Try a different name, code, or clear the search.`
      : "There are currently no records available under this category or filter.")

  const handleAction = onAction ?? onClear

  return (
    <div className="empty-state">
      <div className="empty-illustration">
        <span></span>
        <Icon name={icon} size={25} />
      </div>
      <b>{displayTitle}</b>
      <p>{displayMessage}</p>
      {handleAction && (
        <Button variant="secondary" onClick={handleAction}>
          {actionLabel ?? (hasQuery ? "Clear search" : "Reset filter")}
        </Button>
      )}
    </div>
  )
}
