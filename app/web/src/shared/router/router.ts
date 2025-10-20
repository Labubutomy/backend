import { createHistoryRouter, createRoute } from 'atomic-router'
import { appStarted } from './init'
import { createBrowserHistory } from 'history'
import { sample } from 'effector'

export const routes = {
  // Public routes
  landing: createRoute(),
  login: createRoute(),
  signup: createRoute(),

  // Customer routes
  customerDashboard: createRoute(),
  customerCreateTask: createRoute(),
  customerTaskDetails: createRoute<{ id: string }>(),
  customerFreelancers: createRoute(),
  customerProfile: createRoute(),

  // Freelancer routes
  freelancerDashboard: createRoute(),
  freelancerTasks: createRoute(),
  freelancerTaskDetails: createRoute<{ id: string }>(),
  freelancerProfile: createRoute(),

  // Common routes
  notifications: createRoute(),

  // Legacy routes (for backward compatibility)
  auth: createRoute(),
  taskDetails: createRoute<{ id: string }>(),
  createTask: createRoute(),
  developerDashboard: createRoute(),
  matching: createRoute(),
  userProfile: createRoute(),
  billing: createRoute(),
}

export const mappedRoutes = [
  // Public routes
  { route: routes.landing, path: '/' },
  { route: routes.login, path: '/login' },
  { route: routes.signup, path: '/signup' },

  // Customer routes
  { route: routes.customerDashboard, path: '/customer/dashboard' },
  { route: routes.customerCreateTask, path: '/customer/tasks/new' },
  { route: routes.customerTaskDetails, path: '/customer/tasks/:id' },
  { route: routes.customerFreelancers, path: '/customer/freelancers' },
  { route: routes.customerProfile, path: '/customer/profile' },

  // Freelancer routes
  { route: routes.freelancerDashboard, path: '/freelancer/dashboard' },
  { route: routes.freelancerTasks, path: '/freelancer/tasks' },
  { route: routes.freelancerTaskDetails, path: '/freelancer/tasks/:id' },
  { route: routes.freelancerProfile, path: '/freelancer/profile' },

  // Common routes
  { route: routes.notifications, path: '/notifications' },

  // Legacy routes (for backward compatibility)
  { route: routes.auth, path: '/auth' },
  { route: routes.taskDetails, path: '/tasks/:id' },
  { route: routes.createTask, path: '/tasks/create' },
  { route: routes.developerDashboard, path: '/developer/dashboard' },
  { route: routes.matching, path: '/matching' },
  { route: routes.userProfile, path: '/profile' },
  { route: routes.billing, path: '/billing' },
]

export const router = createHistoryRouter({
  routes: mappedRoutes,
})

sample({
  clock: appStarted,
  fn: () => createBrowserHistory(),
  target: router.setHistory,
})
