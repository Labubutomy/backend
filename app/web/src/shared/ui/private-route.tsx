import { useUnit } from 'effector-react'
import { authModel } from '@pages/auth/model/auth-model'
import { useEffect } from 'react'

interface PrivateRouteProps {
  children: React.ReactNode
  requiredRole?: 'CLIENT' | 'DEVELOPER' | 'ADMIN'
}

export const PrivateRoute = ({ children, requiredRole }: PrivateRouteProps) => {
  const [isAuthenticated, user, isLoading] = useUnit([
    authModel.$isAuthenticated,
    authModel.$user,
    authModel.$isLoading,
  ])

  // Debug logging
  console.log('PrivateRoute state:', { isAuthenticated, user, isLoading, requiredRole })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('Redirecting to auth page')
      // Use window.location to avoid infinite loops
      window.location.href = '/auth'
    }
  }, [isAuthenticated, isLoading])

  // Prevent infinite re-renders
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    console.log('Showing loading state')
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    console.log('Not authenticated, showing loading while redirecting')
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (requiredRole && user?.user_type !== requiredRole) {
    console.log('Access denied for role:', user?.user_type, 'required:', requiredRole)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  console.log('Rendering children')
  return <>{children}</>
}
