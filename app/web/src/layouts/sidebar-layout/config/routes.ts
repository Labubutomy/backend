import { Home, User, Settings, CreditCard, Bell, Shield } from 'lucide-react'
import React from 'react'

export interface RouteConfig {
  path: string
  label: string
  icon: React.ReactNode
}

export const routes: RouteConfig[] = [
  {
    path: '/customer/dashboard',
    label: 'Dashboard',
    icon: React.createElement(Home, { className: 'w-6 h-6' }),
  },
  {
    path: '/developer/dashboard',
    label: 'Developer',
    icon: React.createElement(User, { className: 'w-6 h-6' }),
  },
  {
    path: '/profile',
    label: 'Profile',
    icon: React.createElement(Settings, { className: 'w-6 h-6' }),
  },
  {
    path: '/billing',
    label: 'Billing',
    icon: React.createElement(CreditCard, { className: 'w-6 h-6' }),
  },
  {
    path: '/notifications',
    label: 'Notifications',
    icon: React.createElement(Bell, { className: 'w-6 h-6' }),
  },
  {
    path: '/admin',
    label: 'Admin',
    icon: React.createElement(Shield, { className: 'w-6 h-6' }),
  },
]
