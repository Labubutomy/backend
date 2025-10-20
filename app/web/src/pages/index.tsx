import { createRoutesView } from 'atomic-router-react'
import { routes } from '@shared/router/router'
import { LandingPage } from './landing'
import { AuthPage } from './auth'
import { CustomerDashboard } from './customer-dashboard'
import { CreateTaskPage } from './task-details/ui/create-task-page'
import { TaskDetailsPage } from './task-details/ui/task-details-page'
import { DeveloperDashboard } from './developer-dashboard'
import { FreelancerTasksPage } from './matching/ui/matching-page'
import { FreelancerProfilePage } from './user-profile/ui/user-profile'
import { CustomerFreelancersPage } from './customer-freelancers'
import { CustomerProfilePage } from './customer-profile'
import { Notifications } from './notifications'

// Debug component to see what's happening
const DebugPages = () => {
  console.log('Pages component rendered')
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Debug: Pages Component</h1>
      <p>If you see this, the Pages component is working.</p>
      <p>Current URL: {window.location.pathname}</p>
    </div>
  )
}

export const Pages = createRoutesView({
  routes: [
    { route: routes.landing, view: LandingPage },
    { route: routes.login, view: AuthPage },
    { route: routes.signup, view: AuthPage },
    { route: routes.customerDashboard, view: CustomerDashboard },
    { route: routes.customerCreateTask, view: CreateTaskPage },
    { route: routes.customerTaskDetails, view: TaskDetailsPage },
    { route: routes.customerFreelancers, view: CustomerFreelancersPage },
    { route: routes.customerProfile, view: CustomerProfilePage },
    { route: routes.freelancerDashboard, view: DeveloperDashboard },
    { route: routes.freelancerTasks, view: FreelancerTasksPage },
    { route: routes.freelancerTaskDetails, view: TaskDetailsPage },
    { route: routes.freelancerProfile, view: FreelancerProfilePage },
    { route: routes.notifications, view: Notifications },
    // Legacy routes
    { route: routes.auth, view: AuthPage },
    { route: routes.taskDetails, view: TaskDetailsPage },
    { route: routes.createTask, view: CreateTaskPage },
    { route: routes.developerDashboard, view: DeveloperDashboard },
    { route: routes.matching, view: FreelancerTasksPage },
    { route: routes.userProfile, view: FreelancerProfilePage },
    { route: routes.billing, view: DebugPages },
  ],
  otherwise: DebugPages, // Show debug component if no route matches
})
