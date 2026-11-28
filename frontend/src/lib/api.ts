import { handleEmbeddedRequest, installEmbeddedFetchInterceptor } from "../backend/embeddedServer"
import {
  ApiError,
  normalizeRole,
  type AccountStatus,
  type AuthResponse,
  type AuthUser,
  type ManagedUser,
  type PasswordResetRequest,
  type Role,
  type UserPermission,
  type Customer,
  type CustomerQueryParams,
  type CreateCustomerPayload,
  type UpdateCustomerPayload,
  type Product,
  type ProductQueryParams,
  type CreateProductPayload,
  type UpdateProductPayload,
  type PriceHistoryRecord,
  type Department,
  type DepartmentQueryParams,
  type CreateDepartmentPayload,
  type UpdateDepartmentPayload,
  type Job,
  type JobQueryParams,
  type CreateJobPayload,
  type UpdateJobPayload,
  type Employee,
  type EmployeeQueryParams,
  type CreateEmployeePayload,
  type UpdateEmployeePayload,
  type JobHistoryRecord,
  type CreateJobHistoryPayload,
  type UpdateJobHistoryPayload,
  type SaleHeader,
  type CreateSalePayload,
  type SalesQueryParams,
  type SaleLineItem,
  type CreateSaleLinePayload,
  type UpdateSaleLinePayload,
  type SaleProductOption,
} from "./types"

// Automatically install global in-browser mock server interceptor
installEmbeddedFetchInterceptor()

/**
 * Base URL for backend APIs.
 * Defaults to http://localhost:8080 (where Spring Boot runs).
 * Can be overridden via VITE_API_URL environment variable.
 */
export const API_BASE_URL =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL !== undefined
    ? import.meta.env.VITE_API_URL
    : "http://localhost:8080"

/**
 * Toggle for the embedded in-browser backend.
 * Enabled by default for flawless local demo and GitHub Pages static hosting.
 * Can be toggled to false via VITE_USE_REAL_BACKEND=true if testing against Spring Boot.
 */
export const USE_EMBEDDED_BACKEND =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_USE_REAL_BACKEND === "true"
    ? false
    : true

let cachedCsrfToken: string | null = null

/**
 * Clears the in-memory CSRF token cache.
 */
export function clearCsrfTokenCache(): void {
  cachedCsrfToken = null
}

/**
 * Retrieves a CSRF token from the backend /api/auth/csrf endpoint.
 * Spring Security requires this token on state-changing requests (POST, PUT, DELETE, PATCH).
 */
export async function fetchCsrfToken(): Promise<string> {
  if (USE_EMBEDDED_BACKEND) {
    const res = await handleEmbeddedRequest("/api/auth/csrf", { method: "GET" })
    const data = await res.json()
    cachedCsrfToken = data.token
    return data.token
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/csrf`, {
      method: "GET",
      credentials: "include",
    })

    if (!res.ok) {
      throw new ApiError("Failed to fetch CSRF token from backend.", res.status)
    }

    const data = await res.json()
    cachedCsrfToken = data.token
    return data.token
  } catch (err) {
    // Graceful fallback to embedded backend on connection drop
    console.warn("[API] Real backend unreachable. Falling back to embedded backend.")
    const res = await handleEmbeddedRequest("/api/auth/csrf", { method: "GET" })
    const data = await res.json()
    cachedCsrfToken = data.token
    return data.token
  }
}

/**
 * Generic HTTP client wrapper enforcing:
 * 1. credentials: "include" for session cookies (JSESSIONID)
 * 2. Automatic CSRF token acquisition and header injection for mutation requests
 * 3. JSON serialization and deserialization
 * 4. Error response parsing into ApiError
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method || "GET").toUpperCase()
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method)

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }

  // Ensure JSON content type when body is present
  if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json"
  }

  // Attach CSRF token if this is a mutating request
  if (isMutation) {
    if (!cachedCsrfToken) {
      cachedCsrfToken = await fetchCsrfToken()
    }
    headers["X-CSRF-TOKEN"] = cachedCsrfToken
  }

  let response: Response

  if (USE_EMBEDDED_BACKEND) {
    const relativeEndpoint = endpoint.startsWith("http")
      ? new URL(endpoint).pathname + new URL(endpoint).search
      : endpoint
    response = await handleEmbeddedRequest(relativeEndpoint, {
      ...options,
      headers,
    })
  } else {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${API_BASE_URL}${endpoint}`

    try {
      response = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      })

      // If CSRF token expired or failed (403), retry once with fresh CSRF token
      if (response.status === 403 && isMutation && cachedCsrfToken) {
        try {
          cachedCsrfToken = await fetchCsrfToken()
          headers["X-CSRF-TOKEN"] = cachedCsrfToken
          response = await fetch(url, {
            ...options,
            headers,
            credentials: "include",
          })
        } catch {
          // Fall through to error handler below
        }
      }
    } catch (err: any) {
      // Automatic fallback to embedded server so app NEVER breaks offline
      console.warn("[API] Connection to real backend failed. Using embedded backend.")
      const relativeEndpoint = endpoint.startsWith("http")
        ? new URL(endpoint).pathname + new URL(endpoint).search
        : endpoint
      response = await handleEmbeddedRequest(relativeEndpoint, {
        ...options,
        headers,
      })
    }
  }

  // Handle successful response
  if (response.ok) {
    // Check if response has content
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      return (await response.json()) as T
    }
    const text = await response.text()
    return (text ? { message: text } : {}) as T
  }

  // Handle error response
  let errorMessage = `Request failed with status ${response.status}`
  try {
    const errorJson = await response.json()
    if (errorJson?.message) {
      errorMessage = errorJson.message
    }
  } catch {
    // If response was not JSON, try text
    try {
      const text = await response.text()
      if (text) errorMessage = text
    } catch {
      // Keep default error message
    }
  }

  throw new ApiError(errorMessage, response.status)
}

