import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { authApi } from "../lib/api"
import type { AuthResponse, AuthUser } from "../lib/types"

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<AuthResponse>
  logout: () => Promise<void>
  updateProfile: (data: {
    firstName?: string
    lastName?: string
    currentPassword?: string
    newPassword?: string
  }) => Promise<AuthUser & { message: string }>
  checkSession: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  function clearError() {
    setError(null)
  }

  async function checkSession() {
    setIsLoading(true)
    let fetchedUser: AuthUser | null = null
    let hasError = false

    try {
      const responseUser = await authApi.me()
      if (responseUser) {
        fetchedUser = responseUser
      } else {
        fetchedUser = null
      }
    } catch (e) {
      hasError = true
      fetchedUser = null
    }

    if (!hasError && fetchedUser !== null) {
      setUser(fetchedUser)
    } else {
      setUser(null)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    function initSession() {
      checkSession()
    }
    initSession()
  }, [])

  async function login(email: string, password: string) {
    setError(null)
    try {
      const credentials = { email: email, password: password }
      await authApi.login(credentials)
      const currentUserProfile = await authApi.me()
      if (currentUserProfile != null) {
        setUser(currentUserProfile)
      } else {
        setUser(null)
      }
    } catch (err: any) {
      let errorMessage = "Failed to log in."
      if (err && err.message) {
        errorMessage = String(err.message)
      }
      setError(errorMessage)
      throw err
    }
  }

  async function register(email: string, password: string): Promise<AuthResponse> {
    setError(null)
    try {
      const registrationPayload = { email: email, password: password }
      const res = await authApi.register(registrationPayload)
      return res
    } catch (err: any) {
      let errorMessage = "Registration failed."
      if (err && err.message) {
        errorMessage = String(err.message)
      }
      setError(errorMessage)
      throw err
    }
  }

  async function logout() {
    setError(null)
    let logoutSuccess = false
    try {
      await authApi.logout()
      logoutSuccess = true
    } catch (err) {
      logoutSuccess = false
    } finally {
      setUser(null)
    }
  }

  async function updateProfile(data: {
    firstName?: string
    lastName?: string
    currentPassword?: string
    newPassword?: string
  }): Promise<AuthUser & { message: string }> {
    setError(null)
    try {
      const updatedUser = await authApi.updateProfile(data)
      setUser((prevUser) => {
        if (prevUser === null || prevUser === undefined) {
          return updatedUser
        }
        
        let assignedRole = prevUser.role
        if (updatedUser.role) {
          assignedRole = updatedUser.role
        }

        const mergedUser: AuthUser = {
          id: updatedUser.id ? updatedUser.id : prevUser.id,
          email: updatedUser.email ? updatedUser.email : prevUser.email,
          firstName: updatedUser.firstName !== undefined ? updatedUser.firstName : prevUser.firstName,
          lastName: updatedUser.lastName !== undefined ? updatedUser.lastName : prevUser.lastName,
          role: assignedRole,
        }
        return mergedUser
      })
      return updatedUser
    } catch (err: any) {
      let errorMessage = "Failed to update profile."
      if (err && err.message) {
        errorMessage = String(err.message)
      }
      setError(errorMessage)
      throw err
    }
  }

  let userIsAuthenticated = false
  if (user !== null && user !== undefined) {
    userIsAuthenticated = true
  } else {
    userIsAuthenticated = false
  }

  const contextValue: AuthContextType = {
    user: user,
    isAuthenticated: userIsAuthenticated,
    isLoading: isLoading,
    error: error,
    login: login,
    register: register,
    logout: logout,
    updateProfile: updateProfile,
    checkSession: checkSession,
    clearError: clearError,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined || context === null) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}