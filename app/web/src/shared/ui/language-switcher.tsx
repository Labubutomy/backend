import { useT } from '@shared/lib/use-translation'
import { Button } from '@shared/ui/button'
import { Globe } from 'lucide-react'

export const LanguageSwitcher = () => {
  const { changeLanguage, currentLanguage } = useT()

  const toggleLanguage = () => {
    const newLanguage = currentLanguage === 'en' ? 'ru' : 'en'
    changeLanguage(newLanguage)
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleLanguage}>
      <Globe className="h-5 w-5" />
      <span className="sr-only">Switch language</span>
    </Button>
  )
}
