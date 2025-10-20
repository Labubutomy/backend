import { createStore, createEvent } from 'effector'

export interface SystemOverview {
  activeUsers: number
  tasksInSystem: number
  aiSuccessRate: number
  systemHealth: 'operational' | 'degraded' | 'down'
}

export interface AIPerformance {
  accuracy: number
  falsePositiveRate: number
  falseNegativeRate: number
  learningProgress: number
  modelVersion: string
}

export interface DeveloperPool {
  totalDevelopers: number
  availableDevelopers: number
  averageRating: number
  skillGaps: Array<{
    skill: string
    demand: number
    supply: number
  }>
}

export interface FinancialReport {
  totalRevenue: number
  monthlyRevenue: number
  pendingPayouts: number
  completedPayouts: number
}

export const systemOverviewLoaded = createEvent<SystemOverview>()
export const aiPerformanceLoaded = createEvent<AIPerformance>()
export const developerPoolLoaded = createEvent<DeveloperPool>()
export const financialReportLoaded = createEvent<FinancialReport>()
export const modelVersionUpdated = createEvent<string>()
export const reportGenerated = createEvent<{ type: string; data: Blob }>()

export const $systemOverview = createStore<SystemOverview>({
  activeUsers: 0,
  tasksInSystem: 0,
  aiSuccessRate: 0,
  systemHealth: 'operational',
})

export const $aiPerformance = createStore<AIPerformance>({
  accuracy: 0,
  falsePositiveRate: 0,
  falseNegativeRate: 0,
  learningProgress: 0,
  modelVersion: '',
})

export const $developerPool = createStore<DeveloperPool>({
  totalDevelopers: 0,
  availableDevelopers: 0,
  averageRating: 0,
  skillGaps: [],
})

export const $financialReport = createStore<FinancialReport>({
  totalRevenue: 0,
  monthlyRevenue: 0,
  pendingPayouts: 0,
  completedPayouts: 0,
})

export const $isLoading = createStore(false)

$systemOverview.on(systemOverviewLoaded, (_, overview) => overview)
$aiPerformance.on(aiPerformanceLoaded, (_, performance) => performance)
$developerPool.on(developerPoolLoaded, (_, pool) => pool)
$financialReport.on(financialReportLoaded, (_, report) => report)

export const adminPanelModel = {
  $systemOverview,
  $aiPerformance,
  $developerPool,
  $financialReport,
  $isLoading,
  systemOverviewLoaded,
  aiPerformanceLoaded,
  developerPoolLoaded,
  financialReportLoaded,
  modelVersionUpdated,
  reportGenerated,
}
