import React from 'react'
import { cn } from '@shared/lib/utils'
import { Button } from '@shared/ui'
import { Home, Plus, Briefcase, Users, Bell, User } from 'lucide-react'
import { useUnit } from 'effector-react'
import { authModel } from '@pages/auth/model/auth-model'

interface SidebarProps {
  className?: string
}

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  href: string
  roles?: string[]
}

const customerNavItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Дашборд',
    icon: <Home className="w-5 h-5" />,
    href: '/customer/dashboard',
  },
  {
    id: 'create-task',
    label: 'Создать задачу',
    icon: <Plus className="w-5 h-5" />,
    href: '/customer/tasks/new',
  },
  {
    id: 'freelancers',
    label: 'Исполнители',
    icon: <Users className="w-5 h-5" />,
    href: '/customer/freelancers',
  },
  {
    id: 'profile',
    label: 'Профиль',
    icon: <User className="w-5 h-5" />,
    href: '/customer/profile',
  },
]

const freelancerNavItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Дашборд',
    icon: <Home className="w-5 h-5" />,
    href: '/freelancer/dashboard',
  },
  {
    id: 'available-tasks',
    label: 'Доступные задачи',
    icon: <Briefcase className="w-5 h-5" />,
    href: '/freelancer/tasks',
  },
  {
    id: 'profile',
    label: 'Профиль',
    icon: <User className="w-5 h-5" />,
    href: '/freelancer/profile',
  },
]

const commonNavItems: NavItem[] = [
  {
    id: 'notifications',
    label: 'Уведомления',
    icon: <Bell className="w-5 h-5" />,
    href: '/notifications',
  },
]

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const [user, isAuthenticated] = useUnit([authModel.$user, authModel.$isAuthenticated])

  if (!isAuthenticated) return null

  const userType = user?.user_type || 'CLIENT'
  const navItems = userType === 'CLIENT' ? customerNavItems : freelancerNavItems

  return (
    <aside className={cn('w-64 bg-sidebar border-r border-border h-full flex flex-col', className)}>
      <div className="p-6 flex-1">
        {/* Logo */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">DM</span>
          </div>
          <h2 className="text-lg font-bold text-sidebar-foreground">DevMatch AI</h2>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          <div className="space-y-1">
            {navItems.map(item => (
              <Button
                key={item.id}
                variant="ghost"
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-active hover:text-sidebar-foreground"
                onClick={() => {
                  // Navigate to item.href
                  window.location.href = item.href
                }}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </Button>
            ))}
          </div>

          <div className="border-t border-border/50 pt-4 mt-4">
            <div className="space-y-1">
              {commonNavItems.map(item => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-active hover:text-sidebar-foreground"
                  onClick={() => {
                    // Navigate to item.href
                    window.location.href = item.href
                  }}
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </nav>
      </div>

      {/* User Info */}
      <div className="p-6 border-t border-border/50">
        <div className="bg-sidebar-active/20 rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.email || 'User'}
              </p>
              <p className="text-xs text-sidebar-foreground/70">
                {userType === 'CLIENT' ? 'Заказчик' : 'Исполнитель'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