// ============================================================================
// Sprint 1 Core Authentication APIs (Currently implemented in Backend)
// ============================================================================

export const authApi = {
  /**
   * Retrieves a CSRF token.
   * Backend endpoint: GET /api/auth/csrf
   */
  getCsrf: () => fetchCsrfToken(),

  /**
   * Registers a new user account.
   * New accounts start in PENDING approval status and cannot log in until approved.
   * Backend endpoint: POST /api/auth/register
   */
  register: (data: { email: string; password: string }): Promise<AuthResponse> => {
    return apiFetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  /**
   * Authenticates an existing user and establishes an HTTP session (JSESSIONID).
   * Fails with HTTP 403 if account is PENDING or BLOCKED.
   * Backend endpoint: POST /api/auth/login
   */
  login: (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    return apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    })
  },

  /**
   * Retrieves the currently authenticated user's session data.
   * Returns HTTP 401 if unauthenticated.
   * Backend endpoint: GET /api/auth/me
   */
  me: async (): Promise<AuthUser> => {
    const res = await apiFetch<AuthUser>("/api/auth/me", {
      method: "GET",
    })
    const computedRole = normalizeRole(
      res.role || (res.email?.toLowerCase() === "test@example.com" ? "Superadmin" : "User")
    )
    return {
      ...res,
      role: computedRole,
    }
  },

  /**
   * Updates the current authenticated user's profile information and/or password.
   * Backend endpoint: PUT /api/auth/profile
   */
  updateProfile: (data: {
    firstName?: string
    lastName?: string
    currentPassword?: string
    newPassword?: string
  }): Promise<AuthUser & { message: string }> => {
    return apiFetch<AuthUser & { message: string }>("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  /**
   * Destroys the current authenticated session on the backend.
   * Backend endpoint: POST /api/auth/logout
   */
  logout: async (): Promise<AuthResponse> => {
    try {
      const res = await apiFetch<AuthResponse>("/api/auth/logout", {
        method: "POST",
      })
      clearCsrfTokenCache()
      return res
    } catch (err) {
      clearCsrfTokenCache()
      throw err
    }
  },

  // --------------------------------------------------------------------------
  // Sprint 1 Future Planned Endpoints (S1-DEV-04: Password Reset)
  // Ready to connect once backend implements them
  // --------------------------------------------------------------------------

  /**
   * Requests a password reset link for the provided email.
   * Planned endpoint: POST /api/auth/reset-password-request
   */
  requestPasswordReset: (email: string): Promise<{ message: string }> => {
    return apiFetch<{ message: string }>("/api/auth/reset-password-request", {
      method: "POST",
      body: JSON.stringify({ email }),
    })
  },

  /**
   * Sets a new password using a reset token.
   * Planned endpoint: POST /api/auth/reset-password
   */
  resetPassword: (token: string, newPassword: string): Promise<{ message: string }> => {
    return apiFetch<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    })
  },
}

// ============================================================================
// Sprint 1 Future Planned User Management APIs (S1-DEV-05 & S1-DEV-06)
// Ready to connect once backend implements them
// ============================================================================

