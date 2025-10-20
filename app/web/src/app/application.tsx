import { router } from '../shared/router/router'
import { Pages } from '../pages/index'
import { RouterProvider } from 'atomic-router-react'
import { MainLayout } from '@shared/layout'

const AppContent = () => {
  return (
    <MainLayout>
      <Pages />
    </MainLayout>
  )
}

export const App = () => {
  return (
    <RouterProvider router={router}>
      <AppContent />
    </RouterProvider>
  )
}
