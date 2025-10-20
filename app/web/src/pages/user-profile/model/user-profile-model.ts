import { createStore, createEvent } from 'effector'

export interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  bio?: string
  location?: string
  website?: string
  role: 'customer' | 'developer' | 'admin'
  createdAt: string
}

export interface Skill {
  name: string
  level: number
  category: 'frontend' | 'backend' | 'devops' | 'ai-ml' | 'design' | 'other'
}

export interface DeveloperStats {
  tasksCompleted: number
  averageRating: number
  acceptanceRate: number
  totalEarned: number
  responseTime: string
  reputationScore: number
}

export interface Review {
  id: string
  taskId: string
  rating: number
  comment: string
  reviewer: string
  createdAt: string
  response?: string
}

export interface NotificationPreferences {
  email: boolean
  push: boolean
  sms: boolean
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
}

export const profileLoaded = createEvent<UserProfile>()
export const skillsLoaded = createEvent<Skill[]>()
export const statsLoaded = createEvent<DeveloperStats>()
export const reviewsLoaded = createEvent<Review[]>()
export const preferencesLoaded = createEvent<NotificationPreferences>()
export const profileUpdated = createEvent<Partial<UserProfile>>()
export const skillUpdated = createEvent<{ name: string; level: number }>()
export const preferencesUpdated = createEvent<Partial<NotificationPreferences>>()
export const reviewResponded = createEvent<{ reviewId: string; response: string }>()

export const $profile = createStore<UserProfile | null>(null)
export const $skills = createStore<Skill[]>([])
export const $stats = createStore<DeveloperStats>({
  tasksCompleted: 0,
  averageRating: 0,
  acceptanceRate: 0,
  totalEarned: 0,
  responseTime: '0h',
  reputationScore: 0,
})
export const $reviews = createStore<Review[]>([])
export const $preferences = createStore<NotificationPreferences>({
  email: true,
  push: true,
  sms: false,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
})
export const $isLoading = createStore(false)

$profile.on(profileLoaded, (_, profile) => profile)
$profile.on(profileUpdated, (current, updates) => current ? { ...current, ...updates } : null)
$skills.on(skillsLoaded, (_, skills) => skills)
$skills.on(skillUpdated, (current, { name, level }) => 
  current.map(skill => skill.name === name ? { ...skill, level } : skill)
)
$stats.on(statsLoaded, (_, stats) => stats)
$reviews.on(reviewsLoaded, (_, reviews) => reviews)
$reviews.on(reviewResponded, (current, { reviewId, response }) =>
  current.map(review => review.id === reviewId ? { ...review, response } : review)
)
$preferences.on(preferencesLoaded, (_, preferences) => preferences)
$preferences.on(preferencesUpdated, (current, updates) => ({ ...current, ...updates }))

export const userProfileModel = {
  $profile,
  $skills,
  $stats,
  $reviews,
  $preferences,
  $isLoading,
  profileLoaded,
  skillsLoaded,
  statsLoaded,
  reviewsLoaded,
  preferencesLoaded,
  profileUpdated,
  skillUpdated,
  preferencesUpdated,
  reviewResponded,
}
