export type Role = "Superadmin" | "Admin" | "User"
export type AccountStatus = "ACTIVE" | "PENDING" | "BLOCKED"
export type AuthView = "login" | "register" | "reset" | "new-password" | null
export type AppView = "landing" | "dashboard" | "customers" | "products" | "hr" | "sales" | "reports" | "users" | "audit" | "profile" | "table-editor"

export function normalizeRole(rawRole?: string | null): Role {
  if (!rawRole) return "User"
  const normalized = rawRole.trim().toLowerCase()
  if (normalized === "superadmin") return "Superadmin"
  if (normalized === "admin") return "Admin"
  return "User"
}

export type IconName =
  | "arrow"
  | "briefcase"
  | "building"
  | "check"
  | "chevron"
  | "dashboard"
  | "eye"
  | "eyeOff"
  | "google"
  | "lock"
  | "logout"
  | "mail"
  | "menu"
  | "moon"
  | "package"
  | "plus"
  | "report"
  | "search"
  | "settings"
  | "shield"
  | "sparkle"
  | "sun"
  | "users"
  | "x"

export interface AuthUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role?: Role
  approvalStatus?: "PENDING" | "APPROVED"
  blocked?: boolean
  createdAt?: string
}

export interface AuthResponse {
  message: string
  id?: string
  email?: string
  approvalStatus?: string
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

// Sprint 1 Planned User Management Types (S1-DEV-05, S1-DEV-06, S1-DEV-07)
export interface ManagedUser {
  id: string
  name?: string
  firstName?: string
  lastName?: string
  email: string
  role: Role
  approvalStatus: "PENDING" | "APPROVED"
  blocked: boolean
  isProtected?: boolean
  createdAt?: string
}

export interface UserPermission {
  id: string
  userId: string
  module: string
  action: string
  granted: boolean
}

export interface PasswordResetRequest {
  id: string
  userId: string | null
  email: string
  securityResetToken: string | null
  status: "PENDING" | "TOKEN_GENERATED" | "COMPLETED" | string
  used: boolean
  requestedAt: string
  expiresAt: string | null
  completedAt: string | null
}

// Sprint 2 Customer Management Types (S2-DEV-01)
export interface Customer {
  custno: string
  custname: string
  address: string
  payterm: string
  is_deleted: boolean
  status: "Active" | "Inactive"
  stamp?: string
  stampAction?: string
  stampUser?: string
  stampDate?: string
}

export interface CustomerQueryParams {
  search?: string
  status?: "active" | "inactive" | "all"
  payterm?: string
}

export interface CreateCustomerPayload {
  custno?: string
  custname: string
  address: string
  payterm: string
}

export interface UpdateCustomerPayload {
  custname?: string
  address?: string
  payterm?: string
}

// Sprint 2 Product Catalog Types (S2-DEV-04, S2-DEV-08)
export interface Product {
  prodcode: string
  description: string
  unit: string
  price: string
  numericPrice?: number | null
  currentEffDate?: string | null
  is_deleted: boolean
  status: "Active" | "Inactive"
  stamp?: string
  stampAction?: string
  stampUser?: string
  stampDate?: string
}

export interface ProductQueryParams {
  search?: string
  status?: "active" | "inactive" | "all"
  unit?: string
  asOfDate?: string
}

export interface CreateProductPayload {
  prodcode?: string
  description: string
  unit: string
  initialPrice?: number | string
}

export interface UpdateProductPayload {
  description?: string
  unit?: string
}

export interface PriceHistoryRecord {
  prodcode: string
  effdate: string
  unitprice: number
  price: string
  is_deleted: boolean
  status: "Active" | "Inactive"
  stamp?: string
  stampAction?: string
  stampUser?: string
  stampDate?: string
}

// Sprint 3 Department Types (S3-DEV-01)
export interface Department {
  deptcode: string
  deptname: string
  is_deleted: boolean
  status: "Active" | "Inactive"
  stamp?: string
  stampAction?: string
  stampUser?: string
  stampDate?: string
}

export interface DepartmentQueryParams {
  search?: string
  status?: "active" | "inactive" | "all"
}

export interface CreateDepartmentPayload {
  deptcode?: string
  deptname: string
}

export interface UpdateDepartmentPayload {
  deptname: string
}

// Sprint 3 Job Types (S3-DEV-02)
export interface Job {
  jobcode: string
  jobdesc: string
  is_deleted: boolean
  status: "Active" | "Inactive"
  stamp?: string
  stampAction?: string
  stampUser?: string
  stampDate?: string
}

export interface JobQueryParams {
  search?: string
  status?: "active" | "inactive" | "all"
}

export interface CreateJobPayload {
  jobcode?: string
  jobdesc: string
}

export interface UpdateJobPayload {
  jobdesc: string
}

// Sprint 3 Employee Types (S3-DEV-03)
export interface Employee {
  empno: string
  lastname: string
  firstname: string
  gender: "M" | "F" | string
  birthdate: string
  hiredate: string
  sepdate?: string | null
  currentJobCode?: string | null
  currentJob?: string | null
  currentDeptCode?: string | null
  currentDept?: string | null
  is_deleted: boolean
  status: "Active" | "Inactive" | "Separated"
  stamp?: string
  stampAction?: string
  stampUser?: string
  stampDate?: string
}

export interface EmployeeQueryParams {
  search?: string
  status?: "active" | "inactive" | "all"
  department?: string
  job?: string
}

export interface CreateEmployeePayload {
  empno?: string
  lastname: string
  firstname: string
  gender: "M" | "F" | string
  birthdate: string
  hiredate: string
  sepdate?: string | null
}

export interface UpdateEmployeePayload {
  lastname?: string
  firstname?: string
  gender?: "M" | "F" | string
  birthdate?: string
  hiredate?: string
  sepdate?: string | null
}

// Sprint 3 Job History Types (S3-DEV-06)
export interface JobHistoryRecord {
  empno: string
  effdate: string
  jobcode: string
  jobdesc?: string
  jobTitle?: string
  deptcode: string
  deptname?: string
  departmentName?: string
  salary: number
  formattedSalary?: string
  is_deleted: boolean
  status: "Active" | "Inactive"
  stamp?: string
  stampAction?: string
  stampUser?: string
  stampDate?: string
}

export interface CreateJobHistoryPayload {
  effdate: string
  jobcode: string
  deptcode: string
  salary: number | string
}

export interface UpdateJobHistoryPayload {
  jobcode?: string
  deptcode?: string
  salary?: number | string
}

// Sprint 4 Sales Transaction Types (S4-DEV-01)
export interface SaleHeader {
  transno: string
  salesdate: string
  custno: string
  empno: string
  total?: number
  formattedTotal?: string
  customer?: string
  salesperson?: string
  is_deleted?: boolean
  status?: "Active" | "Inactive"
  stamp?: string
  stampAction?: string
  stampUser?: string
  stampDate?: string
}

export interface CreateSalePayload {
  transno?: string
  salesdate: string
  custno: string
  empno: string
}

export interface CustomerOption {
  custno: string
  custname: string
  label: string
}

export interface SalespersonOption {
  empno: string
  firstname: string
  lastname: string
  label: string
}

export interface SalesQueryParams {
  search?: string
  status?: "active" | "inactive" | "all"
  customer?: string
  salesperson?: string
}

// Sprint 4 Sale Details Types (S4-DEV-02)
export interface SaleLineItem {
  transno: string
  prodcode: string
  product?: string
  qty: string | number
  quantity: number
  unitPrice?: string
  unitPriceNum?: number
  lineTotal?: string
  lineTotalNum: number
  is_deleted?: boolean
  status: "Active" | "Inactive"
  stamp?: string
  stampAction?: string
  stampUser?: string
  stampDate?: string
  action?: string
  user?: string
  date?: string
}

export interface CreateSaleLinePayload {
  transno?: string
  prodcode: string
  quantity: number
}

export interface UpdateSaleLinePayload {
  quantity: number
}

export interface SaleProductOption {
  prodcode: string
  description: string
  unit?: string
  label: string
  currentPrice?: number
}

// Sprint 4 Payment Records Types (S4-DEV-03)
export interface PaymentRecord {
  orno: string
  transno: string
  paydate: string
  amount: string
  amountNum: number
  is_deleted?: boolean
  status: "Active" | "Inactive"
  stamp?: string
  stampAction?: string
  stampUser?: string
  stampDate?: string
  action?: string
  user?: string
  date?: string
}

export interface RecordPaymentPayload {
  transno?: string
  orno?: string
  paydate: string
  amount: number
}

export interface CustomerBalanceSummary {
  customer: string
  billed: number
  paid: number
  open: number
}

// ============================================================================
// Sprint 4: Reports Module Types (S4-DEV-04)
// ============================================================================

export type ReportKey =
  | "customers"
  | "product-master"
  | "products"
  | "active-employees"
  | "all-employees"
  | "history"
  | "sales"

export interface ReportDefinition {
  key: ReportKey
  short: string
  title: string
  subtitle: string
  right: string
}

export interface ReportResult {
  key: ReportKey
  title: string
  subtitle: string
  headers: string[]
  rows: (string | number)[][]
  totalRows: number
  generatedAt: string
  filtersApplied?: Record<string, any>
}

export interface ProductMasterReportItem {
  prodcode: string
  description: string
  unit: string
  currentPrice: string
  currentPriceNum: number
}

export interface ActiveEmployeeReportItem {
  empno: string
  lastname: string
  firstname: string
  gender: string
  birthdate: string
  hiredate: string
}

export interface AllEmployeeReportItem {
  empno: string
  lastname: string
  firstname: string
  gender: string
  birthdate: string
  hiredate: string
  sepdate: string
  status: "Active" | "Inactive"
}

export interface JobHistoryReportItem {
  empno: string
  employee: string
  effdate: string
  job: string
  department: string
  salary: string
  salaryNum: number
}

