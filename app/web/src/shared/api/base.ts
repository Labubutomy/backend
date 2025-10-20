import axios from 'axios'
import { config } from '@shared/config/env'

// Base API configuration
const api = axios.create({
  baseURL: config.apiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for adding auth token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Response interceptor for handling errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      // Only redirect if not already on auth page
      if (window.location.pathname !== '/auth') {
        window.location.href = '/auth'
      }
    }
    return Promise.reject(error)
  }
)

export { api }
