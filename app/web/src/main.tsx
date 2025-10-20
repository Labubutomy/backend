import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { appStarted } from './shared/router/init'
import { App } from './app/application'
import '@shared/styles/global.css'

// Set dark theme by default
document.documentElement.classList.add('dark')

appStarted()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
