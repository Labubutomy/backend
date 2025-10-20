import { useTranslation } from 'react-i18next'

export const useT = () => {
  const { t, i18n } = useTranslation()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  const currentLanguage = i18n.language

  return {
    t,
    changeLanguage,
    currentLanguage,
    isRTL: false, // We don't support RTL languages yet
  }
}
