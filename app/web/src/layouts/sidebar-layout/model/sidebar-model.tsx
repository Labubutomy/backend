import { createEvent, createStore, sample } from 'effector'
import { router } from '../../../shared/router/router'
import { persist } from 'effector-storage/local'

export const $currentRoute = createStore<string>('/')

sample({
  clock: router.$path,
  fn: path => path || '/',
  target: $currentRoute,
})

export const toggleSidebar = createEvent()

export const $isSidebarOpen = createStore(true)

persist({
  store: $isSidebarOpen,
  key: 'sidebar-open',
})

sample({
  clock: toggleSidebar,
  source: $isSidebarOpen,
  fn: isOpen => !isOpen,
  target: $isSidebarOpen,
})
