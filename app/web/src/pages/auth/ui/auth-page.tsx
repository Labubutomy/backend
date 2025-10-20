import React from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@shared/ui'
import { useUnit } from 'effector-react'
import { authModel } from '../model/auth-model'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { routes } from '@shared/router/router'

export const AuthPage: React.FC = () => {
  const {
    $authMode,
    $isLoading,
    $authError,
    $isAuthenticated,
    $user,
    authModeChanged,
    authSubmitted,
    authErrorCleared,
  } = authModel
  const [authMode, isLoading, authError, isAuthenticated, user] = useUnit([
    $authMode,
    $isLoading,
    $authError,
    $isAuthenticated,
    $user,
  ])

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [displayName, setDisplayName] = React.useState('')
  const [userType, setUserType] = React.useState<'CLIENT' | 'DEVELOPER'>('CLIENT')
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  // Set auth mode based on URL
  React.useEffect(() => {
    const path = window.location.pathname
    if (path === '/signup') {
      authModeChanged('register')
    } else if (path === '/login') {
      authModeChanged('login')
    }
  }, [authModeChanged])

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.user_type === 'CLIENT') {
        routes.customerDashboard.open()
      } else {
        routes.freelancerDashboard.open()
      }
    }
  }, [isAuthenticated, user])

  // Show loading if checking authentication
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (authMode === 'login') {
      authSubmitted({ email, password, userType })
    } else {
      if (password !== confirmPassword) {
        return
      }
      authSubmitted({ email, password, userType, displayName })
    }
  }

  const toggleAuthMode = () => {
    authModeChanged(authMode === 'login' ? 'register' : 'login')
    authErrorCleared()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 gradient-bg rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">DM</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">DevMatch AI</h1>
          <p className="text-muted-foreground mt-2">
            {authMode === 'login' ? 'Добро пожаловать обратно' : 'Создайте аккаунт'}
          </p>
        </div>

        <Card className="task-card">
          <CardHeader>
            <CardTitle className="text-center">
              {authMode === 'login' ? 'Вход в систему' : 'Регистрация'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {authError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
                  {authError}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => authErrorCleared()}
                    className="ml-2 h-auto p-0 text-destructive hover:text-destructive"
                  >
                    ✕
                  </Button>
                </div>
              )}

              {authMode === 'register' && (
                <div>
                  <label
                    htmlFor="displayName"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Имя
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Ваше имя"
                      className="pl-10"
                      required={authMode === 'register'}
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authMode === 'register' && (
                <>
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-foreground mb-2"
                    >
                      Подтвердите пароль
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        required={authMode === 'register'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Тип аккаунта
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setUserType('CLIENT')}
                        className={`p-3 text-sm rounded-lg border transition-colors ${
                          userType === 'CLIENT'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card text-foreground hover:bg-muted'
                        }`}
                      >
                        <User className="w-4 h-4 mx-auto mb-1" />
                        Заказчик
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserType('DEVELOPER')}
                        className={`p-3 text-sm rounded-lg border transition-colors ${
                          userType === 'DEVELOPER'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card text-foreground hover:bg-muted'
                        }`}
                      >
                        <User className="w-4 h-4 mx-auto mb-1" />
                        Разработчик
                      </button>
                    </div>
                  </div>
                </>
              )}

              <Button
                type="submit"
                className="w-full"
                loading={isLoading}
                disabled={isLoading || (authMode === 'register' && password !== confirmPassword)}
              >
                {authMode === 'login' ? 'Войти' : 'Создать аккаунт'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                {authMode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                <button
                  type="button"
                  onClick={toggleAuthMode}
                  className="ml-1 text-primary hover:underline font-medium"
                >
                  {authMode === 'login' ? 'Зарегистрироваться' : 'Войти'}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
