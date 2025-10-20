import { useUnit } from 'effector-react'
import { routes } from '../../config/routes'
import { $isSidebarOpen, toggleSidebar as toggleSidebarEvent } from '../../model/sidebar-model'
import { SidebarItem } from './sidebar-item'
import { ThemeSwitcher } from '@shared/ui/theme-switcher'
import { LanguageSwitcher } from '@shared/ui/language-switcher'
import { ArrowLeftFromLine, ArrowRightFromLine } from 'lucide-react'
import { cva } from 'class-variance-authority'

const sidebar = cva('bg-sidebar shadow-lg text-sidebar-foreground flex h-screen flex-col', {
  variants: {
    type: {
      open: 'w-60',
      closed: 'w-16',
    },
  },
})

export const Sidebar = () => {
  const [isSidebarOpen, toggleSidebar] = useUnit([$isSidebarOpen, toggleSidebarEvent])

  return (
    <aside className={sidebar({ type: isSidebarOpen ? 'open' : 'closed' })}>
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        {isSidebarOpen ? (
          <h1 className="text-xl font-semibold text-sidebar-foreground">DevMatch</h1>
        ) : null}
            <div className="flex items-center space-x-2">
              <LanguageSwitcher />
              <ThemeSwitcher />
              <button onClick={toggleSidebar} type="button">
                {isSidebarOpen ? <ArrowLeftFromLine /> : <ArrowRightFromLine />}
              </button>
            </div>
      </div>

      <ul className="space-y-2 p-3 mt-10">
        {routes.map(route => (
          <SidebarItem key={route.path} {...route} type={isSidebarOpen ? 'open' : 'closed'} />
        ))}
      </ul>
      {isSidebarOpen ? <footer className="mt-auto mb-0">Labubutomia © 2025</footer> : null}
    </aside>
  )
}
