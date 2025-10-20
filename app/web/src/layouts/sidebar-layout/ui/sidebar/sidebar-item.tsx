import { useUnit } from 'effector-react'
import { $currentRoute } from '../../model/sidebar-model'
import { Link } from 'atomic-router-react'
import { cva } from 'class-variance-authority'

interface SidebarItemProps {
  path: string
  icon: React.ReactNode
  label: string
  type: 'open' | 'closed'
}

const sidebarItem = cva('flex items-center p-2 text-base font-normal rounded-lg', {
  variants: {
    variant: {
      default: '',
      active: 'bg-primary text-primary-foreground',
    },
    type: {
      open: '',
      closed: 'label:hidden',
    },
  },
  defaultVariants: {
    variant: 'default',
    type: 'open',
  },
})

export const SidebarItem = ({ path, icon, label, type }: SidebarItemProps) => {
  const currentRoute = useUnit($currentRoute)
  const isActive = currentRoute === path

  return (
    <li>
      <Link
        to={path}
        className={sidebarItem({ variant: isActive ? 'active' : 'default', type: type })}
      >
        <span>{icon}</span>
        {type === 'closed' ? null : <label className="ml-3">{label}</label>}
      </Link>
    </li>
  )
}
