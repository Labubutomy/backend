import { createStore, createEvent, createEffect, sample } from 'effector'
import { authApi } from '@shared/api'
import type { UserLogin, UserCreate, UserResponse } from '@shared/api/auth'
import { appStarted } from '@shared/router/init'
import { routes } from '@shared/router/router'

export interface AuthFormData {
  email: string
  password: string
  confirmPassword?: string
  displayName?: string
  userType?: 'CLIENT' | 'DEVELOPER'
}

export type AuthMode = 'login' | 'register'

// Events
export const authModeChanged = createEvent<AuthMode>()
export const authSubmitted = createEvent<AuthFormData>()
export const authErrorCleared = createEvent()
export const logoutClicked = createEvent()

// Effects
const loginFx = createEffect(async (data: UserLogin) => {
  const response = await authApi.login(data)
  return response.data
})

const registerFx = createEffect(async (data: UserCreate) => {
  const response = await authApi.register(data)
  return response.data
})

const refreshFx = createEffect(async (refreshToken: string) => {
  const response = await authApi.refresh({ refresh_token: refreshToken })
  return response.data
})

const logoutFx = createEffect(async () => {
  const refreshToken = localStorage.getItem('refresh_token')
  if (refreshToken) {
    try {
      await authApi.logout({ refresh_token: refreshToken })
    } catch (error) {
      console.warn('Logout request failed:', error)
    }
  }
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
})

export const getMeFx = createEffect(async () => {
  const response = await authApi.getMe()
  return response.data
})

// Stores
export const $authMode = createStore<AuthMode>('login')
export const $isLoading = createStore(false)
export const $authError = createStore<string | null>(null)
export const $isAuthenticated = createStore(false)
export const $user = createStore<UserResponse | null>(null)

// Reducers
$authMode.on(authModeChanged, (_, mode) => mode)

$isLoading
  .on([loginFx, registerFx, refreshFx, logoutFx, getMeFx], () => true)
  .on([loginFx.done, registerFx.done, refreshFx.done, logoutFx.done, getMeFx.done], () => false)
  .on([loginFx.fail, registerFx.fail, refreshFx.fail, logoutFx.fail, getMeFx.fail], () => false)

$authError
  .on(
    [loginFx.fail, registerFx.fail, refreshFx.fail, logoutFx.fail, getMeFx.fail],
    (_, { error }: { error: unknown }) => {
      const err = error as { response?: { data?: { detail?: string; message?: string } } }
      // Handle different error types
      if (err.response?.data?.detail) {
        return err.response.data.detail
      }
      if (err.response?.data?.message) {
        return err.response.data.message
      }
      return 'Произошла ошибка. Попробуйте еще раз.'
    }
  )
  .on(authErrorCleared, () => null)
  .on(authSubmitted, () => null)

$isAuthenticated
  .on([loginFx.done, registerFx.done, refreshFx.done, getMeFx.done], () => true)
  .on(logoutFx.done, () => false)
  .on(getMeFx.fail, () => false) // If getMe fails, user is not authenticated

$user.on(getMeFx.doneData, (_, user) => user).on(logoutFx.done, () => null)

// Samples
sample({
  clock: authSubmitted,
  filter: ({ email, password, userType }) =>
    !!email && !!password && ($authMode.getState() === 'login' || !!userType),
  fn: ({ email, password, userType, displayName }) => {
    const authMode = $authMode.getState()
    if (authMode === 'login') {
      return { email, password }
    } else {
      return {
        email,
        password,
        display_name: displayName || email.split('@')[0], // Use email prefix as fallback
        user_type: userType || 'CLIENT',
      }
    }
  },
  target: [loginFx, registerFx],
})

sample({
  clock: loginFx.doneData,
  fn: result => {
    localStorage.setItem('access_token', result.access_token)
    localStorage.setItem('refresh_token', result.refresh_token)
    return result
  },
  target: getMeFx,
})

sample({
  clock: registerFx.doneData,
  fn: result => {
    localStorage.setItem('access_token', result.access_token)
    localStorage.setItem('refresh_token', result.refresh_token)
    return result
  },
  target: getMeFx,
})

// Initialize user on app start if token exists
sample({
  clock: appStarted,
  filter: () => {
    const token = localStorage.getItem('access_token')
    const isOnAuthPage =
      window.location.pathname === '/login' ||
      window.location.pathname === '/signup' ||
      window.location.pathname === '/auth'
    return !!token && !isOnAuthPage
  },
  target: getMeFx,
})

// Redirect to dashboard after successful authentication (only after login/register)
sample({
  clock: [loginFx.doneData, registerFx.doneData],
  target: getMeFx,
})

// Immediate redirect after successful login/register
sample({
  clock: [loginFx.doneData, registerFx.doneData],
  fn: () => {
    // Force redirect to dashboard immediately after login/register
    window.location.href = '/customer/dashboard' // Default to customer dashboard
  },
})

// Redirect after getting user info (only for new logins/registrations)
sample({
  clock: getMeFx.doneData,
  fn: user => {
    // Only redirect if we're on auth pages
    if (
      window.location.pathname === '/login' ||
      window.location.pathname === '/signup' ||
      window.location.pathname === '/auth'
    ) {
      if (user.user_type === 'CLIENT') {
        routes.customerDashboard.open()
      } else {
        routes.freelancerDashboard.open()
      }
    }
  },
})

// Handle logout
sample({
  clock: logoutClicked,
  target: logoutFx,
})

// Redirect to landing page after logout
sample({
  clock: logoutFx.done,
  fn: () => {
    // Redirect to main page
    window.location.href = '/'
  },
})

export const authModel = {
  $authMode,
  $isLoading,
  $authError,
  $isAuthenticated,
  $user,
  authModeChanged,
  authSubmitted,
  authErrorCleared,
  logoutClicked,
}
