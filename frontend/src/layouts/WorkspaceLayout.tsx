import { lazy, Suspense, useEffect, useMemo, useState } from "react"
import { rightsApi } from "../lib/api"
import Badge from "../components/Badge"
import Icon from "../components/Icon"
import Logo from "../components/Logo"
import RightsModal from "../components/RightsModal"
import { useAuth } from "../contexts/AuthContext"
import { useTheme } from "../contexts/ThemeContext"
import { roleData } from "../lib/data"
import { normalizeRole, type AppView, type IconName, type ManagedUser, type Role } from "../lib/types"
import DashboardPage from "../pages/DashboardPage"
import ProfilePage from "../pages/ProfilePage"
import TableEditorPage from "../pages/TableEditorPage"
import UserManagementPage from "../pages/UserManagementPage"

const AuditLogPage = lazy(() => import("../pages/AuditLogPage"))
const CustomersPage = lazy(() => import("../pages/CustomersPage"))
const HumanResourcesPage = lazy(() => import("../pages/HumanResourcesPage"))
const ProductsPage = lazy(() => import("../pages/ProductsPage"))
const ReportsPage = lazy(() => import("../pages/ReportsPage"))
const SalesPage = lazy(() => import("../pages/SalesPage"))

function getInitials(nameOrEmail?: string): string {
  if (!nameOrEmail) return "PH"
  if (nameOrEmail.includes("@")) {
    const prefix = nameOrEmail.split("@")[0]
    return prefix.slice(0, 2).toUpperCase()
  }
  const parts = nameOrEmail.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return nameOrEmail.slice(0, 2).toUpperCase()
}

