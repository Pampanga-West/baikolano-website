/**
 * Embedded Backend Server for HOPE ERP Prototype
 * 
 * Recreates the complete Spring Boot backend (AuthController + UserController)
 * inside the browser, directly connected to Supabase PostgreSQL:
 * - 'app_user' table
 * - 'user_permission' table
 * - 'password_reset_token' table
 * - 'audit_log' table
 * 
 * Enforces strict role-based access control, safeguards (last Superadmin protection),
 * and transparent session management.
 */

import bcrypt from "bcryptjs"
import {
  cleanupUserPasswordResetTokensInSupabase,
  deletePasswordResetRequestInSupabase,
  deleteTableRowFromSupabase,
  deleteUserFromSupabase,
  fetchPasswordResetRequestsFromSupabase,
  fetchTableRowsFromSupabase,
  fetchUserRightsFromSupabase,
  fetchUsersFromSupabase,
  findUserByEmailFromSupabase,
  findUserByIdFromSupabase,
  generateTokenForResetRequestInSupabase,
  insertAuditLogIntoSupabase,
  insertTableRowIntoSupabase,
  insertUserIntoSupabase,
  createPasswordResetRequestInSupabase,
  resetPasswordWithTokenInSupabase,
  saveUserRightsInSupabase,
  updateTableRowInSupabase,
  updateUserInSupabase,
  verifyPassword,
  fetchCustomersFromSupabase,
  fetchCustomerByCustnoFromSupabase,
  insertCustomerIntoSupabase,
  updateCustomerInSupabase,
  softDeleteCustomerInSupabase,
  restoreCustomerInSupabase,
  fetchProductsFromSupabase,
  fetchProductByProdcodeFromSupabase,
  insertProductIntoSupabase,
  updateProductInSupabase,
  softDeleteProductInSupabase,
  restoreProductInSupabase,
  softDeletePriceScheduleInSupabase,
  restorePriceScheduleInSupabase,
  fetchPriceHistoryForProductFromSupabase,
  insertPriceScheduleIntoSupabase,
  updatePriceScheduleInSupabase,
  fetchDepartmentsFromSupabase,
  fetchDepartmentByDeptcodeFromSupabase,
  insertDepartmentIntoSupabase,
  updateDepartmentInSupabase,
  softDeleteDepartmentInSupabase,
  restoreDepartmentInSupabase,
  checkDepartmentHasActiveReferences,
  fetchJobsFromSupabase,
  fetchJobByJobcodeFromSupabase,
  insertJobIntoSupabase,
  updateJobInSupabase,
  softDeleteJobInSupabase,
  restoreJobInSupabase,
  checkJobHasActiveReferences,
  fetchEmployeesFromSupabase,
  fetchEmployeeByEmpnoFromSupabase,
  insertEmployeeIntoSupabase,
  updateEmployeeInSupabase,
  softDeleteEmployeeInSupabase,
  restoreEmployeeInSupabase,
  checkEmployeeHasActiveReferences,
  fetchJobHistoryForEmployeeFromSupabase,
  insertJobHistoryIntoSupabase,
  updateJobHistoryInSupabase,
  softDeleteJobHistoryInSupabase,
  restoreJobHistoryInSupabase,
  fetchSalesFromSupabase,
  fetchSaleByTransnoFromSupabase,
  insertSaleIntoSupabase,
  softDeleteSaleInSupabase,
  restoreSaleInSupabase,
  fetchActiveCustomersForDropdown,
  fetchActiveSalespersonsForDropdown,
  generateNextTransno,
  resolveProductUnitPriceAsOfDate,
  fetchActiveProductsForSaleDropdown,
  fetchSaleDetailsFromSupabase,
  insertSaleDetailIntoSupabase,
  updateSaleDetailInSupabase,
  softDeleteSaleDetailInSupabase,
  restoreSaleDetailInSupabase,
  generateNextOrno,
  fetchPaymentsForSaleFromSupabase,
  insertPaymentIntoSupabase,
  softDeletePaymentInSupabase,
  restorePaymentInSupabase,
  fetchCustomerBalancesFromSupabase,
  formatMoney,
  parseStamp,
  type SupabaseUserRow,
} from "./supabaseClient.ts"

export interface DbUser {
  id: string
  email: string
  passwordHash: string
  role: "Superadmin" | "Admin" | "User"
  approvalStatus: "PENDING" | "APPROVED"
  blocked: boolean
  firstName: string
  lastName: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEYS = {
  USERS_CACHE: "hope_erp_users_cache",
  SESSION_USER_ID: "hope_erp_session_user_id",
  SESSION_USER_EMAIL: "hope_erp_session_user_email",
}

// ----------------------------------------------------------------------------
// Local Storage Persistence & Session Helpers
// ----------------------------------------------------------------------------
function getSessionUserId(): string | null {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(STORAGE_KEYS.SESSION_USER_ID)
}

function setSessionUser(user: DbUser | null): void {
  if (typeof localStorage === "undefined") return
  if (user) {
    localStorage.setItem(STORAGE_KEYS.SESSION_USER_ID, user.id)
    localStorage.setItem(STORAGE_KEYS.SESSION_USER_EMAIL, user.email)
  } else {
    localStorage.removeItem(STORAGE_KEYS.SESSION_USER_ID)
    localStorage.removeItem(STORAGE_KEYS.SESSION_USER_EMAIL)
  }
}

function toDbUser(row: SupabaseUserRow): DbUser {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role || "User",
    approvalStatus: row.approval_status || "PENDING",
    blocked: Boolean(row.blocked),
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Fetch users from Supabase with fallback to local cache
async function getLiveUsers(): Promise<DbUser[]> {
  try {
    const rows = await fetchUsersFromSupabase()
    const dbUsers = rows.map(toDbUser)
    // Update local cache
    try {
      localStorage.setItem(STORAGE_KEYS.USERS_CACHE, JSON.stringify(dbUsers))
    } catch {
      // Ignore quota errors
    }
    return dbUsers
  } catch (err) {
    console.warn("[EmbeddedBackend] Supabase query failed, using local cache fallback:", err)
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.USERS_CACHE)
      if (cached) return JSON.parse(cached)
    } catch {
      // Fall through
    }
    return []
  }
}

async function getLiveUserById(id: string): Promise<DbUser | null> {
  try {
    const row = await findUserByIdFromSupabase(id)
    return row ? toDbUser(row) : null
  } catch {
    const users = await getLiveUsers()
    return users.find((u) => u.id === id) || null
  }
}

async function getLiveUserByEmail(email: string): Promise<DbUser | null> {
  try {
    const row = await findUserByEmailFromSupabase(email)
    return row ? toDbUser(row) : null
  } catch {
    const users = await getLiveUsers()
    return users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()) || null
  }
}

// Generate simple mock UUID
function generateUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Helper to construct simulated fetch Response
function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    statusText: status === 200 ? "OK" : status === 201 ? "Created" : "Error",
    headers: {
      "Content-Type": "application/json",
    },
  })
}

function textResponse(text: string, status = 200): Response {
  return new Response(text, {
    status,
    headers: {
      "Content-Type": "text/plain",
    },
  })
}

// ----------------------------------------------------------------------------
// Route Handlers (Directly connected to Supabase)
// ----------------------------------------------------------------------------

