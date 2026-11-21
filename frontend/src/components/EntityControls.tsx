import Button from "./Button"
import Icon from "./Icon"

export default function EntityControls({
  isAdmin,
  counts,
  activeFilter,
  onFilter,
  search,
  onSearch,
  placeholder,
  addLabel,
  onAdd,
  canAdd = true,
  showFilters,
  showAdd,
}: {
  isAdmin: boolean
  counts: [number, number, number]
  activeFilter: string
  onFilter: (filter: string) => void
  search: string
  onSearch: (query: string) => void
  placeholder: string
  addLabel: string
  onAdd: () => void
  canAdd?: boolean
  showFilters?: boolean
  showAdd?: boolean
}) {
  const displayFilters = showFilters ?? isAdmin
  const displayAdd = showAdd ?? (isAdmin && canAdd)

  return (
    <div className="entity-controls">
      {displayFilters && (
        <div className="filter-tabs" aria-label="Record status filter">
          {[
            ["active", `Active (${counts[0]})`],
            ["inactive", `Inactive (${counts[1]})`],
            ["all", `All (${counts[2]})`],
          ].map(([value, label]) => (
            <button
              className={activeFilter === value ? "selected" : ""}
              onClick={() => onFilter(value)}
              key={value}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="entity-actions">
        <label className="entity-search">
          <Icon name="search" size={16} />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={placeholder}
          />
        </label>
        {displayAdd && (
          <Button icon="plus" onClick={onAdd} disabled={!canAdd}>
            {addLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
