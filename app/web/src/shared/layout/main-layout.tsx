import React from 'react'
import { cn } from '@shared/lib/utils'

interface MainLayoutProps {
  children: React.ReactNode
  className?: string
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, className }) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header />

          {/* Page Content */}
          <main className={cn('flex-1 overflow-auto p-6', className)}>{children}</main>
        </div>
      </div>
    </div>
  )
}

// Import Sidebar and Header components
import { Sidebar } from './sidebar'
import { Header } from './header'
