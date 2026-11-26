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


