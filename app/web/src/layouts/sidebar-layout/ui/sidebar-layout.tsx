import { Sidebar } from './sidebar/sidebar'

export interface SidebarLayoutProps {
  children: React.ReactNode
}

export const SidebarLayout = ({ children }: SidebarLayoutProps) => {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