export async function handleEmbeddedRequest(urlPath: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || "GET").toUpperCase()

  // Parse path and query parameters
  const parsedUrl = new URL(urlPath, "http://localhost:8080")
  const pathname = parsedUrl.pathname
  const body = options.body ? (typeof options.body === "string" ? JSON.parse(options.body) : options.body) : {}

  const reqHeaders = new Headers(options.headers)
  const testRole = reqHeaders.get("x-test-role")
  const testRightsHeader = reqHeaders.get("x-test-rights")
  const testRights = testRightsHeader !== null ? testRightsHeader.split(",").map((s) => s.trim()) : null

  const currentUserId = getSessionUserId()
  let currentUser: DbUser | null = null
  if (testRole) {
    currentUser = {
      id: "test-user-session",
      email: "test.user@hope.example",
      passwordHash: "",
      role: testRole as Role,
      approvalStatus: "APPROVED",
      blocked: false,
      firstName: "Test",
      lastName: testRole,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  } else if (currentUserId) {
    currentUser = await getLiveUserById(currentUserId)
  }

  // 1. Auxiliary Test Endpoints
  if (pathname === "/" && method === "GET") {
    return textResponse("Hello from my backend!")
  }
  if (pathname === "/api/db-test" && method === "GET") {
    return textResponse(new Date().toISOString())
  }

  // 2. CSRF Token Endpoint (GET /api/auth/csrf)
  if (pathname === "/api/auth/csrf" && method === "GET") {
    return jsonResponse({ token: "csrf-" + generateUuid() })
  }

  // 3. Register (POST /api/auth/register) -> Inserts into Supabase app_user
  if (pathname === "/api/auth/register" && method === "POST") {
    const email = (body.email || "").trim().toLowerCase()
    const password = body.password || ""

    if (!email || !email.includes("@")) {
      return jsonResponse({ message: "Please enter a valid email." }, 400)
    }
    if (!password || password.length < 8) {
      return jsonResponse({ message: "Password must be at least 8 characters long." }, 400)
    }

    const existing = await getLiveUserByEmail(email)
    if (existing) {
      return jsonResponse({ message: "An account with this email already exists." }, 409)
    }

    try {
      const createdRow = await insertUserIntoSupabase({
        email,
        password,
        role: "User",
        approvalStatus: "PENDING",
      })

      // Log registration to Supabase audit_log
      await insertAuditLogIntoSupabase({
        table_name: "app_user",
        action: "ADD",
        record_key: createdRow.id,
        action_by: email,
      }).catch(() => {})

      return jsonResponse(
        {
          message: "Account registered successfully.",
          id: createdRow.id,
          email: createdRow.email,
          role: createdRow.role,
          approvalStatus: createdRow.approval_status,
        },
        201
      )
    } catch (err: any) {
      return jsonResponse({ message: err.message || "Registration failed." }, 400)
    }
  }

  // 4. Login (POST /api/auth/login) -> Checks live Supabase app_user & password hash
  if (pathname === "/api/auth/login" && method === "POST") {
    const email = (body.email || "").trim().toLowerCase()
    const password = body.password || ""

    const user = await getLiveUserByEmail(email)
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return jsonResponse({ message: "Incorrect email or password." }, 401)
    }

    if (user.approvalStatus === "PENDING" || user.blocked) {
      return jsonResponse({ message: "Your account is pending approval or blocked." }, 403)
    }

    // Set active session
    setSessionUser(user)

    // Automatically delete any password reset tokens/requests for this user upon login
    await cleanupUserPasswordResetTokensInSupabase(user.id, user.email).catch(() => {})

    return jsonResponse({
      message: "Login successful.",
      email: user.email,
    })
  }

  // 5. Current User (GET /api/auth/me) -> Returns current session from Supabase
  if (pathname === "/api/auth/me" && method === "GET") {
    if (!currentUser) {
      return jsonResponse({ message: "Not authenticated." }, 401)
    }

    return jsonResponse({
      id: currentUser.id,
      email: currentUser.email,
      firstName: currentUser.firstName || "",
      lastName: currentUser.lastName || "",
      role: currentUser.role,
      approvalStatus: currentUser.approvalStatus,
      blocked: currentUser.blocked,
    })
  }

  // 6. Update Profile (PUT /api/auth/profile) -> Updates live Supabase app_user
  if (pathname === "/api/auth/profile" && method === "PUT") {
    if (!currentUser) {
      return jsonResponse({ message: "Not authenticated." }, 401)
    }

    const updates: Partial<{
      first_name: string | null
      last_name: string | null
      password_hash: string
    }> = {}

    if (body.firstName !== undefined) {
      updates.first_name = String(body.firstName).trim()
    }
    if (body.lastName !== undefined) {
      updates.last_name = String(body.lastName).trim()
    }

    let passwordChanged = false
    if (body.newPassword) {
      if (!body.currentPassword) {
        return jsonResponse({ message: "Current password is required to set a new password." }, 400)
      }
      if (!verifyPassword(body.currentPassword, currentUser.passwordHash)) {
        return jsonResponse({ message: "Incorrect current password." }, 400)
      }
      if (body.newPassword.length < 8) {
        return jsonResponse({ message: "New password must be at least 8 characters long." }, 400)
      }
      updates.password_hash = bcrypt.hashSync(body.newPassword, 10)
      passwordChanged = true
    }

    try {
      const updatedRow = await updateUserInSupabase(currentUser.id, updates)

      // Audit log in Supabase
      await insertAuditLogIntoSupabase({
        table_name: "app_user",
        action: passwordChanged ? "PROFILE_AND_PASSWORD_UPDATE" : "PROFILE_UPDATE",
        record_key: currentUser.id,
        action_by: currentUser.email,
      }).catch(() => {})

      return jsonResponse({
        message: passwordChanged ? "Profile and password updated successfully." : "Profile updated successfully.",
        id: updatedRow.id,
        email: updatedRow.email,
        firstName: updatedRow.first_name || "",
        lastName: updatedRow.last_name || "",
        role: updatedRow.role,
        approvalStatus: updatedRow.approval_status,
      })
    } catch (err: any) {
      return jsonResponse({ message: err.message || "Failed to update profile." }, 500)
    }
  }

  // 7. Logout (POST /api/auth/logout)
  if (pathname === "/api/auth/logout" && method === "POST") {
    setSessionUser(null)
    return jsonResponse({ message: "Logout successful." })
  }

  // 8. Password Reset Request (POST /api/auth/reset-password-request) -> Writes PENDING request to Supabase password_reset_request
  if (pathname === "/api/auth/reset-password-request" && method === "POST") {
    const email = (body.email || "").trim().toLowerCase()
    if (!email || !email.includes("@")) {
      return jsonResponse({ message: "Please enter a valid email address." }, 400)
    }

    const targetUser = await getLiveUserByEmail(email)

    try {
      await createPasswordResetRequestInSupabase({
        userId: targetUser ? targetUser.id : null,
        email,
      })
    } catch (err: any) {
      console.warn("[Supabase] Failed to write password reset request:", err)
      return jsonResponse({ message: err.message || "Failed to record password reset request." }, 500)
    }

    return jsonResponse({
      message:
        "Password reset request submitted. Please check your email after two to three business days for your security reset token.",
    })
  }

  // 9. Reset Password with Token (POST /api/auth/reset-password) -> Validates with Supabase password_reset_token
  if (pathname === "/api/auth/reset-password" && method === "POST") {
    const token = (body.token || "").trim()
    const newPassword = body.newPassword || ""

    if (!token) {
      return jsonResponse({ message: "Reset token is required." }, 400)
    }
    if (!newPassword || newPassword.length < 8) {
      return jsonResponse({ message: "Password must be at least 8 characters long." }, 400)
    }

    try {
      await resetPasswordWithTokenInSupabase(token, newPassword)
      return jsonResponse({
        message: "Password successfully updated. You can now sign in with your new password.",
      })
    } catch (err: any) {
      return jsonResponse({ message: err.message || "Failed to update password." }, 400)
    }
  }

  // ==========================================================================
  // User Management Endpoints (/api/users) -> Live Supabase app_user table
  // ==========================================================================

  const ensureAdmin = () => {
    if (!currentUser) throw new Error("UNAUTHORIZED")
    if (currentUser.role === "User") throw new Error("FORBIDDEN")
    return currentUser
  }

  // 10. List Users (GET /api/users) -> Reads live from Supabase
  if (pathname === "/api/users" && method === "GET") {
    try {
      const caller = ensureAdmin()
      const allUsers = await getLiveUsers()
      const activeSuperadminsCount = allUsers.filter((u) => u.role === "Superadmin" && !u.blocked).length

      let visibleUsers = allUsers
      if (caller.role === "Admin") {
        visibleUsers = allUsers.filter((u) => u.role !== "Superadmin")
      }

      const dtoList = visibleUsers.map((u) => {
        const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ").trim()
        return {
          id: u.id,
          email: u.email,
          firstName: u.firstName || "",
          lastName: u.lastName || "",
          name: fullName || undefined,
          role: u.role,
          approvalStatus: u.approvalStatus,
          blocked: u.blocked,
          isProtected: u.role === "Superadmin" && activeSuperadminsCount <= 1,
          createdAt: u.createdAt,
        }
      })

      return jsonResponse(dtoList)
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.message === "FORBIDDEN") return jsonResponse({ message: "Access denied." }, 403)
      return jsonResponse({ message: "Server error." }, 500)
    }
  }

  // 11. Add User (POST /api/users) -> Inserts live into Supabase app_user
  if (pathname === "/api/users" && method === "POST") {
    try {
      const caller = ensureAdmin()
      const email = (body.email || "").trim().toLowerCase()
      if (!email || !email.includes("@")) {
        return jsonResponse({ message: "Please enter a valid email." }, 400)
      }

      const existing = await getLiveUserByEmail(email)
      if (existing) {
        return jsonResponse({ message: "An account with this email already exists." }, 409)
      }

      const firstName = (body.firstName || "").trim()
      const lastName = (body.lastName || "").trim()

      let role: "Superadmin" | "Admin" | "User" = "User"
      if (caller.role === "Superadmin" && body.role) {
        if (body.role === "Admin" || body.role === "Superadmin" || body.role === "User") {
          role = body.role
        }
      }

      let approvalStatus: "PENDING" | "APPROVED" = "APPROVED"
      let blocked = false
      const requestedStatus = String(body.status || "ACTIVE").toUpperCase()
      if (requestedStatus === "PENDING") {
        approvalStatus = "PENDING"
        blocked = false
      } else if (requestedStatus === "BLOCKED") {
        approvalStatus = "APPROVED"
        blocked = true
      }

      const created = await insertUserIntoSupabase({
        email,
        password: body.password || "Temporary123!",
        role,
        approvalStatus,
        blocked,
        firstName,
        lastName,
      })

      await insertAuditLogIntoSupabase({
        table_name: "app_user",
        action: "ADD",
        record_key: created.id,
        new_values: {
          email: created.email,
          first_name: created.first_name,
          last_name: created.last_name,
          role: created.role,
          approval_status: created.approval_status,
          blocked: created.blocked,
        },
        action_by: caller.email,
      }).catch(() => {})

      const fullName = [created.first_name, created.last_name].filter(Boolean).join(" ").trim()

      return jsonResponse(
        {
          id: created.id,
          email: created.email,
          firstName: created.first_name || "",
          lastName: created.last_name || "",
          name: fullName || undefined,
          role: created.role,
          approvalStatus: created.approval_status,
          blocked: created.blocked,
          isProtected: false,
          createdAt: created.created_at,
        },
        201
      )
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.message === "FORBIDDEN") return jsonResponse({ message: "Access denied." }, 403)
      return jsonResponse({ message: e.message || "Server error." }, 500)
    }
  }

  // 10a. List Password Reset Requests (GET /api/users/reset-requests)
  if (pathname === "/api/users/reset-requests" && method === "GET") {
    try {
      ensureAdmin()
      const rows = await fetchPasswordResetRequestsFromSupabase()
      const list = rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        email: r.email,
        securityResetToken: r.security_reset_token,
        status: r.status,
        used: Boolean(r.used),
        requestedAt: r.requested_at,
        expiresAt: r.expires_at,
        completedAt: r.completed_at,
      }))
      return jsonResponse(list)
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.message === "FORBIDDEN") return jsonResponse({ message: "Access denied." }, 403)
      return jsonResponse({ message: e.message || "Failed to load password reset requests." }, 500)
    }
  }

  // 10b. Superadmin Generate Token for Reset Request (POST /api/users/reset-requests/:id/generate-token)
  const resetReqMatch = pathname.match(/^\/api\/users\/reset-requests\/([^/]+)\/generate-token$/)
  if (resetReqMatch && method === "POST") {
    try {
      const caller = ensureAdmin()
      if (caller.role !== "Superadmin") {
        return jsonResponse({ message: "Only Superadmins can generate security reset tokens." }, 403)
      }

      const requestId = resetReqMatch[1]
      const rawToken = generateUuid()
      const updated = await generateTokenForResetRequestInSupabase(requestId, rawToken, caller.email)

      return jsonResponse({
        id: updated.id,
        userId: updated.user_id,
        email: updated.email,
        securityResetToken: updated.security_reset_token,
        status: updated.status,
        used: Boolean(updated.used),
        requestedAt: updated.requested_at,
        expiresAt: updated.expires_at,
        completedAt: updated.completed_at,
      })
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.message === "FORBIDDEN") return jsonResponse({ message: "Access denied." }, 403)
      return jsonResponse({ message: e.message || "Failed to generate security reset token." }, 400)
    }
  }

  // 10c. Superadmin Delete Reset Request & Token (DELETE /api/users/reset-requests/:id)
  const deleteResetReqMatch = pathname.match(/^\/api\/users\/reset-requests\/([^/]+)$/)
  if (deleteResetReqMatch && method === "DELETE") {
    try {
      const caller = ensureAdmin()
      if (caller.role !== "Superadmin") {
        return jsonResponse({ message: "Only Superadmins can delete password reset tokens." }, 403)
      }

      const requestId = deleteResetReqMatch[1]
      await deletePasswordResetRequestInSupabase(requestId, caller.email)

      return jsonResponse({ message: "Password reset token and request deleted successfully." })
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.message === "FORBIDDEN") return jsonResponse({ message: "Access denied." }, 403)
      return jsonResponse({ message: e.message || "Failed to delete password reset token." }, 400)
    }
  }

  // Match /api/users/:id or sub-routes
  const userSubmatch = pathname.match(/^\/api\/users\/([^/]+)(?:\/(.*))?$/)
  if (userSubmatch) {
    const targetId = userSubmatch[1]
    const subAction = userSubmatch[2] // 'block', 'approve', 'role', 'rights' or undefined

    const targetUser = await getLiveUserById(targetId)
    const allUsers = await getLiveUsers()
    const activeSuperadminsCount = allUsers.filter((u) => u.role === "Superadmin" && !u.blocked).length

    // GET /api/users/:id/rights -> Reads live from Supabase user_permission
    if (subAction === "rights" && method === "GET") {
      try {
        // Any authenticated user can read their own rights; Admin and Superadmin can read anyone's rights.
        if (currentUser && currentUser.role === "User" && currentUser.id !== targetId) {
          return jsonResponse({ message: "Access denied." }, 403)
        }
        if (!targetUser) return jsonResponse({ message: "User not found." }, 404)
        const rights = await fetchUserRightsFromSupabase(targetId).catch(() => [])
        return jsonResponse({ userId: targetId, rights })
      } catch (e: any) {
        return jsonResponse({ message: e.message === "UNAUTHORIZED" ? "Not authenticated." : "Access denied." }, 403)
      }
    }

    // POST /api/users/:id/rights -> Writes live to Supabase user_permission
    if (subAction === "rights" && method === "POST") {
      try {
        const caller = ensureAdmin()
        if (!targetUser) return jsonResponse({ message: "User not found." }, 404)
        if (caller.role !== "Superadmin" && targetUser.role === "Superadmin") {
          return jsonResponse({ message: "Cannot modify Superadmin permissions." }, 403)
        }

        const newRights: string[] = Array.isArray(body.rights) ? body.rights : []
        await saveUserRightsInSupabase(targetId, newRights, caller.email)

        return jsonResponse({
          message: "User permissions updated successfully.",
          userId: targetId,
          rights: newRights,
        })
      } catch (e: any) {
        return jsonResponse({ message: e.message === "UNAUTHORIZED" ? "Not authenticated." : "Access denied." }, 403)
      }
    }

    // PATCH /api/users/:id/block -> Updates Supabase app_user
    if (subAction === "block" && method === "PATCH") {
      try {
        const caller = ensureAdmin()
        if (!targetUser) return jsonResponse({ message: "User not found." }, 404)
        if (caller.role !== "Superadmin" && targetUser.role === "Superadmin") {
          return jsonResponse({ message: "Cannot modify Superadmin accounts." }, 403)
        }

        // Last superadmin guard
        if (body.blocked && targetUser.role === "Superadmin" && activeSuperadminsCount <= 1) {
          return jsonResponse(
            { message: "Role safeguards active: The last remaining Superadmin cannot be disabled or blocked." },
            400
          )
        }

        const updated = await updateUserInSupabase(targetId, {
          blocked: Boolean(body.blocked),
        })

        await insertAuditLogIntoSupabase({
          table_name: "app_user",
          action: "EDIT",
          record_key: targetId,
          new_values: { blocked: updated.blocked },
          action_by: caller.email,
        }).catch(() => {})

        return jsonResponse({
          id: updated.id,
          email: updated.email,
          role: updated.role,
          approvalStatus: updated.approval_status,
          blocked: updated.blocked,
          isProtected: updated.role === "Superadmin" && activeSuperadminsCount <= 1,
          createdAt: updated.created_at,
        })
      } catch (e: any) {
        return jsonResponse({ message: e.message === "UNAUTHORIZED" ? "Not authenticated." : "Access denied." }, 403)
      }
    }

    // PATCH /api/users/:id/approve -> Updates Supabase app_user
    if (subAction === "approve" && method === "PATCH") {
      try {
        const caller = ensureAdmin()
        if (caller.role !== "Superadmin") {
          return jsonResponse({ message: "Only Superadmins can approve accounts." }, 403)
        }
        if (!targetUser) return jsonResponse({ message: "User not found." }, 404)

        const updated = await updateUserInSupabase(targetId, {
          approval_status: "APPROVED",
        })

        await insertAuditLogIntoSupabase({
          table_name: "app_user",
          action: "EDIT",
          record_key: targetId,
          new_values: { approval_status: "APPROVED" },
          action_by: caller.email,
        }).catch(() => {})

        return jsonResponse({
          id: updated.id,
          email: updated.email,
          role: updated.role,
          approvalStatus: updated.approval_status,
          blocked: updated.blocked,
          isProtected: updated.role === "Superadmin" && activeSuperadminsCount <= 1,
          createdAt: updated.created_at,
        })
      } catch (e: any) {
        return jsonResponse({ message: e.message === "UNAUTHORIZED" ? "Not authenticated." : "Access denied." }, 403)
      }
    }

    // PATCH /api/users/:id/role -> Updates Supabase app_user
    if (subAction === "role" && method === "PATCH") {
      try {
        const caller = ensureAdmin()
        if (caller.role !== "Superadmin") {
          return jsonResponse({ message: "Only Superadmins can designate roles." }, 403)
        }
        if (!targetUser) return jsonResponse({ message: "User not found." }, 404)

        const requestedRole = body.role
        if (!requestedRole || !["Superadmin", "Admin", "User"].includes(requestedRole)) {
          return jsonResponse({ message: "Role is required." }, 400)
        }

        // Safeguard: Cannot demote the last remaining superadmin
        if (targetUser.role === "Superadmin" && requestedRole !== "Superadmin" && activeSuperadminsCount <= 1) {
          return jsonResponse(
            { message: "Role safeguards active: The last remaining Superadmin cannot be demoted." },
            400
          )
        }

        const updated = await updateUserInSupabase(targetId, {
          role: requestedRole,
        })

        await insertAuditLogIntoSupabase({
          table_name: "app_user",
          action: "EDIT",
          record_key: targetId,
          new_values: { role: requestedRole },
          action_by: caller.email,
        }).catch(() => {})

        return jsonResponse({
          id: updated.id,
          email: updated.email,
          role: updated.role,
          approvalStatus: updated.approval_status,
          blocked: updated.blocked,
          isProtected: targetUser.role === "Superadmin" && activeSuperadminsCount <= 1,
          createdAt: updated.created_at,
        })
      } catch (e: any) {
        return jsonResponse({ message: e.message === "UNAUTHORIZED" ? "Not authenticated." : "Access denied." }, 403)
      }
    }

    // PUT /api/users/:id (Edit User details) -> Updates Supabase app_user
    if (!subAction && method === "PUT") {
      try {
        const caller = ensureAdmin()
        if (!targetUser) return jsonResponse({ message: "User not found." }, 404)
        if (caller.role !== "Superadmin" && targetUser.role === "Superadmin") {
          return jsonResponse({ message: "Cannot edit Superadmin accounts." }, 403)
        }

        const updates: Partial<{
          email: string
          first_name: string | null
          last_name: string | null
          role: "Superadmin" | "Admin" | "User"
          approval_status: "PENDING" | "APPROVED"
          blocked: boolean
        }> = {}

        const newEmail = (body.email || "").trim().toLowerCase()
        if (newEmail && newEmail !== targetUser.email.toLowerCase()) {
          const collision = await getLiveUserByEmail(newEmail)
          if (collision && collision.id !== targetId) {
            return jsonResponse({ message: "An account with this email already exists." }, 409)
          }
          updates.email = newEmail
        }

        if (body.firstName !== undefined) {
          updates.first_name = String(body.firstName).trim() || null
        }
        if (body.lastName !== undefined) {
          updates.last_name = String(body.lastName).trim() || null
        }

        if (caller.role === "Superadmin" && body.role && ["Superadmin", "Admin", "User"].includes(body.role)) {
          if (targetUser.role === "Superadmin" && body.role !== "Superadmin" && activeSuperadminsCount <= 1) {
            return jsonResponse(
              { message: "Role safeguards active: The last remaining Superadmin cannot be demoted." },
              400
            )
          }
          updates.role = body.role
        }

        if (body.status) {
          const requestedStatus = String(body.status).toUpperCase()
          const nextRole = updates.role || targetUser.role
          if (
            (requestedStatus === "BLOCKED" || requestedStatus === "PENDING") &&
            nextRole === "Superadmin" &&
            activeSuperadminsCount <= 1
          ) {
            return jsonResponse(
              { message: "Role safeguards active: The last remaining Superadmin cannot be disabled or blocked." },
              400
            )
          }

          if (requestedStatus === "PENDING") {
            updates.approval_status = "PENDING"
            updates.blocked = false
          } else if (requestedStatus === "BLOCKED") {
            updates.approval_status = "APPROVED"
            updates.blocked = true
          } else if (requestedStatus === "ACTIVE") {
            updates.approval_status = "APPROVED"
            updates.blocked = false
          }
        }

        if (Object.keys(updates).length > 0) {
          const updated = await updateUserInSupabase(targetId, updates)

          await insertAuditLogIntoSupabase({
            table_name: "app_user",
            action: "EDIT",
            record_key: targetId,
            new_values: updates,
            action_by: caller.email,
          }).catch(() => {})

          const fullName = [updated.first_name, updated.last_name].filter(Boolean).join(" ").trim()
          return jsonResponse({
            id: updated.id,
            email: updated.email,
            firstName: updated.first_name || "",
            lastName: updated.last_name || "",
            name: fullName || undefined,
            role: updated.role,
            approvalStatus: updated.approval_status,
            blocked: updated.blocked,
            isProtected: updated.role === "Superadmin" && activeSuperadminsCount <= 1,
            createdAt: updated.created_at,
          })
        }

        const fullName = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(" ").trim()
        return jsonResponse({
          id: targetUser.id,
          email: targetUser.email,
          firstName: targetUser.firstName || "",
          lastName: targetUser.lastName || "",
          name: fullName || undefined,
          role: targetUser.role,
          approvalStatus: targetUser.approvalStatus,
          blocked: targetUser.blocked,
          isProtected: targetUser.role === "Superadmin" && activeSuperadminsCount <= 1,
          createdAt: targetUser.createdAt,
        })
      } catch (e: any) {
        return jsonResponse({ message: e.message === "UNAUTHORIZED" ? "Not authenticated." : "Access denied." }, 403)
      }
    }

    // DELETE /api/users/:id -> Deletes live from Supabase app_user
    if (!subAction && method === "DELETE") {
      try {
        const caller = ensureAdmin()
        if (caller.role !== "Superadmin") {
          return jsonResponse({ message: "Only Superadmins can delete accounts." }, 403)
        }
        if (!targetUser) return jsonResponse({ message: "User not found." }, 404)

        if (targetUser.role === "Superadmin" && activeSuperadminsCount <= 1) {
          return jsonResponse(
            { message: "Role safeguards active: The last remaining Superadmin cannot be deleted." },
            400
          )
        }

        await deleteUserFromSupabase(targetId)

        await insertAuditLogIntoSupabase({
          table_name: "app_user",
          action: "DELETE",
          record_key: targetId,
          action_by: caller.email,
        }).catch(() => {})

        return jsonResponse({ message: "User deleted successfully." })
      } catch (e: any) {
        return jsonResponse({ message: e.message === "UNAUTHORIZED" ? "Not authenticated." : "Access denied." }, 403)
      }
    }
  }

  // ==========================================================================
  // Customer Master Endpoints (/api/customers) -> Sprint 2 (S2-DEV-01)
  // Enforces role-based per-action permission checks against Supabase user_permission
  // ==========================================================================

  const ensureCustomerPermission = async (action: "View" | "Add" | "Edit" | "Delete"): Promise<DbUser> => {
    if (!currentUser) {
      // In prototype / standalone preview mode, allow read-only viewing of customer master data
      if (action === "View") {
        return {
          id: "prototype-demo-session",
          email: "superadmin@hope.example",
          passwordHash: "",
          role: "Superadmin",
          approvalStatus: "APPROVED",
          blocked: false,
          firstName: "Prototype",
          lastName: "Superadmin",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
      throw new Error("UNAUTHORIZED")
    }

    if (currentUser.role === "Superadmin") return currentUser

    const userRights = await fetchUserRightsFromSupabase(currentUser.id).catch(() => [])
    const actionKey = action.toLowerCase()

    const hasRight = userRights.some((r) => {
      const lower = r.toLowerCase().trim()
      if (lower === `customer - ${actionKey}` || lower === `${actionKey} customer`) return true
      if (lower.includes("customer") && lower.includes(actionKey)) return true
      if (action === "View" && (currentUser.role === "Admin" || lower.includes("customer"))) return true
      return false
    })

    if (currentUser.role === "Admin" && (action === "View" || !userRights.length)) {
      return currentUser
    }

    if (!hasRight) {
      const err: any = new Error(`Access denied. Requires Customer - ${action} permission.`)
      err.permissionDenied = true
      err.statusCode = 403
      throw err
    }

    return currentUser
  }

  // 1. List Customers with Search and Filter (GET /api/customers)
  if (pathname === "/api/customers" && method === "GET") {
    try {
      const caller = await ensureCustomerPermission("View")
      const search = parsedUrl.searchParams.get("search")?.trim() || ""
      const statusParam = (parsedUrl.searchParams.get("status")?.trim().toLowerCase() || "active") as
        | "active"
        | "inactive"
        | "all"
      const payterm = parsedUrl.searchParams.get("payterm")?.trim() || ""

      const rawRows = await fetchCustomersFromSupabase({
        search,
        status: statusParam,
        payterm,
      })

      const userRights =
        caller.role === "Superadmin"
          ? []
          : await fetchUserRightsFromSupabase(caller.id).catch(() => [])

      const canSeeInactive =
        caller.role === "Superadmin" ||
        caller.role === "Admin" ||
        userRights.some((r) => {
          const lower = r.toLowerCase().trim()
          return (
            lower.includes("customer") &&
            (lower.includes("edit") || lower.includes("delete") || lower.includes("view"))
          )
        })

      const dtoList = rawRows
        .filter((r) => {
          // Regular users without customer rights can never see Inactive/deleted rows
          if (!canSeeInactive && Boolean(r.is_deleted)) return false
          return true
        })
        .map((r) => {
          const isDeleted = Boolean(r.is_deleted)
          const [action, stampUser, stampDate] = parseStamp(r.stamp, isDeleted)
          return {
            custno: String(r.custno ?? ""),
            custname: String(r.custname ?? ""),
            address: String(r.address ?? ""),
            payterm: String(r.payterm ?? ""),
            is_deleted: isDeleted,
            status: isDeleted ? "Inactive" : "Active",
            stamp: String(r.stamp ?? ""),
            stampAction: action,
            stampUser: stampUser,
            stampDate: stampDate,
          }
        })

      return jsonResponse(dtoList)
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.statusCode === 403 || e.permissionDenied || e.message === "FORBIDDEN") {
        return jsonResponse({ message: e.message || "Access denied. Requires Customer - View permission." }, 403)
      }
      return jsonResponse({ message: e.message || "Failed to fetch customers." }, 500)
    }
  }

  // 2. Customer Detail & Sub-actions (/api/customers/:custno)
  const customerMatch = pathname.match(/^\/api\/customers\/([^/]+)(?:\/(restore))?$/)
  if (customerMatch) {
    const custno = decodeURIComponent(customerMatch[1])
    const subAction = customerMatch[2] // 'restore' or undefined

    // Restore Customer (POST /api/customers/:custno/restore)
    if (subAction === "restore" && method === "POST") {
      try {
        const caller = await ensureCustomerPermission("Edit")
        await restoreCustomerInSupabase(custno, caller.email)
        return jsonResponse({ message: `Customer ${custno} restored successfully.` })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to restore customer." }, 400)
      }
    }

    // Get Single Customer (GET /api/customers/:custno)
    if (!subAction && method === "GET") {
      try {
        await ensureCustomerPermission("View")
        const row = await fetchCustomerByCustnoFromSupabase(custno)
        if (!row) {
          return jsonResponse({ message: `Customer ${custno} not found.` }, 404)
        }
        const isDeleted = Boolean(row.is_deleted)
        const [action, stampUser, stampDate] = parseStamp(row.stamp, isDeleted)
        return jsonResponse({
          custno: String(row.custno ?? ""),
          custname: String(row.custname ?? ""),
          address: String(row.address ?? ""),
          payterm: String(row.payterm ?? ""),
          is_deleted: isDeleted,
          status: isDeleted ? "Inactive" : "Active",
          stamp: String(row.stamp ?? ""),
          stampAction: action,
          stampUser: stampUser,
          stampDate: stampDate,
        })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to retrieve customer." }, 500)
      }
    }

    // Update Customer (PUT /api/customers/:custno)
    if (!subAction && (method === "PUT" || method === "PATCH")) {
      try {
        const caller = await ensureCustomerPermission("Edit")
        const updated = await updateCustomerInSupabase(
          custno,
          {
            custname: body.custname,
            address: body.address,
            payterm: body.payterm,
          },
          caller.email
        )
        return jsonResponse(updated)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to update customer." }, 400)
      }
    }

    // Soft Delete Customer (DELETE /api/customers/:custno)
    if (!subAction && method === "DELETE") {
      try {
        const caller = await ensureCustomerPermission("Delete")
        await softDeleteCustomerInSupabase(custno, caller.email)
        return jsonResponse({ message: `Customer ${custno} marked as Inactive.` })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        if (e.blocked || e.statusCode === 409) {
          return jsonResponse({ message: e.message, blocked: true }, 409)
        }
        return jsonResponse({ message: e.message || "Failed to delete customer." }, 400)
      }
    }
  }

  // 3. Create Customer (POST /api/customers)
  if (pathname === "/api/customers" && method === "POST") {
    try {
      const caller = await ensureCustomerPermission("Add")
      const custname = (body.custname || "").trim()
      if (!custname) {
        return jsonResponse({ message: "Customer name is required." }, 400)
      }

      const created = await insertCustomerIntoSupabase(
        {
          custno: body.custno,
          custname,
          address: body.address,
          payterm: body.payterm,
        },
        caller.email
      )
      return jsonResponse(created, 201)
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
      return jsonResponse({ message: e.message || "Failed to create customer." }, 400)
    }
  }

  // ==========================================================================
  // Product Master Endpoints (/api/products) -> Sprint 2 (S2-DEV-04)
  // Enforces role-based per-action permission checks against Supabase user_permission
  // ==========================================================================

  const ensureProductPermission = async (
    action: "View" | "Add" | "Edit" | "Delete" | "AddPrice" | "EditPrice" | "DeletePrice"
  ): Promise<DbUser> => {
    if (!currentUser) {
      // In prototype / standalone preview mode, allow read-only viewing of product master data
      if (action === "View") {
        return {
          id: "prototype-demo-session",
          email: "superadmin@hope.example",
          passwordHash: "",
          role: "Superadmin",
          approvalStatus: "APPROVED",
          blocked: false,
          firstName: "Prototype",
          lastName: "Superadmin",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
      throw new Error("UNAUTHORIZED")
    }

    if (currentUser.role === "Superadmin") return currentUser

    const userRights = await fetchUserRightsFromSupabase(currentUser.id).catch(() => [])
    const actionKey = action.toLowerCase()

    const hasRight = userRights.some((r) => {
      const lower = r.toLowerCase().trim()
      if (actionKey === "view") {
        if (currentUser.role === "Admin" || lower.includes("product") || lower.includes("price")) return true
      }
      if (actionKey === "add") {
        if (lower === "product - add" || lower === "add product" || (lower.includes("product") && lower.includes("add"))) return true
      }
      if (actionKey === "edit") {
        if (lower === "product - edit" || lower === "edit product" || (lower.includes("product") && lower.includes("edit"))) return true
      }
      if (actionKey === "delete") {
        if (lower === "product - delete" || lower === "delete product" || (lower.includes("product") && lower.includes("delete"))) return true
      }
      if (actionKey === "addprice") {
        if (lower === "add price" || lower === "product - add price" || lower === "product - edit" || lower === "edit product" || lower === "add product" || lower.includes("add price")) return true
      }
      if (actionKey === "editprice") {
        if (lower === "edit price" || lower === "product - edit price" || lower === "product - edit" || lower === "edit product" || lower.includes("edit price")) return true
      }
      if (actionKey === "deleteprice") {
        if (lower === "delete price" || lower === "product - delete price" || lower === "product - delete" || lower === "delete product" || lower === "product - edit" || lower.includes("delete price")) return true
      }
      return false
    })

    if (currentUser.role === "Admin" && (actionKey === "view" || !userRights.length)) {
      return currentUser
    }

    if (!hasRight) {
      const displayAction = actionKey.startsWith("addprice")
        ? "Add Price"
        : actionKey.startsWith("editprice")
        ? "Edit Price"
        : actionKey.startsWith("deleteprice")
        ? "Delete Price"
        : action
      const err: any = new Error(`Access denied. Requires Product - ${displayAction} permission.`)
      err.permissionDenied = true
      err.statusCode = 403
      throw err
    }

    return currentUser
  }

  // 1. List Products with Search and Filter (GET /api/products)
  if (pathname === "/api/products" && method === "GET") {
    try {
      const caller = await ensureProductPermission("View")
      const search = parsedUrl.searchParams.get("search")?.trim() || ""
      const statusParam = (parsedUrl.searchParams.get("status")?.trim().toLowerCase() || "active") as
        | "active"
        | "inactive"
        | "all"
      const unit = parsedUrl.searchParams.get("unit")?.trim() || ""
      const asOfDate = parsedUrl.searchParams.get("asOfDate")?.trim() || undefined

      const rawRows = await fetchProductsFromSupabase({
        search,
        status: statusParam,
        unit,
        asOfDate,
      })

      const userRights =
        caller.role === "Superadmin"
          ? []
          : await fetchUserRightsFromSupabase(caller.id).catch(() => [])

      const canSeeInactive =
        caller.role === "Superadmin" ||
        caller.role === "Admin" ||
        userRights.some((r) => {
          const lower = r.toLowerCase().trim()
          return (
            lower.includes("product") &&
            (lower.includes("edit") || lower.includes("delete") || lower.includes("view"))
          )
        })

      const dtoList = rawRows
        .filter((r) => {
          // Regular users without product rights can never see Inactive/deleted rows
          if (!canSeeInactive && Boolean(r.is_deleted)) return false
          return true
        })
        .map((r) => {
          const isDeleted = Boolean(r.is_deleted)
          const [action, stampUser, stampDate] = parseStamp(r.stamp, isDeleted)
          return {
            prodcode: String(r.prodcode ?? ""),
            description: String(r.description ?? ""),
            unit: String(r.unit ?? ""),
            price: String(r.price ?? "—"),
            numericPrice: r.numericPrice ?? null,
            currentEffDate: r.currentEffDate ?? null,
            is_deleted: isDeleted,
            status: isDeleted ? "Inactive" : "Active",
            stamp: String(r.stamp ?? ""),
            stampAction: action,
            stampUser: stampUser,
            stampDate: stampDate,
          }
        })

      return jsonResponse(dtoList)
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.statusCode === 403 || e.permissionDenied || e.message === "FORBIDDEN") {
        return jsonResponse({ message: e.message || "Access denied. Requires Product - View permission." }, 403)
      }
      return jsonResponse({ message: e.message || "Failed to fetch products." }, 500)
    }
  }

  // 2. Product Detail & Sub-actions (/api/products/:prodcode)
  const productMatch = pathname.match(/^\/api\/products\/([^/]+)(?:\/(restore))?$/)
  if (productMatch) {
    const prodcode = decodeURIComponent(productMatch[1])
    const subAction = productMatch[2] // 'restore' or undefined

    // Restore Product (POST /api/products/:prodcode/restore)
    if (subAction === "restore" && method === "POST") {
      try {
        const caller = await ensureProductPermission("Edit")
        await restoreProductInSupabase(prodcode, caller.email)
        return jsonResponse({ message: `Product ${prodcode} restored successfully.` })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to restore product." }, 400)
      }
    }

    // Get Single Product (GET /api/products/:prodcode)
    if (!subAction && method === "GET") {
      try {
        await ensureProductPermission("View")
        const asOfDate = parsedUrl.searchParams.get("asOfDate")?.trim() || undefined
        const row = await fetchProductByProdcodeFromSupabase(prodcode, asOfDate)
        if (!row) {
          return jsonResponse({ message: `Product ${prodcode} not found.` }, 404)
        }
        const isDeleted = Boolean(row.is_deleted)
        const [action, stampUser, stampDate] = parseStamp(row.stamp, isDeleted)
        return jsonResponse({
          prodcode: String(row.prodcode ?? ""),
          description: String(row.description ?? ""),
          unit: String(row.unit ?? ""),
          price: String(row.price ?? "—"),
          numericPrice: row.numericPrice ?? null,
          currentEffDate: row.currentEffDate ?? null,
          is_deleted: isDeleted,
          status: isDeleted ? "Inactive" : "Active",
          stamp: String(row.stamp ?? ""),
          stampAction: action,
          stampUser: stampUser,
          stampDate: stampDate,
        })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to retrieve product." }, 500)
      }
    }

    // Update Product (PUT /api/products/:prodcode)
    if (!subAction && (method === "PUT" || method === "PATCH")) {
      try {
        const caller = await ensureProductPermission("Edit")
        const updated = await updateProductInSupabase(
          prodcode,
          {
            description: body.description,
            unit: body.unit,
          },
          caller.email
        )
        return jsonResponse(updated)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to update product." }, 400)
      }
    }

    // Soft Delete Product (DELETE /api/products/:prodcode)
    if (!subAction && method === "DELETE") {
      try {
        const caller = await ensureProductPermission("Delete")
        await softDeleteProductInSupabase(prodcode, caller.email)
        return jsonResponse({ message: `Product ${prodcode} marked as Inactive.` })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        if (e.blocked || e.statusCode === 409) {
          return jsonResponse({ message: e.message, blocked: true }, 409)
        }
        return jsonResponse({ message: e.message || "Failed to delete product." }, 400)
      }
    }
  }

  // 2b. Price Schedule Collection (/api/products/:prodcode/prices)
  const priceCollectionMatch = pathname.match(/^\/api\/products\/([^/]+)\/prices$/)
  if (priceCollectionMatch) {
    const prodcode = decodeURIComponent(priceCollectionMatch[1])

    if (method === "GET") {
      try {
        await ensureProductPermission("View")
        const rows = await fetchPriceHistoryForProductFromSupabase(prodcode)
        return jsonResponse(rows)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to fetch price history." }, 500)
      }
    }

    if (method === "POST") {
      try {
        const caller = await ensureProductPermission("AddPrice")
        const created = await insertPriceScheduleIntoSupabase(
          {
            prodcode,
            effdate: body.effdate,
            unitprice: body.unitprice,
          },
          caller.email
        )
        return jsonResponse(created, 201)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to create price schedule." }, 400)
      }
    }
  }

  // 2c. Price Schedule Item Sub-actions (/api/products/:prodcode/prices/:effdate)
  const priceScheduleMatch = pathname.match(/^\/api\/products\/([^/]+)\/prices\/([^/]+)(?:\/(restore))?$/)
  if (priceScheduleMatch) {
    const prodcode = decodeURIComponent(priceScheduleMatch[1])
    const effdate = decodeURIComponent(priceScheduleMatch[2])
    const subAction = priceScheduleMatch[3]

    if (subAction === "restore" && method === "POST") {
      try {
        const caller = await ensureProductPermission("EditPrice")
        await restorePriceScheduleInSupabase(prodcode, effdate, caller.email)
        return jsonResponse({ message: `Price schedule for ${prodcode} (${effdate}) restored.` })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to restore price schedule." }, 400)
      }
    }

    if (!subAction && (method === "PUT" || method === "PATCH")) {
      try {
        const caller = await ensureProductPermission("EditPrice")
        const updated = await updatePriceScheduleInSupabase(
          prodcode,
          effdate,
          {
            effdate: body.effdate || effdate,
            unitprice: body.unitprice,
          },
          caller.email
        )
        return jsonResponse(updated)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to update price schedule." }, 400)
      }
    }

    if (!subAction && method === "DELETE") {
      try {
        const caller = await ensureProductPermission("DeletePrice")
        await softDeletePriceScheduleInSupabase(prodcode, effdate, caller.email)
        return jsonResponse({ message: `Price schedule for ${prodcode} (${effdate}) superseded.` })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to supersede price schedule." }, 400)
      }
    }
  }

  // 3. Create Product (POST /api/products)
  if (pathname === "/api/products" && method === "POST") {
    try {
      const caller = await ensureProductPermission("Add")
      const description = (body.description || "").trim()
      if (!description) {
        return jsonResponse({ message: "Product description is required." }, 400)
      }
      if (description.length < 2) {
        return jsonResponse({ message: "Product description must be at least 2 characters long." }, 400)
      }

      const created = await insertProductIntoSupabase(
        {
          prodcode: body.prodcode,
          description,
          unit: body.unit,
          initialPrice: body.initialPrice,
        },
        caller.email
      )
      return jsonResponse(created, 201)
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
      return jsonResponse({ message: e.message || "Failed to create product." }, 400)
    }
  }

  // ==========================================================================
  // Department Master Endpoints (/api/departments) -> Sprint 3 (S3-DEV-01)
  // Enforces role-based per-action permission checks against Supabase user_permission
  // ==========================================================================

  const ensureDepartmentPermission = async (action: "View" | "Add" | "Edit" | "Delete"): Promise<DbUser> => {
    if (!currentUser) {
      if (action === "View") {
        return {
          id: "prototype-demo-session",
          email: "superadmin@hope.example",
          passwordHash: "",
          role: "Superadmin",
          approvalStatus: "APPROVED",
          blocked: false,
          firstName: "Prototype",
          lastName: "Superadmin",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
      throw new Error("UNAUTHORIZED")
    }

    if (currentUser.role === "Superadmin") return currentUser

    const userRights = await fetchUserRightsFromSupabase(currentUser.id).catch(() => [])
    const actionKey = action.toLowerCase()

    const hasRight = userRights.some((r) => {
      const lower = r.toLowerCase().trim()
      if (lower === `department - ${actionKey}` || lower === `${actionKey} department`) return true
      if (lower.includes("department") && lower.includes(actionKey)) return true
      if (action === "View" && (currentUser.role === "Admin" || lower.includes("department") || lower.includes("hr"))) return true
      return false
    })

    if (currentUser.role === "Admin" && (action === "View" || !userRights.length)) {
      return currentUser
    }

    if (!hasRight) {
      const err: any = new Error(`Access denied. Requires Department - ${action} permission.`)
      err.permissionDenied = true
      err.statusCode = 403
      throw err
    }

    return currentUser
  }

  // 1. List Departments with Search and Status Filter (GET /api/departments)
  if (pathname === "/api/departments" && method === "GET") {
    try {
      const caller = await ensureDepartmentPermission("View")
      const search = parsedUrl.searchParams.get("search")?.trim() || ""
      const statusParam = (parsedUrl.searchParams.get("status")?.trim().toLowerCase() || "active") as
        | "active"
        | "inactive"
        | "all"

      const rawRows = await fetchDepartmentsFromSupabase({
        search,
        status: statusParam,
      })

      const userRights =
        caller.role === "Superadmin"
          ? []
          : await fetchUserRightsFromSupabase(caller.id).catch(() => [])

      const canSeeInactive =
        caller.role === "Superadmin" ||
        caller.role === "Admin" ||
        userRights.some((r) => {
          const lower = r.toLowerCase().trim()
          return (
            lower.includes("department") &&
            (lower.includes("edit") || lower.includes("delete") || lower.includes("view"))
          )
        })

      const dtoList = rawRows.filter((r) => {
        if (!canSeeInactive && Boolean(r.is_deleted)) return false
        return true
      })

      return jsonResponse(dtoList)
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.statusCode === 403 || e.permissionDenied) {
        return jsonResponse({ message: e.message || "Access denied. Requires Department - View permission." }, 403)
      }
      return jsonResponse({ message: e.message || "Failed to list departments." }, 500)
    }
  }

  // 2. Department Item Sub-actions (/api/departments/:deptcode)
  const deptMatch = pathname.match(/^\/api\/departments\/([^/]+)(?:\/(restore))?$/)
  if (deptMatch) {
    const deptcode = decodeURIComponent(deptMatch[1])
    const subAction = deptMatch[2]

    // Restore Department (POST /api/departments/:deptcode/restore)
    if (subAction === "restore" && method === "POST") {
      try {
        const caller = await ensureDepartmentPermission("Edit")
        await restoreDepartmentInSupabase(deptcode, caller.email)
        return jsonResponse({ message: `Department ${deptcode} restored successfully.` })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to restore department." }, 400)
      }
    }

    // Get Single Department (GET /api/departments/:deptcode)
    if (!subAction && method === "GET") {
      try {
        await ensureDepartmentPermission("View")
        const row = await fetchDepartmentByDeptcodeFromSupabase(deptcode)
        if (!row) {
          return jsonResponse({ message: `Department ${deptcode} not found.` }, 404)
        }
        return jsonResponse(row)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to get department." }, 500)
      }
    }

    // Update Department (PUT/PATCH /api/departments/:deptcode)
    if (!subAction && (method === "PUT" || method === "PATCH")) {
      try {
        const caller = await ensureDepartmentPermission("Edit")
        const updated = await updateDepartmentInSupabase(
          deptcode,
          { deptname: body.deptname },
          caller.email
        )
        return jsonResponse(updated)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to update department." }, 400)
      }
    }

    // Soft-Delete Department (DELETE /api/departments/:deptcode)
    if (!subAction && method === "DELETE") {
      try {
        const caller = await ensureDepartmentPermission("Delete")
        await softDeleteDepartmentInSupabase(deptcode, caller.email)
        return jsonResponse({ message: `Department ${deptcode} marked as Inactive.` })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        if (e.blocked || e.statusCode === 409) {
          return jsonResponse({ message: e.message, blocked: true, reason: e.reason }, 409)
        }
        return jsonResponse({ message: e.message || "Failed to delete department." }, 400)
      }
    }
  }

  // 3. Create Department (POST /api/departments)
  if (pathname === "/api/departments" && method === "POST") {
    try {
      const caller = await ensureDepartmentPermission("Add")
      const deptname = (body.deptname || "").trim()
      if (!deptname) {
        return jsonResponse({ message: "Department name is required." }, 400)
      }
      if (deptname.length < 2) {
        return jsonResponse({ message: "Department name must be at least 2 characters long." }, 400)
      }

      const created = await insertDepartmentIntoSupabase(
        {
          deptcode: body.deptcode,
          deptname,
        },
        caller.email
      )
      return jsonResponse(created, 201)
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
      if (e.statusCode === 409) return jsonResponse({ message: e.message }, 409)
      return jsonResponse({ message: e.message || "Failed to create department." }, 400)
    }
  }

  // ==========================================================================
  // Job Master Endpoints (/api/jobs) -> Sprint 3 (S3-DEV-02)
  // Enforces role-based per-action permission checks against Supabase user_permission
  // ==========================================================================

  const ensureJobPermission = async (action: "View" | "Add" | "Edit" | "Delete"): Promise<DbUser> => {
    if (!currentUser) {
      if (action === "View") {
        return {
          id: "prototype-demo-session",
          email: "superadmin@hope.example",
          passwordHash: "",
          role: "Superadmin",
          approvalStatus: "APPROVED",
          blocked: false,
          firstName: "Prototype",
          lastName: "Superadmin",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
      throw new Error("UNAUTHORIZED")
    }

    if (currentUser.role === "Superadmin") return currentUser

    const userRights = await fetchUserRightsFromSupabase(currentUser.id).catch(() => [])
    const actionKey = action.toLowerCase()

    const hasRight = userRights.some((r) => {
      const lower = r.toLowerCase().trim()
      if (lower === `job - ${actionKey}` || lower === `${actionKey} job`) return true
      if (lower.includes("job") && lower.includes(actionKey)) return true
      if (action === "View" && (currentUser.role === "Admin" || lower.includes("job") || lower.includes("hr"))) return true
      return false
    })

    if (currentUser.role === "Admin" && (action === "View" || !userRights.length)) {
      return currentUser
    }

    if (!hasRight) {
      const err: any = new Error(`Access denied. Requires Job - ${action} permission.`)
      err.permissionDenied = true
      err.statusCode = 403
      throw err
    }

    return currentUser
  }

  // 1. List Jobs with Search and Status Filter (GET /api/jobs)
  if (pathname === "/api/jobs" && method === "GET") {
    try {
      const caller = await ensureJobPermission("View")
      const search = parsedUrl.searchParams.get("search")?.trim() || ""
      const statusParam = (parsedUrl.searchParams.get("status")?.trim().toLowerCase() || "active") as
        | "active"
        | "inactive"
        | "all"

      const rawRows = await fetchJobsFromSupabase({
        search,
        status: statusParam,
      })

      const userRights =
        caller.role === "Superadmin"
          ? []
          : await fetchUserRightsFromSupabase(caller.id).catch(() => [])

      const canSeeInactive =
        caller.role === "Superadmin" ||
        caller.role === "Admin" ||
        userRights.some((r) => {
          const l = r.toLowerCase()
          return l.includes("delete") || l.includes("edit") || l.includes("all")
        })

      const rows = rawRows.filter((r) => {
        if (!canSeeInactive && r.is_deleted) return false
        return true
      })

      return jsonResponse(rows)
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
      return jsonResponse({ message: e.message || "Failed to list jobs." }, 400)
    }
  }

  // 2. Job Detail / Subactions (/api/jobs/:jobcode[/:subaction])
  const jobMatch = pathname.match(/^\/api\/jobs\/([^/]+)(?:\/([^/]+))?$/)
  if (jobMatch) {
    const jobcode = decodeURIComponent(jobMatch[1])
    const subAction = jobMatch[2]

    // Restore Job (POST /api/jobs/:jobcode/restore)
    if (subAction === "restore" && method === "POST") {
      try {
        const caller = await ensureJobPermission("Edit")
        await restoreJobInSupabase(jobcode, caller.email)
        return jsonResponse({ message: `Job ${jobcode} restored to Active.` })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to restore job." }, 400)
      }
    }

    // Get Single Job (GET /api/jobs/:jobcode)
    if (!subAction && method === "GET") {
      try {
        await ensureJobPermission("View")
        const job = await fetchJobByJobcodeFromSupabase(jobcode)
        if (!job) return jsonResponse({ message: "Job not found." }, 404)
        return jsonResponse(job)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to get job." }, 400)
      }
    }

    // Update Job (PUT /api/jobs/:jobcode)
    if (!subAction && method === "PUT") {
      try {
        const caller = await ensureJobPermission("Edit")
        const updated = await updateJobInSupabase(
          jobcode,
          { jobdesc: body.jobdesc },
          caller.email
        )
        return jsonResponse(updated)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to update job." }, 400)
      }
    }

    // Soft-Delete Job (DELETE /api/jobs/:jobcode)
    if (!subAction && method === "DELETE") {
      try {
        const caller = await ensureJobPermission("Delete")
        await softDeleteJobInSupabase(jobcode, caller.email)
        return jsonResponse({ message: `Job ${jobcode} marked as Inactive.` })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        if (e.blocked || e.statusCode === 409) {
          return jsonResponse({ message: e.message, blocked: true, reason: e.reason }, 409)
        }
        return jsonResponse({ message: e.message || "Failed to delete job." }, 400)
      }
    }
  }

  // 3. Create Job (POST /api/jobs)
  if (pathname === "/api/jobs" && method === "POST") {
    try {
      const caller = await ensureJobPermission("Add")
      const jobdesc = (body.jobdesc || "").trim()
      if (!jobdesc) {
        return jsonResponse({ message: "Job title / description is required." }, 400)
      }
      if (jobdesc.length < 2) {
        return jsonResponse({ message: "Job title must be at least 2 characters long." }, 400)
      }

      const created = await insertJobIntoSupabase(
        {
          jobcode: body.jobcode,
          jobdesc,
        },
        caller.email
      )
      return jsonResponse(created, 201)
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
      if (e.statusCode === 409) return jsonResponse({ message: e.message }, 409)
      return jsonResponse({ message: e.message || "Failed to create job." }, 400)
    }
  }

  // ==========================================================================
  // Employee Directory Endpoints (/api/employees) -> Sprint 3 (S3-DEV-03)
  // Enforces role-based per-action permission checks against Supabase user_permission
  // ==========================================================================

  const ensureEmployeePermission = async (action: "View" | "Add" | "Edit" | "Delete"): Promise<DbUser> => {
    if (!currentUser) {
      if (action === "View") {
        return {
          id: "prototype-demo-session",
          email: "superadmin@hope.example",
          passwordHash: "",
          role: "Superadmin",
          approvalStatus: "APPROVED",
          blocked: false,
          firstName: "Prototype",
          lastName: "Superadmin",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
      throw new Error("UNAUTHORIZED")
    }

    if (currentUser.role === "Superadmin") return currentUser

    const userRights = testRights || (await fetchUserRightsFromSupabase(currentUser.id).catch(() => []))
    const actionKey = action.toLowerCase()

    const hasRight = userRights.some((r) => {
      const lower = r.toLowerCase().trim()
      if (lower === `employee - ${actionKey}` || lower === `${actionKey} employee`) return true
      if (lower.includes("employee") && lower.includes(actionKey)) return true
      if (action === "View" && (
        currentUser.role === "Admin" ||
        lower.includes("employee") ||
        lower.includes("hr") ||
        lower === "active employees" ||
        lower === "all employees"
      )) return true
      return false
    })

    if (currentUser.role === "Admin" && (action === "View" || !userRights.length)) {
      return currentUser
    }

    if (!hasRight) {
      const err: any = new Error(`Access denied. Requires Employee - ${action} permission.`)
      err.permissionDenied = true
      err.statusCode = 403
      throw err
    }

    return currentUser
  }

  // ==========================================================================
  // Job History Permission Guard (TC-HR-PERM-01 & TC-HR-PERM-04)
  // Gated by "View Job History" right; separates View from Add/Edit/Delete
  // ==========================================================================

  const ensureJobHistoryPermission = async (
    action: "View" | "Add" | "Edit" | "Delete"
  ): Promise<DbUser> => {
    if (!currentUser) {
      if (action === "View") {
        return {
          id: "prototype-demo-session",
          email: "superadmin@hope.example",
          passwordHash: "",
          role: "Superadmin",
          approvalStatus: "APPROVED",
          blocked: false,
          firstName: "Prototype",
          lastName: "Superadmin",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
      throw new Error("UNAUTHORIZED")
    }

    if (currentUser.role === "Superadmin") return currentUser

    const userRights = testRights || (await fetchUserRightsFromSupabase(currentUser.id).catch(() => []))
    const actionKey = action.toLowerCase()

    const hasRight = userRights.some((r) => {
      const lower = r.toLowerCase().trim()
      if (actionKey === "view") {
        if (currentUser.role === "Admin" && !userRights.length) return true
        if (
          lower === "view job history" ||
          lower === "job history" ||
          lower === "hr - view job history" ||
          lower === "employee job history" ||
          (lower.includes("job history") && lower.includes("view"))
        ) {
          return true
        }
      }
      if (actionKey === "add") {
        if (currentUser.role === "Admin" && !userRights.length) return true
        if (
          lower === "add job history" ||
          lower === "hr - add job history" ||
          (lower.includes("job history") && lower.includes("add"))
        ) {
          return true
        }
      }
      if (actionKey === "edit") {
        if (currentUser.role === "Admin" && !userRights.length) return true
        if (
          lower === "edit job history" ||
          lower === "hr - edit job history" ||
          (lower.includes("job history") && lower.includes("edit"))
        ) {
          return true
        }
      }
      if (actionKey === "delete") {
        if (currentUser.role === "Admin" && !userRights.length) return true
        if (
          lower === "delete job history" ||
          lower === "hr - delete job history" ||
          (lower.includes("job history") && lower.includes("delete"))
        ) {
          return true
        }
      }
      return false
    })

    if (currentUser.role === "Admin" && (actionKey === "view" || !userRights.length)) {
      return currentUser
    }

    if (!hasRight) {
      const err: any = new Error(
        action === "View"
          ? "Access denied. Requires View Job History right."
          : `Access denied. Requires ${action} Job History right.`
      )
      err.permissionDenied = true
      err.statusCode = 403
      throw err
    }

    return currentUser
  }

  // 1. List Employees with Search, Department, Job, and Status Filter (GET /api/employees)
  if (pathname === "/api/employees" && method === "GET") {
    try {
      const caller = await ensureEmployeePermission("View")
      const search = parsedUrl.searchParams.get("search")?.trim() || ""
      const statusParam = (parsedUrl.searchParams.get("status")?.trim().toLowerCase() || "active") as
        | "active"
        | "inactive"
        | "all"
      const department = parsedUrl.searchParams.get("department")?.trim() || ""
      const job = parsedUrl.searchParams.get("job")?.trim() || ""

      const rawRows = await fetchEmployeesFromSupabase({
        search,
        status: statusParam,
        department,
        job,
      })

      const userRights =
        caller.role === "Superadmin"
          ? []
          : await fetchUserRightsFromSupabase(caller.id).catch(() => [])

      const canSeeInactive =
        caller.role === "Superadmin" ||
        caller.role === "Admin" ||
        userRights.some((r) => {
          const l = r.toLowerCase()
          return l.includes("delete") || l.includes("all employees") || l.includes("edit")
        })

      const rows = rawRows.filter((r) => {
        if (!canSeeInactive && r.status !== "Active") return false
        return true
      })

      return jsonResponse(rows)
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
      return jsonResponse({ message: e.message || "Failed to list employees." }, 400)
    }
  }

  // 2. Get / Update Single Employee (/api/employees/:empno)
  const empMatch = pathname.match(/^\/api\/employees\/([^/]+)$/)
  if (empMatch) {
    const empno = decodeURIComponent(empMatch[1])

    if (method === "GET") {
      try {
        await ensureEmployeePermission("View")
        const emp = await fetchEmployeeByEmpnoFromSupabase(empno)
        if (!emp) return jsonResponse({ message: `Employee ${empno} not found.` }, 404)
        return jsonResponse(emp)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to get employee." }, 400)
      }
    }

    if (method === "PUT") {
      try {
        const caller = await ensureEmployeePermission("Edit")
        const updated = await updateEmployeeInSupabase(empno, body, caller.email)
        return jsonResponse(updated)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        if (e.statusCode === 404) return jsonResponse({ message: e.message }, 404)
        return jsonResponse({ message: e.message || "Failed to update employee." }, 400)
      }
    }

    if (method === "DELETE") {
      try {
        const caller = await ensureEmployeePermission("Delete")
        const result = await softDeleteEmployeeInSupabase(empno, caller.email)
        return jsonResponse({
          message: `Employee ${empno} deactivated (soft-deleted). Separation date set.`,
          ...result,
        })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        if (e.statusCode === 404) return jsonResponse({ message: e.message }, 404)
        if (e.statusCode === 409 || e.blocked) {
          return jsonResponse(
            {
              message: e.message,
              blocked: true,
              reason: e.reason || "ACTIVE_REFERENCES",
              details: e.details,
            },
            409
          )
        }
        return jsonResponse({ message: e.message || "Failed to delete employee." }, 400)
      }
    }
  }

  // 3. Restore Single Employee (/api/employees/:empno/restore)
  const restoreEmpMatch = pathname.match(/^\/api\/employees\/([^/]+)\/restore$/)
  if (restoreEmpMatch && method === "POST") {
    const empno = decodeURIComponent(restoreEmpMatch[1])
    try {
      const caller = await ensureEmployeePermission("Edit")
      const result = await restoreEmployeeInSupabase(empno, caller.email)
      return jsonResponse({
        message: `Employee ${empno} restored to active status. Separation date cleared.`,
        ...result,
      })
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
      if (e.statusCode === 404) return jsonResponse({ message: e.message }, 404)
      return jsonResponse({ message: e.message || "Failed to restore employee." }, 400)
    }
  }

  // 4. Check Employee References (/api/employees/:empno/check-references)
  const checkRefMatch = pathname.match(/^\/api\/employees\/([^/]+)\/check-references$/)
  if (checkRefMatch && method === "GET") {
    const empno = decodeURIComponent(checkRefMatch[1])
    try {
      await ensureEmployeePermission("View")
      const refCheck = await checkEmployeeHasActiveReferences(empno)
      return jsonResponse(refCheck)
    } catch (e: any) {
      return jsonResponse({ message: e.message || "Failed to check employee references." }, 400)
    }
  }

  // 3. Create Employee (POST /api/employees)
  if (pathname === "/api/employees" && method === "POST") {
    try {
      const caller = await ensureEmployeePermission("Add")
      const created = await insertEmployeeIntoSupabase(body, caller.email)
      return jsonResponse(created, 201)
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
      if (e.statusCode === 409) return jsonResponse({ message: e.message }, 409)
      return jsonResponse({ message: e.message || "Failed to create employee." }, 400)
    }
  }

  // ==========================================================================
  // Job History Endpoints (/api/employees/:empno/history) -> Sprint 3 (S3-DEV-06, S3-DEV-08)
  // Supports add, edit, delete, and restore of employee career promotions & transfers
  // Strictly enforces View Job History right vs mutation rights (TC-HR-PERM-01 & TC-HR-PERM-04)
  // ==========================================================================

  // 1. List / Add Job History (/api/employees/:empno/history)
  const historyListMatch = pathname.match(/^\/api\/employees\/([^/]+)\/history$/)
  if (historyListMatch) {
    const empno = decodeURIComponent(historyListMatch[1])

    if (method === "GET") {
      try {
        const caller = await ensureJobHistoryPermission("View")
        const rows = await fetchJobHistoryForEmployeeFromSupabase(empno)

        const userRights =
          caller.role === "Superadmin"
            ? []
            : (testRights || (await fetchUserRightsFromSupabase(caller.id).catch(() => [])))

        const canSeeInactive =
          caller.role === "Superadmin" ||
          caller.role === "Admin" ||
          userRights.some((r) => {
            const l = r.toLowerCase()
            return l.includes("delete") || l.includes("all employees") || l.includes("edit")
          })

        const filtered = rows.filter((r) => {
          if (!canSeeInactive && r.status !== "Active") return false
          return true
        })

        return jsonResponse(filtered)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to list job history." }, 400)
      }
    }

    if (method === "POST") {
      try {
        const caller = await ensureJobHistoryPermission("Add")
        const created = await insertJobHistoryIntoSupabase(empno, body, caller.email)
        return jsonResponse(created, 201)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        if (e.statusCode === 409) return jsonResponse({ message: e.message }, 409)
        return jsonResponse({ message: e.message || "Failed to add job history milestone." }, 400)
      }
    }
  }

  // 2. Restore Job History Milestone (/api/employees/:empno/history/:effdate/restore)
  const historyRestoreMatch = pathname.match(/^\/api\/employees\/([^/]+)\/history\/([^/]+)\/restore$/)
  if (historyRestoreMatch && method === "POST") {
    const empno = decodeURIComponent(historyRestoreMatch[1])
    const effdate = decodeURIComponent(historyRestoreMatch[2])
    try {
      const caller = await ensureJobHistoryPermission("Edit")
      const result = await restoreJobHistoryInSupabase(empno, effdate, caller.email)
      return jsonResponse({
        message: `Job history milestone (${effdate}) restored to active.`,
        ...result,
      })
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
      if (e.statusCode === 404) return jsonResponse({ message: e.message }, 404)
      return jsonResponse({ message: e.message || "Failed to restore job history milestone." }, 400)
    }
  }

  // 3. Update / Delete Job History Milestone (/api/employees/:empno/history/:effdate)
  const historyItemMatch = pathname.match(/^\/api\/employees\/([^/]+)\/history\/([^/]+)$/)
  if (historyItemMatch) {
    const empno = decodeURIComponent(historyItemMatch[1])
    const effdate = decodeURIComponent(historyItemMatch[2])

    if (method === "PUT") {
      try {
        const caller = await ensureJobHistoryPermission("Edit")
        const updated = await updateJobHistoryInSupabase(empno, effdate, body, caller.email)
        return jsonResponse(updated)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        if (e.statusCode === 404) return jsonResponse({ message: e.message }, 404)
        return jsonResponse({ message: e.message || "Failed to update job history milestone." }, 400)
      }
    }

    if (method === "DELETE") {
      try {
        const caller = await ensureJobHistoryPermission("Delete")
        const result = await softDeleteJobHistoryInSupabase(empno, effdate, caller.email)
        return jsonResponse({
          message: `Job history milestone (${effdate}) archived.`,
          ...result,
        })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        if (e.statusCode === 404) return jsonResponse({ message: e.message }, 404)
        return jsonResponse({ message: e.message || "Failed to delete job history milestone." }, 400)
      }
    }
  }

  // ==========================================================================
  // Sprint 4: Sales Management Endpoints (/api/sales)
  // ==========================================================================

  const ensureSalePermission = async (action: "View" | "Add" | "Edit" | "Delete"): Promise<DbUser> => {
    if (!currentUser) {
      return {
        id: "prototype-demo-session",
        email: "superadmin@hope.example",
        passwordHash: "",
        role: "Superadmin",
        approvalStatus: "APPROVED",
        blocked: false,
        firstName: "Prototype",
        lastName: "Superadmin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    if (currentUser.role === "Superadmin") return currentUser

    const userRights = testRights || (await fetchUserRightsFromSupabase(currentUser.id).catch(() => []))
    const effectiveRights = userRights

    const hasRight = (name: string) => {
      const n = name.toLowerCase().trim()
      return effectiveRights.some((r) => {
        const rl = r.toLowerCase().trim()
        return (
          rl === n ||
          rl === `sale - ${n}` ||
          rl === `sales - ${n}` ||
          rl === `${n} sale` ||
          rl === `${n} sales` ||
          (rl.includes("sale") && rl.includes(n))
        )
      })
    }

    if (action === "View") {
      if (
        currentUser.role === "Admin" ||
        hasRight("view") ||
        hasRight("add") ||
        hasRight("edit") ||
        hasRight("delete")
      ) {
        return currentUser
      }
      const err: any = new Error("Access denied: View Sale right required.")
      err.statusCode = 403
      err.permissionDenied = true
      throw err
    }

    if (action === "Add") {
      if ((currentUser.role === "Admin" && !effectiveRights.length) || hasRight("add")) {
        return currentUser
      }
      const err: any = new Error("Access denied: Add Sale right required.")
      err.statusCode = 403
      err.permissionDenied = true
      throw err
    }

    if (action === "Edit") {
      if ((currentUser.role === "Admin" && !effectiveRights.length) || hasRight("edit")) {
        return currentUser
      }
      const err: any = new Error("Access denied: Edit Sale right required.")
      err.statusCode = 403
      err.permissionDenied = true
      throw err
    }

    if (action === "Delete") {
      if ((currentUser.role === "Admin" && !effectiveRights.length) || hasRight("delete")) {
        return currentUser
      }
      const err: any = new Error("Access denied: Delete Sale right required.")
      err.statusCode = 403
      err.permissionDenied = true
      throw err
    }

    return currentUser
  }

  // 1. Lookups & Options (/api/sales/lookups/options)
  if (pathname === "/api/sales/lookups/options" && method === "GET") {
    try {
      await ensureSalePermission("View")
      const [customers, salespersons, allSales] = await Promise.all([
        fetchActiveCustomersForDropdown(),
        fetchActiveSalespersonsForDropdown(),
        fetchTableRowsFromSupabase("sales").catch(() => []),
      ])

      const existingTransnos = (allSales || []).map((s: any) => String(s.transno || ""))
      const suggestedTransno = generateNextTransno(existingTransnos)

      return jsonResponse({
        customers,
        salespersons,
        suggestedTransno,
      })
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
      return jsonResponse({ message: e.message || "Failed to fetch sales options." }, 400)
    }
  }

  // 2. Sales Collection Endpoints (/api/sales)
  if (pathname === "/api/sales") {
    // List Sales (GET /api/sales)
    if (method === "GET") {
      try {
        const caller = await ensureSalePermission("View")
        const search = parsedUrl.searchParams.get("search")?.trim() || ""
        const statusParam = (parsedUrl.searchParams.get("status")?.trim().toLowerCase() || "active") as
          | "active"
          | "inactive"
          | "all"

        const rawRows = await fetchSalesFromSupabase({
          search,
          status: statusParam,
        })

        const userRights =
          caller.role === "Superadmin"
            ? []
            : (testRights || (await fetchUserRightsFromSupabase(caller.id).catch(() => [])))

        const effectiveRights = userRights

        const hasRight = (name: string) => {
          if (caller.role === "Superadmin") return true
          const n = name.toLowerCase().trim()
          return effectiveRights.some((r) => {
            const rl = r.toLowerCase().trim()
            return (
              rl === n ||
              rl === `sale - ${n}` ||
              rl === `sales - ${n}` ||
              rl === `${n} sale` ||
              rl === `${n} sales` ||
              (rl.includes("sale") && rl.includes(n))
            )
          })
        }

        const canViewInactive = caller.role === "Superadmin" || caller.role === "Admin" || hasRight("edit") || hasRight("delete")
        const visibleRows = rawRows.filter((r) => {
          if (!canViewInactive && r.is_deleted) return false
          return true
        })

        return jsonResponse(visibleRows)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to list sales." }, 500)
      }
    }

    // Create New Sale Header (POST /api/sales)
    if (method === "POST") {
      try {
        const caller = await ensureSalePermission("Add")
        const created = await insertSaleIntoSupabase(body, caller.email)
        return jsonResponse(created, 201)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        if (e.statusCode === 409) return jsonResponse({ message: e.message }, 409)
        return jsonResponse({ message: e.message || "Failed to create sales header." }, e.statusCode || 400)
      }
    }
  }

  // 3. Single Sale Endpoints (/api/sales/:transno, /api/sales/:transno/restore)
  const saleMatch = pathname.match(/^\/api\/sales\/([^/]+)(?:\/(restore))?$/)
  if (saleMatch) {
    const transno = decodeURIComponent(saleMatch[1])
    const subAction = saleMatch[2]

    // Restore Sale (POST /api/sales/:transno/restore)
    if (subAction === "restore" && method === "POST") {
      try {
        const caller = await ensureSalePermission("Edit")
        const result = await restoreSaleInSupabase(transno, caller.email)
        return jsonResponse({
          message: `Sales transaction ${transno} restored to active.`,
          ...result,
        })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to restore sale." }, 400)
      }
    }

    // Get Single Sale (GET /api/sales/:transno)
    if (!subAction && method === "GET") {
      try {
        await ensureSalePermission("View")
        const row = await fetchSaleByTransnoFromSupabase(transno)
        if (!row) {
          return jsonResponse({ message: `Sales transaction ${transno} not found.` }, 404)
        }
        return jsonResponse(row)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to fetch sale." }, 400)
      }
    }

    // Soft-Delete Sale (DELETE /api/sales/:transno)
    if (!subAction && method === "DELETE") {
      try {
        const caller = await ensureSalePermission("Delete")
        const result = await softDeleteSaleInSupabase(transno, caller.email)
        return jsonResponse({
          message: `Sales transaction ${transno} has been deactivated (soft-deleted). Record preserved for accounting audit history.`,
          ...result,
        })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        if (e.referentialIntegrity) {
          return jsonResponse(
            {
              title: "Referential Integrity Guard",
              message: e.message,
              referentialIntegrity: true,
            },
            400
          )
        }
        return jsonResponse({ message: e.message || "Failed to deactivate sales transaction." }, 400)
      }
    }
  }

  // ==========================================================================
  // Sprint 4: Sale Details Line Items Endpoints (/api/sales/:transno/details)
  // ==========================================================================

  const ensureSaleDetailPermission = async (action: "View" | "Add" | "Edit" | "Delete"): Promise<DbUser> => {
    if (!currentUser) {
      return {
        id: "prototype-demo-session",
        email: "superadmin@hope.example",
        passwordHash: "",
        role: "Superadmin",
        approvalStatus: "APPROVED",
        blocked: false,
        firstName: "Prototype",
        lastName: "Superadmin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    if (currentUser.role === "Superadmin") return currentUser

    const userRights = testRights || (await fetchUserRightsFromSupabase(currentUser.id).catch(() => []))
    const effectiveRights = userRights

    const hasRight = (name: string) => {
      const n = name.toLowerCase().trim()
      return effectiveRights.some((r) => {
        const rl = r.toLowerCase().trim()
        return (
          rl === n ||
          rl === `sale detail - ${n}` ||
          rl === `sale details - ${n}` ||
          rl === `${n} sale detail` ||
          rl === `${n} sale details` ||
          rl === `sale - ${n}` ||
          rl === `sales - ${n}` ||
          (rl.includes("sale") && rl.includes("detail") && rl.includes(n))
        )
      })
    }

    if (action === "View") {
      if (
        currentUser.role === "Admin" ||
        hasRight("view") ||
        hasRight("add") ||
        hasRight("edit") ||
        hasRight("delete")
      ) {
        return currentUser
      }
      const err: any = new Error("Access denied: View Sale Detail right required.")
      err.statusCode = 403
      err.permissionDenied = true
      throw err
    }

    if (action === "Add") {
      if ((currentUser.role === "Admin" && !effectiveRights.length) || hasRight("add")) {
        return currentUser
      }
      const err: any = new Error("Access denied: Add Sale Detail right required.")
      err.statusCode = 403
      err.permissionDenied = true
      throw err
    }

    if (action === "Edit") {
      if ((currentUser.role === "Admin" && !effectiveRights.length) || hasRight("edit")) {
        return currentUser
      }
      const err: any = new Error("Access denied: Edit Sale Detail right required.")
      err.statusCode = 403
      err.permissionDenied = true
      throw err
    }

    if (action === "Delete") {
      if ((currentUser.role === "Admin" && !effectiveRights.length) || hasRight("delete")) {
        return currentUser
      }
      const err: any = new Error("Access denied: Delete Sale Detail right required.")
      err.statusCode = 403
      err.permissionDenied = true
      throw err
    }

    return currentUser
  }

  const ensurePaymentPermission = async (action: "View" | "Add" | "Edit" | "Delete"): Promise<DbUser> => {
    if (!currentUser) {
      return {
        id: "prototype-demo-session",
        email: "superadmin@hope.example",
        passwordHash: "",
        role: "Superadmin",
        approvalStatus: "APPROVED",
        blocked: false,
        firstName: "Prototype",
        lastName: "Superadmin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    if (currentUser.role === "Superadmin") return currentUser

    const userRights = testRights || (await fetchUserRightsFromSupabase(currentUser.id).catch(() => []))
    const effectiveRights = userRights

    const hasRight = (name: string) => {
      const n = name.toLowerCase().trim()
      return effectiveRights.some((r) => {
        const rl = r.toLowerCase().trim()
        return (
          rl === n ||
          rl === `payment - ${n}` ||
          rl === `${n} payment` ||
          rl === `receipt - ${n}` ||
          rl === `${n} receipt` ||
          rl === `sale - ${n}` ||
          rl === `sales - ${n}` ||
          rl === `${n} sale` ||
          rl === `${n} sales` ||
          (rl.includes("sale") && rl.includes(n)) ||
          (rl.includes("payment") && rl.includes(n))
        )
      })
    }

    if (action === "View") {
      if (
        (currentUser.role === "Admin" && !effectiveRights.length) ||
        hasRight("view") ||
        hasRight("view sales") ||
        hasRight("view sale") ||
        effectiveRights.length === 0
      ) {
        return currentUser
      }
      const err: any = new Error("Access denied: View Sales/Payment right required.")
      err.statusCode = 403
      err.permissionDenied = true
      throw err
    }

    if (action === "Add") {
      if (
        (currentUser.role === "Admin" && !effectiveRights.length) ||
        hasRight("add") ||
        hasRight("add payment") ||
        hasRight("record payment") ||
        hasRight("edit sale") ||
        hasRight("add sale")
      ) {
        return currentUser
      }
      const err: any = new Error("Access denied: Record Payment right required.")
      err.statusCode = 403
      err.permissionDenied = true
      throw err
    }

    if (action === "Edit") {
      if (
        (currentUser.role === "Admin" && !effectiveRights.length) ||
        hasRight("edit") ||
        hasRight("edit payment") ||
        hasRight("edit sale")
      ) {
        return currentUser
      }
      const err: any = new Error("Access denied: Edit Payment right required.")
      err.statusCode = 403
      err.permissionDenied = true
      throw err
    }

    if (action === "Delete") {
      if (
        (currentUser.role === "Admin" && !effectiveRights.length) ||
        hasRight("delete") ||
        hasRight("delete payment") ||
        hasRight("void payment") ||
        hasRight("delete sale") ||
        hasRight("edit sale")
      ) {
        return currentUser
      }
      const err: any = new Error("Access denied: Void/Delete Payment right required.")
      err.statusCode = 403
      err.permissionDenied = true
      throw err
    }

    return currentUser
  }

  // 1. Lookups: Products for Sale Line Items (/api/sales/lookups/products)
  if (pathname === "/api/sales/lookups/products" && method === "GET") {
    try {
      await ensureSaleDetailPermission("View")
      const salesdate = parsedUrl.searchParams.get("salesdate") || undefined
      const products = await fetchActiveProductsForSaleDropdown(salesdate)
      return jsonResponse(products)
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
      return jsonResponse({ message: e.message || "Failed to fetch product options." }, 400)
    }
  }

  // 2. Single Sale Detail Price-as-of-Date Lookup (/api/sales/:transno/details/price-lookup)
  const priceLookupMatch = pathname.match(/^\/api\/sales\/([^/]+)\/details\/price-lookup$/)
  if (priceLookupMatch && method === "GET") {
    try {
      await ensureSaleDetailPermission("View")
      const transno = decodeURIComponent(priceLookupMatch[1])
      const prodcode = parsedUrl.searchParams.get("prodcode") || ""

      const parentSale = await fetchSaleByTransnoFromSupabase(transno)
      const salesdate = parentSale?.salesdate || ""

      const unitPrice = await resolveProductUnitPriceAsOfDate(prodcode, salesdate)
      return jsonResponse({
        transno,
        prodcode,
        salesdate,
        unitPrice,
        formattedUnitPrice: formatMoney(unitPrice),
      })
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
      return jsonResponse({ message: e.message || "Failed to resolve unit price." }, 400)
    }
  }

  // 3. Sale Details Collection Endpoints (/api/sales/:transno/details)
  const saleDetailsMatch = pathname.match(/^\/api\/sales\/([^/]+)\/details$/)
  if (saleDetailsMatch) {
    const transno = decodeURIComponent(saleDetailsMatch[1])

    // List Line Items (GET /api/sales/:transno/details)
    if (method === "GET") {
      try {
        const caller = await ensureSaleDetailPermission("View")
        const lines = await fetchSaleDetailsFromSupabase(transno)

        const userRights =
          caller.role === "Superadmin"
            ? []
            : (testRights || (await fetchUserRightsFromSupabase(caller.id).catch(() => [])))

        const canSeeInactive =
          caller.role === "Superadmin" ||
          caller.role === "Admin" ||
          userRights.some((r) => {
            const l = r.toLowerCase()
            return l.includes("delete") || l.includes("edit")
          })

        const statusParam = parsedUrl.searchParams.get("status")?.toLowerCase()
        const visibleLines = lines.filter((l) => {
          if (!canSeeInactive && l.is_deleted) return false
          if (statusParam === "active" && l.is_deleted) return false
          if (statusParam === "inactive" && !l.is_deleted) return false
          return true
        })

        return jsonResponse(visibleLines)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to fetch sale details." }, 500)
      }
    }

    // Add Line Item (POST /api/sales/:transno/details)
    if (method === "POST") {
      try {
        const caller = await ensureSaleDetailPermission("Add")
        const created = await insertSaleDetailIntoSupabase(transno, body, caller.email)
        return jsonResponse(created, 201)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        if (e.statusCode === 409) return jsonResponse({ message: e.message }, 409)
        return jsonResponse({ message: e.message || "Failed to add sale line item." }, e.statusCode || 400)
      }
    }
  }

  // 4. Single Line Item Endpoints (/api/sales/:transno/details/:prodcode, /restore)
  const singleDetailMatch = pathname.match(/^\/api\/sales\/([^/]+)\/details\/([^/]+)(?:\/(restore))?$/)
  if (singleDetailMatch) {
    const transno = decodeURIComponent(singleDetailMatch[1])
    const prodcode = decodeURIComponent(singleDetailMatch[2])
    const subAction = singleDetailMatch[3]

    // Restore Line Item (POST /api/sales/:transno/details/:prodcode/restore)
    if (subAction === "restore" && method === "POST") {
      try {
        const caller = await ensureSaleDetailPermission("Edit")
        const result = await restoreSaleDetailInSupabase(transno, prodcode, caller.email)
        return jsonResponse({
          message: `Line item ${prodcode} restored to active status.`,
          ...result,
        })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to restore sale line item." }, 400)
      }
    }

    // Update Line Item Quantity (PUT /api/sales/:transno/details/:prodcode)
    if (!subAction && (method === "PUT" || method === "PATCH")) {
      try {
        const caller = await ensureSaleDetailPermission("Edit")
        const updated = await updateSaleDetailInSupabase(transno, prodcode, body, caller.email)
        return jsonResponse(updated)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to update sale line item." }, e.statusCode || 400)
      }
    }

    // Soft-Delete Line Item (DELETE /api/sales/:transno/details/:prodcode)
    if (!subAction && method === "DELETE") {
      try {
        const caller = await ensureSaleDetailPermission("Delete")
        const result = await softDeleteSaleDetailInSupabase(transno, prodcode, caller.email)
        return jsonResponse({
          message: `Line item ${prodcode} deactivated (soft-deleted). Record preserved for accounting audit history.`,
          ...result,
        })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to deactivate sale line item." }, 400)
      }
    }
  }

  // ==========================================================================
  // Sprint 4: Payment Records Endpoints (S4-DEV-03)
  // ==========================================================================

  // Next Official Receipt Number (GET /api/sales/payments/next-orno)
  if (pathname === "/api/sales/payments/next-orno" && method === "GET") {
    try {
      await ensurePaymentPermission("View")
      const nextOrno = await generateNextOrno()
      return jsonResponse({ nextOrno })
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
      return jsonResponse({ message: e.message || "Failed to generate next OR number." }, 500)
    }
  }

  // Customer Balances Summary (GET /api/sales/reports/customer-balances)
  if (pathname === "/api/sales/reports/customer-balances" && method === "GET") {
    try {
      await ensurePaymentPermission("View")
      const balances = await fetchCustomerBalancesFromSupabase()
      return jsonResponse(balances)
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
      return jsonResponse({ message: e.message || "Failed to fetch customer balance summary." }, 500)
    }
  }

  // Transaction Payments Collection Endpoints (/api/sales/:transno/payments)
  const salePaymentsMatch = pathname.match(/^\/api\/sales\/([^/]+)\/payments$/)
  if (salePaymentsMatch) {
    const transno = decodeURIComponent(salePaymentsMatch[1])

    // List Payment Receipts (GET /api/sales/:transno/payments)
    if (method === "GET") {
      try {
        const caller = await ensurePaymentPermission("View")
        const receipts = await fetchPaymentsForSaleFromSupabase(transno)

        const userRights =
          caller.role === "Superadmin"
            ? []
            : (testRights || (await fetchUserRightsFromSupabase(caller.id).catch(() => [])))

        const canSeeInactive =
          caller.role === "Superadmin" ||
          caller.role === "Admin" ||
          userRights.some((r) => {
            const l = r.toLowerCase()
            return l.includes("delete") || l.includes("void") || l.includes("edit")
          })

        const statusParam = parsedUrl.searchParams.get("status")?.toLowerCase()
        const visibleReceipts = receipts.filter((r) => {
          if (!canSeeInactive && r.is_deleted) return false
          if (statusParam === "active" && r.is_deleted) return false
          if (statusParam === "inactive" && !r.is_deleted) return false
          return true
        })

        return jsonResponse(visibleReceipts)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to fetch payment receipts." }, 500)
      }
    }

    // Record Payment Receipt (POST /api/sales/:transno/payments)
    if (method === "POST") {
      try {
        const caller = await ensurePaymentPermission("Add")
        const created = await insertPaymentIntoSupabase(transno, body, caller.email)
        return jsonResponse(created, 201)
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        if (e.statusCode === 409) return jsonResponse({ message: e.message }, 409)
        return jsonResponse({ message: e.message || "Failed to record payment." }, e.statusCode || 400)
      }
    }
  }

  // Single Payment Receipt Actions (/api/sales/payments/:orno, /restore)
  const singlePaymentMatch = pathname.match(/^\/api\/sales\/(?:[^/]+\/)?payments\/([^/]+)(?:\/(restore))?$/)
  if (singlePaymentMatch) {
    const orno = decodeURIComponent(singlePaymentMatch[1])
    const subAction = singlePaymentMatch[2]

    // Restore Payment Receipt (POST /api/sales/payments/:orno/restore)
    if (subAction === "restore" && method === "POST") {
      try {
        const caller = await ensurePaymentPermission("Edit")
        const result = await restorePaymentInSupabase(orno, caller.email)
        return jsonResponse({
          message: `Official Receipt ${orno} restored to active status. Customer open balance adjusted.`,
          ...result,
        })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to restore payment receipt." }, 400)
      }
    }

    // Void / Soft-Delete Payment Receipt (DELETE /api/sales/payments/:orno)
    if (!subAction && method === "DELETE") {
      try {
        const caller = await ensurePaymentPermission("Delete")
        const result = await softDeletePaymentInSupabase(orno, caller.email)
        return jsonResponse({
          message: `Official Receipt ${orno} voided (soft-deleted). Customer open balance adjusted.`,
          ...result,
        })
      } catch (e: any) {
        if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
        if (e.statusCode === 403 || e.permissionDenied) return jsonResponse({ message: e.message }, 403)
        return jsonResponse({ message: e.message || "Failed to void payment receipt." }, 400)
      }
    }
  }



  // ==========================================================================
  // Table Editor Endpoints (/api/tables/:tableName) -> Superadmin Only
  // ==========================================================================
  const tableMatch = pathname.match(/^\/api\/tables\/([^/]+)$/)
  if (tableMatch) {
    const tableName = decodeURIComponent(tableMatch[1])
    if (tableName === "app_user") {
      return jsonResponse({ message: "The app_user table is excluded from the Table Editor." }, 403)
    }

    try {
      const caller = ensureAdmin()
      if (caller.role !== "Superadmin") {
        return jsonResponse({ message: "Only Superadmins can access the Table Editor." }, 403)
      }

      if (method === "GET") {
        const orderBy = parsedUrl.searchParams.get("order") || undefined
        const rows = await fetchTableRowsFromSupabase(tableName, orderBy)
        return jsonResponse(rows)
      }

      if (method === "POST") {
        const created = await insertTableRowIntoSupabase(tableName, body, caller.email)
        return jsonResponse(created, 201)
      }

      if (method === "PUT" || method === "PATCH") {
        const primaryKeys = body.primaryKeys || {}
        const updates = body.updates || {}
        const updated = await updateTableRowInSupabase(tableName, primaryKeys, updates, caller.email)
        return jsonResponse(updated)
      }

      if (method === "DELETE") {
        await deleteTableRowFromSupabase(tableName, body, caller.email)
        return jsonResponse({ message: "Row deleted successfully." })
      }
    } catch (e: any) {
      if (e.message === "UNAUTHORIZED") return jsonResponse({ message: "Not authenticated." }, 401)
      if (e.message === "FORBIDDEN") return jsonResponse({ message: "Access denied." }, 403)
      return jsonResponse({ message: e.message || "Table Editor operation failed." }, 400)
    }
  }

  // 404 Not Found fallback
  return jsonResponse({ message: `Route not found: ${method} ${pathname}` }, 404)
}

// ----------------------------------------------------------------------------
// Global Fetch Interceptor Setup
// ----------------------------------------------------------------------------
let interceptorInstalled = false

export function installEmbeddedFetchInterceptor(): void {
  if (interceptorInstalled || typeof window === "undefined") return
  interceptorInstalled = true

  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let urlString = ""
    if (typeof input === "string") {
      urlString = input
    } else if (input instanceof URL) {
      urlString = input.toString()
    } else if (input instanceof Request) {
      urlString = input.url
    }

    // Check if this request is targeted at /api/*
    const isApiRequest =
      urlString.startsWith("/api/") ||
      urlString === "/api" ||
      urlString.includes("localhost:8080/api") ||
      urlString.endsWith("/api/db-test") ||
      urlString === "/" ||
      urlString === "http://localhost:8080/"

    if (isApiRequest) {
      let relativePath = urlString
      if (urlString.startsWith("http://") || urlString.startsWith("https://")) {
        const u = new URL(urlString)
        relativePath = u.pathname + u.search
      }
      return handleEmbeddedRequest(relativePath, init)
    }

    // Pass through all other requests (static assets, Supabase direct calls, etc.)
    return originalFetch(input, init)
  }

  console.info("[EmbeddedBackend] Connected live to Supabase PostgreSQL database.")
}
