import { useUnit } from 'effector-react'
import { themeModel } from '@shared/lib/theme'
import { Button } from '@shared/ui/button'
import { Sun, Moon, Monitor } from 'lucide-react'

export const ThemeSwitcher = () => {
  const { $theme, themeChanged } = themeModel
  const theme = useUnit($theme)

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />
      case 'dark':
        return <Moon className="w-4 h-4" />
      case 'system':
        return <Monitor className="w-4 h-4" />
      default:
        return <Monitor className="w-4 h-4" />
    }
  }

  const cycleTheme = () => {
    switch (theme) {
      case 'light':
        themeChanged('dark')
        break
      case 'dark':
        themeChanged('system')
        break
      case 'system':
        themeChanged('light')
        break
      default:
        themeChanged('light')
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycleTheme}
      className="w-9 h-9 p-0"
      title={`Current theme: ${theme}`}
    >
      {getIcon()}
    </Button>
  )
}
