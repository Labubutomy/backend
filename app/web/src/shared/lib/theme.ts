import { createStore, createEvent, createEffect } from 'effector'

export type Theme = 'light' | 'dark' | 'system'

export const themeChanged = createEvent<Theme>()

// Load theme from localStorage on init
const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null
export const $theme = createStore<Theme>((savedTheme as Theme) || 'system')

// Effect to apply theme to document
const applyThemeFx = createEffect<Theme, void>(theme => {
  const root = document.documentElement

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  } else {
    root.classList.toggle('dark', theme === 'dark')
  }

  // Save to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('theme', theme)
  }
})

// Listen to system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentTheme = $theme.getState()
    if (currentTheme === 'system') {
      applyThemeFx('system')
    }
  })
}

$theme.on(themeChanged, (_, theme) => theme)

// Apply theme when it changes
$theme.watch(applyThemeFx)

export const themeModel = {
  $theme,
  themeChanged,
}