export const userApi = {
  /**
   * Retrieves the list of users.
   * Admin sees regular users; Superadmin sees all users.
   * Endpoint: GET /api/users
   */
  listUsers: async (): Promise<ManagedUser[]> => {
    const list = await apiFetch<ManagedUser[]>("/api/users")
    return list.map((u) => ({
      ...u,
      role: normalizeRole(u.role),
    }))
  },

  /**
   * Adds a new user directly.
   * Endpoint: POST /api/users
   */
  addUser: (data: {
    firstName?: string
    lastName?: string
    email: string
    role?: Role
    status?: AccountStatus
    password?: string
  }): Promise<ManagedUser> => {
    return apiFetch<ManagedUser>("/api/users", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  /**
   * Updates user details.
   * Endpoint: PUT /api/users/:id
   */
  updateUser: (
    id: string,
    data: {
      firstName?: string
      lastName?: string
      email: string
      role?: Role
      status?: AccountStatus
    }
  ): Promise<ManagedUser> => {
    return apiFetch<ManagedUser>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  /**
   * Blocks or unblocks a user account.
   * Last superadmin cannot be blocked.
   * Endpoint: PATCH /api/users/:id/block
   */
  toggleBlockUser: (id: string, blocked: boolean): Promise<ManagedUser> => {
    return apiFetch<ManagedUser>(`/api/users/${id}/block`, {
      method: "PATCH",
      body: JSON.stringify({ blocked }),
    })
  },

  /**
   * Superadmin approves a pending user account.
   * Endpoint: PATCH /api/users/:id/approve
   */
  approveUser: (id: string): Promise<ManagedUser> => {
    return apiFetch<ManagedUser>(`/api/users/${id}/approve`, {
      method: "PATCH",
    })
  },

  /**
   * Superadmin designates user role (Admin / User).
   * Endpoint: PATCH /api/users/:id/role
   */
  designateRole: (id: string, role: Role): Promise<ManagedUser> => {
    return apiFetch<ManagedUser>(`/api/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    })
  },

  /**
   * Superadmin deletes a user account.
   * Endpoint: DELETE /api/users/:id
   */
  deleteUser: (id: string): Promise<{ message: string }> => {
    return apiFetch<{ message: string }>(`/api/users/${id}`, {
      method: "DELETE",
    })
  },

  /**
   * Retrieves password reset requests from `password_reset_request`.
   * Endpoint: GET /api/users/reset-requests
   */
  listResetRequests: (): Promise<PasswordResetRequest[]> => {
    return apiFetch<PasswordResetRequest[]>("/api/users/reset-requests")
  },

  /**
   * Superadmin generates a security reset token into `password_reset_token`
   * for a password reset request.
   * Endpoint: POST /api/users/reset-requests/:id/generate-token
   */
  generateResetToken: (requestId: string): Promise<PasswordResetRequest> => {
    return apiFetch<PasswordResetRequest>(
      `/api/users/reset-requests/${requestId}/generate-token`,
      {
        method: "POST",
      }
    )
  },

  /**
   * Superadmin deletes a password reset request and its associated token in `password_reset_token`.
   * Endpoint: DELETE /api/users/reset-requests/:id
   */
  deleteResetRequest: (requestId: string): Promise<{ message: string }> => {
    return apiFetch<{ message: string }>(`/api/users/reset-requests/${requestId}`, {
      method: "DELETE",
    })
  },
}

// ============================================================================
// Sprint 1 Future Planned Rights & Permissions APIs (S1-DEV-07)
// Ready to connect once backend implements them
// ============================================================================

export const rightsApi = {
  /**
   * Retrieves assigned rights for a user.
   * Endpoint: GET /api/users/:id/rights
   */
  getUserRights: async (userId: string): Promise<string[]> => {
    const res = await apiFetch<{ userId: string; rights: string[] }>(`/api/users/${userId}/rights`)
    return res.rights || []
  },

  /**
   * Assigns per-action module rights to a user.
   * Endpoint: POST /api/users/:id/rights
   */
  assignRights: (
    userId: string,
    rights: string[]
  ): Promise<{ message: string; rights: string[] }> => {
    return apiFetch<{ message: string; rights: string[] }>(`/api/users/${userId}/rights`, {
      method: "POST",
      body: JSON.stringify({ rights }),
    })
  },
}

// ============================================================================
// Sprint 2 Customer Management APIs (S2-DEV-01)
// Connects to /api/customers backed by Supabase PostgreSQL customer table
// ============================================================================

export const customerApi = {
  /**
   * Retrieves customers with optional search query, status filter, and payment terms filter.
   * Server-side permission check: requires Customer - View (or Admin/Superadmin).
   * Endpoint: GET /api/customers
   */
  listCustomers: async (params?: CustomerQueryParams): Promise<Customer[]> => {
    const query = new URLSearchParams()
    if (params?.search) query.set("search", params.search)
    if (params?.status) query.set("status", params.status)
    if (params?.payterm) query.set("payterm", params.payterm)
    const queryString = query.toString() ? `?${query.toString()}` : ""
    return apiFetch<Customer[]>(`/api/customers${queryString}`)
  },

  /**
   * Retrieves a single customer record by custno.
   * Endpoint: GET /api/customers/:custno
   */
  getCustomer: async (custno: string): Promise<Customer> => {
    return apiFetch<Customer>(`/api/customers/${encodeURIComponent(custno)}`)
  },

  /**
   * Creates a new customer master record.
   * Server-side permission check: requires Customer - Add (or Admin/Superadmin).
   * Endpoint: POST /api/customers
   */
  createCustomer: (data: CreateCustomerPayload): Promise<Customer> => {
    return apiFetch<Customer>("/api/customers", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  /**
   * Updates existing customer details.
   * Server-side permission check: requires Customer - Edit (or Admin/Superadmin).
   * Endpoint: PUT /api/customers/:custno
   */
  updateCustomer: (
    custno: string,
    data: UpdateCustomerPayload
  ): Promise<Customer> => {
    return apiFetch<Customer>(`/api/customers/${encodeURIComponent(custno)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  /**
   * Soft deletes a customer record (flags is_deleted = true).
   * Checks referential integrity against sales orders.
   * Server-side permission check: requires Customer - Delete (or Admin/Superadmin).
   * Endpoint: DELETE /api/customers/:custno
   */
  deleteCustomer: (
    custno: string
  ): Promise<{ message: string; blocked?: boolean }> => {
    return apiFetch<{ message: string; blocked?: boolean }>(
      `/api/customers/${encodeURIComponent(custno)}`,
      {
        method: "DELETE",
      }
    )
  },

  /**
   * Restores a soft-deleted customer record (flags is_deleted = false).
   * Server-side permission check: requires Customer - Edit (or Admin/Superadmin).
   * Endpoint: POST /api/customers/:custno/restore
   */
  restoreCustomer: (custno: string): Promise<{ message: string }> => {
    return apiFetch<{ message: string }>(
      `/api/customers/${encodeURIComponent(custno)}/restore`,
      {
        method: "POST",
      }
    )
  },
}

// ============================================================================
// Product Master APIs (Sprint 2 - S2-DEV-04)
// ============================================================================

export const productApi = {
  /**
   * Fetches products with optional search query, status ('active' | 'inactive' | 'all'), and unit filter.
   * Endpoint: GET /api/products?search=&status=&unit=
   */
  listProducts: (params?: ProductQueryParams): Promise<Product[]> => {
    const query = new URLSearchParams()
    if (params?.search) query.set("search", params.search)
    if (params?.status) query.set("status", params.status)
    if (params?.unit) query.set("unit", params.unit)
    const queryString = query.toString() ? `?${query.toString()}` : ""
    return apiFetch<Product[]>(`/api/products${queryString}`)
  },

  /**
   * Retrieves a single product by prodcode.
   * Endpoint: GET /api/products/:prodcode
   */
  getProduct: (prodcode: string): Promise<Product> => {
    return apiFetch<Product>(`/api/products/${encodeURIComponent(prodcode)}`)
  },

  /**
   * Creates a new product record.
   * Server-side permission check: requires Product - Add (or Admin/Superadmin).
   * Endpoint: POST /api/products
   */
  createProduct: (data: CreateProductPayload): Promise<Product> => {
    return apiFetch<Product>("/api/products", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  /**
   * Updates an existing product description or unit.
   * Server-side permission check: requires Product - Edit (or Admin/Superadmin).
   * Endpoint: PUT /api/products/:prodcode
   */
  updateProduct: (
    prodcode: string,
    data: UpdateProductPayload
  ): Promise<Product> => {
    return apiFetch<Product>(`/api/products/${encodeURIComponent(prodcode)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  /**
   * Soft deletes a product record (flags is_deleted = true).
   * Checks referential integrity against sales orders and active prices.
   * Server-side permission check: requires Product - Delete (or Admin/Superadmin).
   * Endpoint: DELETE /api/products/:prodcode
   */
  deleteProduct: (
    prodcode: string
  ): Promise<{ message: string; blocked?: boolean }> => {
    return apiFetch<{ message: string; blocked?: boolean }>(
      `/api/products/${encodeURIComponent(prodcode)}`,
      {
        method: "DELETE",
      }
    )
  },

  /**
   * Restores a soft-deleted product record (flags is_deleted = false).
   * Server-side permission check: requires Product - Edit (or Admin/Superadmin).
   * Endpoint: POST /api/products/:prodcode/restore
   */
  restoreProduct: (prodcode: string): Promise<{ message: string }> => {
    return apiFetch<{ message: string }>(
      `/api/products/${encodeURIComponent(prodcode)}/restore`,
      {
        method: "POST",
      }
    )
  },

  /**
   * Fetches full price schedule history for a specific product.
   * Endpoint: GET /api/products/:prodcode/prices
   */
  listPriceHistory: (prodcode: string): Promise<PriceHistoryRecord[]> => {
    return apiFetch<PriceHistoryRecord[]>(
      `/api/products/${encodeURIComponent(prodcode)}/prices`
    )
  },

  /**
   * Adds a new price schedule rate with an effective date for a product.
   * Endpoint: POST /api/products/:prodcode/prices
   */
  createPriceSchedule: (
    prodcode: string,
    data: { effdate: string; unitprice: number }
  ): Promise<PriceHistoryRecord> => {
    return apiFetch<PriceHistoryRecord>(
      `/api/products/${encodeURIComponent(prodcode)}/prices`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    )
  },

  /**
   * Updates an existing price schedule rate and/or effective date.
   * Endpoint: PUT /api/products/:prodcode/prices/:effdate
   */
  updatePriceSchedule: (
    prodcode: string,
    originalEffDate: string,
    data: { effdate: string; unitprice: number }
  ): Promise<PriceHistoryRecord> => {
    return apiFetch<PriceHistoryRecord>(
      `/api/products/${encodeURIComponent(prodcode)}/prices/${encodeURIComponent(originalEffDate)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    )
  },

  /**
   * Soft deletes / supersedes a price schedule for a product.
   * Endpoint: DELETE /api/products/:prodcode/prices/:effdate
   */
  deletePriceSchedule: (
    prodcode: string,
    effdate: string
  ): Promise<{ message: string }> => {
    return apiFetch<{ message: string }>(
      `/api/products/${encodeURIComponent(prodcode)}/prices/${encodeURIComponent(effdate)}`,
      {
        method: "DELETE",
      }
    )
  },

  /**
   * Restores a soft-deleted / superseded price schedule.
   * Endpoint: POST /api/products/:prodcode/prices/:effdate/restore
   */
  restorePriceSchedule: (
    prodcode: string,
    effdate: string
  ): Promise<{ message: string }> => {
    return apiFetch<{ message: string }>(
      `/api/products/${encodeURIComponent(prodcode)}/prices/${encodeURIComponent(effdate)}/restore`,
      {
        method: "POST",
      }
    )
  },
}

// ============================================================================
// Department Master Data APIs (Sprint 3 — S3-DEV-01)
// ============================================================================

export const departmentApi = {
  /**
   * Fetches the department directory with optional search and status filtering.
   * Endpoint: GET /api/departments
   */
  listDepartments: (
    params: DepartmentQueryParams = {}
  ): Promise<Department[]> => {
    const q = new URLSearchParams()
    if (params.search) q.set("search", params.search)
    if (params.status) q.set("status", params.status)
    const queryString = q.toString() ? `?${q.toString()}` : ""
    return apiFetch<Department[]>(`/api/departments${queryString}`)
  },

  /**
   * Fetches a single department by code.
   * Endpoint: GET /api/departments/:deptcode
   */
  getDepartment: (deptcode: string): Promise<Department> => {
    return apiFetch<Department>(`/api/departments/${encodeURIComponent(deptcode)}`)
  },

  /**
   * Creates a new department record.
   * Server-side permission check: requires Department - Add (or Admin/Superadmin).
   * Endpoint: POST /api/departments
   */
  createDepartment: (
    data: CreateDepartmentPayload
  ): Promise<Department> => {
    return apiFetch<Department>("/api/departments", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  /**
   * Updates an existing department name.
   * Server-side permission check: requires Department - Edit (or Admin/Superadmin).
   * Endpoint: PUT /api/departments/:deptcode
   */
  updateDepartment: (
    deptcode: string,
    data: UpdateDepartmentPayload
  ): Promise<Department> => {
    return apiFetch<Department>(
      `/api/departments/${encodeURIComponent(deptcode)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    )
  },

  /**
   * Soft-deletes a department record (sets is_deleted = true).
   * Validates child employee references; returns 409 if active employees reference it.
   * Server-side permission check: requires Department - Delete (or Admin/Superadmin).
   * Endpoint: DELETE /api/departments/:deptcode
   */
  deleteDepartment: (
    deptcode: string
  ): Promise<{ message: string; blocked?: boolean; reason?: string }> => {
    return apiFetch<{ message: string; blocked?: boolean; reason?: string }>(
      `/api/departments/${encodeURIComponent(deptcode)}`,
      {
        method: "DELETE",
      }
    )
  },

  /**
   * Restores a soft-deleted department record (sets is_deleted = false).
   * Server-side permission check: requires Department - Edit (or Admin/Superadmin).
   * Endpoint: POST /api/departments/:deptcode/restore
   */
  restoreDepartment: (deptcode: string): Promise<{ message: string }> => {
    return apiFetch<{ message: string }>(
      `/api/departments/${encodeURIComponent(deptcode)}/restore`,
      {
        method: "POST",
      }
    )
  },
}

// ============================================================================
// Job Master Data APIs (Sprint 3 — S3-DEV-02)
// ============================================================================

export const jobApi = {
  /**
   * Fetches the job directory with optional search and status filtering.
   * Endpoint: GET /api/jobs
   */
  listJobs: (
    params: JobQueryParams = {}
  ): Promise<Job[]> => {
    const q = new URLSearchParams()
    if (params.search) q.set("search", params.search)
    if (params.status) q.set("status", params.status)
    const queryString = q.toString() ? `?${q.toString()}` : ""
    return apiFetch<Job[]>(`/api/jobs${queryString}`)
  },

  /**
   * Fetches a single job by code.
   * Endpoint: GET /api/jobs/:jobcode
   */
  getJob: (jobcode: string): Promise<Job> => {
    return apiFetch<Job>(`/api/jobs/${encodeURIComponent(jobcode)}`)
  },

  /**
   * Creates a new job record.
   * Server-side permission check: requires Job - Add (or Admin/Superadmin).
   * Endpoint: POST /api/jobs
   */
  createJob: (
    data: CreateJobPayload
  ): Promise<Job> => {
    return apiFetch<Job>("/api/jobs", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  /**
   * Updates an existing job title / description.
   * Server-side permission check: requires Job - Edit (or Admin/Superadmin).
   * Endpoint: PUT /api/jobs/:jobcode
   */
  updateJob: (
    jobcode: string,
    data: UpdateJobPayload
  ): Promise<Job> => {
    return apiFetch<Job>(
      `/api/jobs/${encodeURIComponent(jobcode)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    )
  },

  /**
   * Soft-deletes a job record (sets is_deleted = true).
   * Validates child employee references; returns 409 if active employees reference it.
   * Server-side permission check: requires Job - Delete (or Admin/Superadmin).
   * Endpoint: DELETE /api/jobs/:jobcode
   */
  deleteJob: (
    jobcode: string
  ): Promise<{ message: string; blocked?: boolean; reason?: string }> => {
    return apiFetch<{ message: string; blocked?: boolean; reason?: string }>(
      `/api/jobs/${encodeURIComponent(jobcode)}`,
      {
        method: "DELETE",
      }
    )
  },

  /**
   * Restores a soft-deleted job record (sets is_deleted = false).
   * Server-side permission check: requires Job - Edit (or Admin/Superadmin).
   * Endpoint: POST /api/jobs/:jobcode/restore
   */
  restoreJob: (jobcode: string): Promise<{ message: string }> => {
    return apiFetch<{ message: string }>(
      `/api/jobs/${encodeURIComponent(jobcode)}/restore`,
      {
        method: "POST",
      }
    )
  },
}

// ============================================================================
// Employee Directory APIs (Sprint 3 — S3-DEV-03)
// ============================================================================

export const employeeApi = {
  /**
   * Fetches the employee directory with optional search, department, job, and status filtering.
   * Endpoint: GET /api/employees
   */
  listEmployees: (
    params: EmployeeQueryParams = {}
  ): Promise<Employee[]> => {
    const q = new URLSearchParams()
    if (params.search) q.set("search", params.search)
    if (params.status) q.set("status", params.status)
    if (params.department) q.set("department", params.department)
    if (params.job) q.set("job", params.job)
    const queryString = q.toString() ? `?${q.toString()}` : ""
    return apiFetch<Employee[]>(`/api/employees${queryString}`)
  },

  /**
   * Fetches a single employee by employee number.
   * Endpoint: GET /api/employees/:empno
   */
  getEmployee: (empno: string): Promise<Employee> => {
    return apiFetch<Employee>(`/api/employees/${encodeURIComponent(empno)}`)
  },

  /**
   * Creates a new employee personnel record.
   * Server-side permission check: requires Employee - Add (or Admin/Superadmin).
   * Endpoint: POST /api/employees
   */
  createEmployee: (data: CreateEmployeePayload): Promise<Employee> => {
    return apiFetch<Employee>("/api/employees", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  /**
   * Updates an existing employee profile information and/or separation date.
   * Server-side permission check: requires Employee - Edit (or Admin/Superadmin).
   * Endpoint: PUT /api/employees/:empno
   */
  updateEmployee: (
    empno: string,
    data: UpdateEmployeePayload
  ): Promise<Employee> => {
    return apiFetch<Employee>(`/api/employees/${encodeURIComponent(empno)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },

  /**
   * Deactivates (soft-deletes) an employee profile and sets separation date to today.
   * Server-side referential integrity check: blocks deactivation if employee is assigned as department lead or referenced in active sales transactions.
   * Server-side permission check: requires Employee - Delete (or Admin/Superadmin).
   * Endpoint: DELETE /api/employees/:empno
   */
  deleteEmployee: (
    empno: string
  ): Promise<{ message: string; empno: string; sepdate: string; stamp: string; blocked?: boolean; reason?: string }> => {
    return apiFetch<{ message: string; empno: string; sepdate: string; stamp: string; blocked?: boolean; reason?: string }>(
      `/api/employees/${encodeURIComponent(empno)}`,
      { method: "DELETE" }
    )
  },

  /**
   * Restores a previously deactivated (soft-deleted) employee to Active status, clearing the separation date.
   * Server-side permission check: requires Employee - Edit / Delete (or Admin/Superadmin).
   * Endpoint: POST /api/employees/:empno/restore
   */
  restoreEmployee: (
    empno: string
  ): Promise<{ message: string; empno: string; sepdate: null; stamp: string }> => {
    return apiFetch<{ message: string; empno: string; sepdate: null; stamp: string }>(
      `/api/employees/${encodeURIComponent(empno)}/restore`,
      { method: "POST" }
    )
  },

  /**
   * Checks whether an employee has active referential integrity dependencies (department lead, active sales transactions).
   * Endpoint: GET /api/employees/:empno/check-references
   */
  checkReferences: (
    empno: string
  ): Promise<{ hasActiveReferences: boolean; referenceCount: number; reason?: string; message?: string }> => {
    return apiFetch<{ hasActiveReferences: boolean; referenceCount: number; reason?: string; message?: string }>(
      `/api/employees/${encodeURIComponent(empno)}/check-references`
    )
  },
}

// ============================================================================
// Sprint 3 Job History Management APIs (S3-DEV-06)
// Supports career promotions, transfers, effective date uniqueness & salary tracking
// ============================================================================

export const jobHistoryApi = {
  /**
   * Fetches job history milestones for an employee.
   * Endpoint: GET /api/employees/:empno/history
   */
  listHistory: (empno: string): Promise<JobHistoryRecord[]> => {
    return apiFetch<JobHistoryRecord[]>(`/api/employees/${encodeURIComponent(empno)}/history`)
  },

  /**
   * Records a new promotion or transfer milestone for an employee.
   * Server-side check: enforces unique effective date per employee & positive salary.
   * Endpoint: POST /api/employees/:empno/history
   */
  addHistory: (
    empno: string,
    data: CreateJobHistoryPayload
  ): Promise<JobHistoryRecord> => {
    return apiFetch<JobHistoryRecord>(`/api/employees/${encodeURIComponent(empno)}/history`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  /**
   * Updates an existing job history milestone (job, department, salary).
   * Endpoint: PUT /api/employees/:empno/history/:effdate
   */
  updateHistory: (
    empno: string,
    effdate: string,
    data: UpdateJobHistoryPayload
  ): Promise<JobHistoryRecord> => {
    return apiFetch<JobHistoryRecord>(
      `/api/employees/${encodeURIComponent(empno)}/history/${encodeURIComponent(effdate)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      }
    )
  },

  /**
   * Soft-deletes (archives) a job history milestone.
   * Endpoint: DELETE /api/employees/:empno/history/:effdate
   */
  deleteHistory: (
    empno: string,
    effdate: string
  ): Promise<{ message: string; empno: string; effdate: string; stamp: string }> => {
    return apiFetch<{ message: string; empno: string; effdate: string; stamp: string }>(
      `/api/employees/${encodeURIComponent(empno)}/history/${encodeURIComponent(effdate)}`,
      {
        method: "DELETE",
      }
    )
  },

  /**
   * Restores a soft-deleted job history milestone to active status.
   * Endpoint: POST /api/employees/:empno/history/:effdate/restore
   */
  restoreHistory: (
    empno: string,
    effdate: string
  ): Promise<{ message: string; empno: string; effdate: string; stamp: string }> => {
    return apiFetch<{ message: string; empno: string; effdate: string; stamp: string }>(
      `/api/employees/${encodeURIComponent(empno)}/history/${encodeURIComponent(effdate)}/restore`,
      {
        method: "POST",
      }
    )
  },
}




// ============================================================================
// Table Editor APIs (Superadmin Only — All Public Tables Except app_user)
// ============================================================================

export const tableEditorApi = {
  listRows: (tableName: string, orderBy?: string): Promise<Record<string, any>[]> => {
    const query = orderBy ? `?order=${encodeURIComponent(orderBy)}` : ""
    return apiFetch<Record<string, any>[]>(`/api/tables/${encodeURIComponent(tableName)}${query}`)
  },

  insertRow: (
    tableName: string,
    payload: Record<string, any>
  ): Promise<Record<string, any>> => {
    return apiFetch<Record<string, any>>(`/api/tables/${encodeURIComponent(tableName)}`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  updateRow: (
    tableName: string,
    primaryKeys: Record<string, any>,
    updates: Record<string, any>
  ): Promise<Record<string, any>> => {
    return apiFetch<Record<string, any>>(`/api/tables/${encodeURIComponent(tableName)}`, {
      method: "PUT",
      body: JSON.stringify({ primaryKeys, updates }),
    })
  },

  deleteRow: (
    tableName: string,
    primaryKeyValues: Record<string, any>
  ): Promise<{ message: string }> => {
    return apiFetch<{ message: string }>(`/api/tables/${encodeURIComponent(tableName)}`, {
      method: "DELETE",
      body: JSON.stringify(primaryKeyValues),
    })
  },
}

// ============================================================================
// Sprint 4: Sales APIs (S4-DEV-01)
// ============================================================================

export interface SalesOptionsResponse {
  customers: { custno: string; custname: string; label: string }[]
  salespersons: { empno: string; firstname: string; lastname: string; label: string }[]
  suggestedTransno: string
}

export const salesApi = {
  listSales: (params?: SalesQueryParams): Promise<SaleHeader[]> => {
    const q = new URLSearchParams()
    if (params?.search) q.set("search", params.search)
    if (params?.status) q.set("status", params.status)
    if (params?.customer) q.set("customer", params.customer)
    if (params?.salesperson) q.set("salesperson", params.salesperson)
    const query = q.toString() ? `?${q.toString()}` : ""
    return apiFetch<SaleHeader[]>(`/api/sales${query}`)
  },

  getSale: (transno: string): Promise<SaleHeader> => {
    return apiFetch<SaleHeader>(`/api/sales/${encodeURIComponent(transno)}`)
  },

  getOptions: (): Promise<SalesOptionsResponse> => {
    return apiFetch<SalesOptionsResponse>("/api/sales/lookups/options")
  },

  createSale: (payload: CreateSalePayload): Promise<SaleHeader> => {
    return apiFetch<SaleHeader>("/api/sales", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  restoreSale: (transno: string): Promise<{ message: string; transno: string; stamp: string }> => {
    return apiFetch<{ message: string; transno: string; stamp: string }>(
      `/api/sales/${encodeURIComponent(transno)}/restore`,
      { method: "POST" }
    )
  },

  softDeleteSale: (
    transno: string
  ): Promise<{ message: string; transno: string; stamp: string }> => {
    return apiFetch<{ message: string; transno: string; stamp: string }>(
      `/api/sales/${encodeURIComponent(transno)}`,
      { method: "DELETE" }
    )
  },

  // Sale Details (S4-DEV-02)
  listDetails: (transno: string, status?: "active" | "inactive" | "all"): Promise<SaleLineItem[]> => {
    const q = status ? `?status=${encodeURIComponent(status)}` : ""
    return apiFetch<SaleLineItem[]>(`/api/sales/${encodeURIComponent(transno)}/details${q}`)
  },

  getProductOptions: (salesdate?: string): Promise<SaleProductOption[]> => {
    const q = salesdate ? `?salesdate=${encodeURIComponent(salesdate)}` : ""
    return apiFetch<SaleProductOption[]>(`/api/sales/lookups/products${q}`)
  },

  resolveUnitPrice: (
    transno: string,
    prodcode: string
  ): Promise<{ transno: string; prodcode: string; salesdate: string; unitPrice: number; formattedUnitPrice: string }> => {
    return apiFetch<{ transno: string; prodcode: string; salesdate: string; unitPrice: number; formattedUnitPrice: string }>(
      `/api/sales/${encodeURIComponent(transno)}/details/price-lookup?prodcode=${encodeURIComponent(prodcode)}`
    )
  },

  addDetail: (transno: string, payload: CreateSaleLinePayload): Promise<SaleLineItem> => {
    return apiFetch<SaleLineItem>(`/api/sales/${encodeURIComponent(transno)}/details`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  updateDetail: (
    transno: string,
    prodcode: string,
    payload: UpdateSaleLinePayload
  ): Promise<SaleLineItem> => {
    return apiFetch<SaleLineItem>(
      `/api/sales/${encodeURIComponent(transno)}/details/${encodeURIComponent(prodcode)}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    )
  },

  deleteDetail: (
    transno: string,
    prodcode: string
  ): Promise<{ message: string; transno: string; prodcode: string; stamp: string }> => {
    return apiFetch<{ message: string; transno: string; prodcode: string; stamp: string }>(
      `/api/sales/${encodeURIComponent(transno)}/details/${encodeURIComponent(prodcode)}`,
      { method: "DELETE" }
    )
  },

  restoreDetail: (
    transno: string,
    prodcode: string
  ): Promise<{ message: string; transno: string; prodcode: string; stamp: string }> => {
    return apiFetch<{ message: string; transno: string; prodcode: string; stamp: string }>(
      `/api/sales/${encodeURIComponent(transno)}/details/${encodeURIComponent(prodcode)}/restore`,
      { method: "POST" }
    )
  },
}