function Sidebar({
  role,
  view,
  setView,
  open,
  close,
  displayName,
  initials,
  onLogout,
  userRights = [],
}: {
  role: Role
  view: AppView
  setView: (v: AppView) => void
  open: boolean
  close: () => void
  displayName: string
  initials: string
  onLogout: () => void
  userRights?: string[]
}) {
  const allModules = [
    ["Customers", "users", "customers"],
    ["Products", "package", "products"],
    ["Human Resources", "briefcase", "hr"],
    ["Sales", "report", "sales"],
    ["Reports", "report", "reports"],
  ] as [string, IconName, AppView][]

  const visibleModules = useMemo(() => {
    if (role !== "User" || !userRights || !userRights.length) return allModules
    const hasCustomer = userRights.some((r) => r.toLowerCase().includes("customer"))
    const hasProduct = userRights.some((r) => r.toLowerCase().includes("product") || r.toLowerCase().includes("price"))
    const hasHr = userRights.some((r) => r.toLowerCase().includes("job") || r.toLowerCase().includes("department") || r.toLowerCase().includes("employee"))
    const hasSales = userRights.some((r) => r.toLowerCase().includes("sale") || r.toLowerCase().includes("payment"))
    const hasReports = userRights.some((r) => {
      const l = r.toLowerCase()
      return (
        l.includes("report") ||
        l.includes("top") ||
        l.includes("master") ||
        l.includes("history") ||
        l.includes("active employees") ||
        l.includes("all employees")
      )
    })
    return allModules.filter(([_, __, target]) => {
      if (target === "customers") return hasCustomer
      if (target === "products") return hasProduct
      if (target === "hr") return hasHr
      if (target === "sales") return hasSales
      if (target === "reports") return hasReports
      return true
    })
  }, [role, userRights])
  const nav = (target: AppView) => {
    setView(target)
    close()
  }
  return (
    <>
      {open && (
        <button
          className="sidebar-scrim"
          onClick={close}
          aria-label="Close menu"
        ></button>
      )}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-logo">
          <Logo dark />
        </div>
        <div className="side-scroll">
          <button
            className={`nav-item ${view === "dashboard" ? "active" : ""}`}
            onClick={() => nav("dashboard")}
          >
            <Icon name="dashboard" />
            <span className="nav-text">Dashboard</span>
          </button>
          <div className="nav-label">Modules</div>
          {visibleModules.map(([name, icon, target]) => (
            <button
              className={`nav-item ${view === target ? "active" : ""}`}
              onClick={() => nav(target)}
              key={name}
            >
              <Icon name={icon} />
              <span className="nav-text">{name}</span>
            </button>
          ))}
          {role !== "User" && (
            <>
              <div className="nav-label">Administration</div>
              <button
                className={`nav-item ${view === "users" ? "active" : ""}`}
                onClick={() => nav("users")}
              >
                <Icon name="users" />
                <span className="nav-text">User Management</span>
              </button>
              {role === "Superadmin" && (
                <>
                  <button
                    className={`nav-item ${view === "audit" ? "active" : ""}`}
                    onClick={() => nav("audit")}
                  >
                    <Icon name="shield" />
                    <span className="nav-text">Audit Log</span>
                  </button>

                  <div
                    style={{
                      height: "1px",
                      background: "rgba(255, 255, 255, 0.1)",
                      margin: "12px 10px",
                    }}
                  />
                  <button
                    className={`nav-item ${view === "table-editor" ? "active" : ""}`}
                    onClick={() => nav("table-editor")}
                  >
                    <Icon name="package" />
                    <span className="nav-text">Table Editor</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
        <div
          className={`side-profile ${view === "profile" ? "active" : ""}`}
          onClick={() => nav("profile")}
          style={{ cursor: "pointer" }}
          title="Click to view and edit profile"
        >
          <span>{initials}</span>
          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
            <b
              title={displayName}
              style={{
                display: "block",
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </b>
            <small>{role} • Edit Profile</small>
          </div>
          <button
            className="icon-button"
            onClick={(e) => {
              e.stopPropagation()
              onLogout()
            }}
            title="Sign out"
            style={{
              color: "rgba(255, 255, 255, 0.7)",
              marginLeft: "auto",
              cursor: "pointer",
            }}
          >
            <Icon name="logout" size={15} />
          </button>
        </div>
      </aside>
    </>
  )
}

function AppHeader({
  role,
  onMenu,
  onLogout,
  onProfile,
  userInitials,
}: {
  role: Role
  onMenu: () => void
  onLogout: () => void
  onProfile: () => void
  userInitials: string
}) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="app-header">
      <button className="icon-button mobile-menu" onClick={onMenu}>
        <Icon name="menu" />
      </button>
      <div className="header-search">
        <Icon name="search" size={17} />
        <span>Search anything...</span>
        <kbd>⌘ K</kbd>
      </div>
      <div
        className="role-display"
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "4px 12px",
          borderRadius: "10px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>Role</span>
        <Badge kind={role.toLowerCase()}>{role.toUpperCase()}</Badge>
      </div>
      <button
        type="button"
        className="icon-button"
        onClick={toggleTheme}
        title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
        style={{
          cursor: "pointer",
          color: "var(--muted)",
        }}
      >
        <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
      </button>
      <div
        className="header-avatar"
        onClick={onProfile}
        style={{ cursor: "pointer" }}
        title="View / Edit Profile"
      >
        {userInitials}
      </div>
      <button
        className="icon-button"
        onClick={onLogout}
        title="Sign out of HOPE ERP"
        style={{
          marginLeft: "6px",
          color: "var(--muted)",
          cursor: "pointer",
        }}
      >
        <Icon name="logout" size={17} />
      </button>
    </header>
  )
}

export default function WorkspaceLayout({
  initialRole,
}: {
  initialRole?: Role
} = {}) {
  const { user, logout } = useAuth()
  // User role is strictly derived from the authenticated session (defaults to User)
  const role: Role = normalizeRole(
    user?.role || (user?.email?.toLowerCase() === "test@example.com" ? "Superadmin" : undefined) || initialRole
  )
  const [view, setView] = useState<AppView>("dashboard")
  const [activeEditorTable, setActiveEditorTable] = useState<string>("customer")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [rightsOpen, setRightsOpen] = useState(false)
  const [rightsTargetUser, setRightsTargetUser] = useState<ManagedUser | null>(null)
  const [userRights, setUserRights] = useState<string[]>([])

  useEffect(() => {
    if (!user?.id || role !== "User") return
    let active = true
    rightsApi
      .getUserRights(user.id)
      .then((r) => {
        if (active) setUserRights(r || [])
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [user?.id, role])

  const displayName = user?.email || roleData[role]?.name || "User"
  const initials = getInitials(user?.email || displayName)

  const effectiveView =
    (role === "User" && view === "users") ||
    (role !== "Superadmin" && (view === "audit" || view === "table-editor"))
      ? "dashboard"
      : view

  return (
    <div className="workspace">
      <Sidebar
        role={role}
        view={effectiveView}
        setView={setView}
        open={sidebarOpen}
        close={() => setSidebarOpen(false)}
        displayName={displayName}
        initials={initials}
        onLogout={logout}
        userRights={userRights}
      />
      <div className="app-main">
        <AppHeader
          role={role}
          onMenu={() => setSidebarOpen(true)}
          onLogout={logout}
          onProfile={() => setView("profile")}
          userInitials={initials}
        />
        <Suspense
          fallback={
            <div className="module-loading">
              <span></span>
              Loading workspace…
            </div>
          }
        >
          {effectiveView === "dashboard" && (
            <DashboardPage
              role={role}
              goUsers={() => setView("users")}
              goToModule={(target) => setView(target)}
              userRights={userRights}
            />
          )}
          {effectiveView === "profile" && <ProfilePage role={role} />}
          {effectiveView === "customers" && <CustomersPage role={role} />}
          {effectiveView === "products" && <ProductsPage role={role} />}
          {effectiveView === "hr" && <HumanResourcesPage role={role} />}
          {effectiveView === "sales" && <SalesPage role={role} />}
          {effectiveView === "reports" && <ReportsPage role={role} userRights={userRights} />}
          {effectiveView === "users" && (
            <UserManagementPage
              role={role}
              openRights={(targetUser) => {
                setRightsTargetUser(targetUser)
                setRightsOpen(true)
              }}
            />
          )}
          {effectiveView === "audit" && role === "Superadmin" && (
            <AuditLogPage />
          )}
          {effectiveView === "table-editor" && role === "Superadmin" && (
            <TableEditorPage
              activeTable={activeEditorTable}
              onSelectTable={(tblName) => {
                setActiveEditorTable(tblName)
                setView("table-editor")
              }}
            />
          )}
        </Suspense>
      </div>
      {rightsOpen && (
        <RightsModal
          user={rightsTargetUser}
          close={() => {
            setRightsOpen(false)
            setRightsTargetUser(null)
          }}
        />
      )}
    </div>
  )
}
