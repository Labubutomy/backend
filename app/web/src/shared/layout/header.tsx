import React from 'react'
import { Button } from '@shared/ui'
import { Bell, User, LogOut } from 'lucide-react'
import { useUnit } from 'effector-react'
import { authModel } from '@pages/auth/model/auth-model'

interface HeaderProps {
  className?: string
}

export const Header: React.FC<HeaderProps> = ({ className }) => {
  const [user, isAuthenticated, logoutClicked] = useUnit([
    authModel.$user,
    authModel.$isAuthenticated,
    authModel.logoutClicked,
  ])

  const handleLogout = () => {
    logoutClicked()
  }

  return (
    <header className={`bg-card border-b border-border px-6 py-4 ${className}`}>
      <div className="flex items-center justify-between">
        {/* Logo - only for non-authenticated users */}
        {!isAuthenticated && (
          <div className="flex items-center space-x-3">
            <div
              className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center cursor-pointer"
              onClick={() => (window.location.href = '/')}
            >
              <span className="text-white font-bold text-sm">DM</span>
            </div>
            <h1
              className="text-xl font-bold text-foreground cursor-pointer"
              onClick={() => (window.location.href = '/')}
            >
              DevMatch AI
            </h1>
          </div>
        )}

        {/* Right side - always on the right */}
        <div className="flex items-center space-x-4 ml-auto">
          {isAuthenticated ? (
            <>
              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => (window.location.href = '/notifications')}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
              </Button>

              {/* User Menu */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-foreground">
                    {user?.email || 'Пользователь'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.user_type === 'CLIENT'
                      ? 'Заказчик'
                      : user?.user_type === 'DEVELOPER'
                        ? 'Исполнитель'
                        : user?.user_type || 'Пользователь'}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" onClick={() => (window.location.href = '/login')}>
                Войти
              </Button>
              <Button variant="gradient" onClick={() => (window.location.href = '/signup')}>
                Регистрация
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
