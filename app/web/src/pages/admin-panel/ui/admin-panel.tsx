import { useUnit } from 'effector-react'
import { adminPanelModel } from '../model/admin-panel-model'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card'
import { Button } from '@shared/ui/button'
import { 
  Users, 
  Brain, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Download,
  Settings,
  BarChart3,
  DollarSign
} from 'lucide-react'

export const AdminPanel = () => {
  const {
    $systemOverview,
    $aiPerformance,
    $developerPool,
    $financialReport,
    $isLoading,
    modelVersionUpdated,
  } = adminPanelModel

  const [systemOverview, aiPerformance, developerPool, financialReport, isLoading] = useUnit([
    $systemOverview,
    $aiPerformance,
    $developerPool,
    $financialReport,
    $isLoading,
  ])

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'operational': return 'text-green-600 bg-green-100'
      case 'degraded': return 'text-yellow-600 bg-yellow-100'
      case 'down': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'operational': return <CheckCircle className="w-4 h-4" />
      case 'degraded': return <AlertTriangle className="w-4 h-4" />
      case 'down': return <AlertTriangle className="w-4 h-4" />
      default: return <Shield className="w-4 h-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemOverview.activeUsers}</div>
            <p className="text-xs text-muted-foreground">+12% from last hour</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks in System</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemOverview.tasksInSystem}</div>
            <p className="text-xs text-muted-foreground">+5% from last hour</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Success Rate</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemOverview.aiSuccessRate}%</div>
            <p className="text-xs text-muted-foreground">+2% from last hour</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`flex items-center space-x-2 px-2 py-1 rounded-full text-sm font-medium ${getHealthColor(systemOverview.systemHealth)}`}>
              {getHealthIcon(systemOverview.systemHealth)}
              <span className="capitalize">{systemOverview.systemHealth}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Performance Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle>AI Performance Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Accuracy</span>
                <span className="text-sm text-gray-600">{aiPerformance.accuracy}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${aiPerformance.accuracy}%` }}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">False Positive Rate</span>
                <span className="text-sm text-gray-600">{aiPerformance.falsePositiveRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full" 
                  style={{ width: `${aiPerformance.falsePositiveRate}%` }}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">False Negative Rate</span>
                <span className="text-sm text-gray-600">{aiPerformance.falseNegativeRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full" 
                  style={{ width: `${aiPerformance.falseNegativeRate}%` }}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Learning Progress</span>
                <span className="text-sm text-gray-600">{aiPerformance.learningProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${aiPerformance.learningProgress}%` }}
                />
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Model Version</span>
                <span className="text-sm text-gray-600">{aiPerformance.modelVersion}</span>
              </div>
              <Button size="sm" className="mt-2" onClick={() => modelVersionUpdated('v2.1.0')}>
                <Settings className="w-3 h-3 mr-1" />
                Update Model
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Developer Pool Management */}
        <Card>
          <CardHeader>
            <CardTitle>Developer Pool Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{developerPool.totalDevelopers}</div>
                <div className="text-sm text-gray-600">Total Developers</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{developerPool.availableDevelopers}</div>
                <div className="text-sm text-gray-600">Available</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average Rating</span>
                <span className="text-sm text-gray-600">{developerPool.averageRating}/5</span>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Skill Gaps</h4>
              <div className="space-y-2">
                {developerPool.skillGaps.map((gap, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{gap.skill}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Demand: {gap.demand}</span>
                      <span className="text-xs text-gray-500">Supply: {gap.supply}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Financial Reports</CardTitle>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline">
                <Download className="w-3 h-3 mr-1" />
                Export CSV
              </Button>
              <Button size="sm" variant="outline">
                <BarChart3 className="w-3 h-3 mr-1" />
                Generate Report
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">${financialReport.totalRevenue}</div>
              <div className="text-sm text-gray-600">Total Revenue</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">${financialReport.monthlyRevenue}</div>
              <div className="text-sm text-gray-600">Monthly Revenue</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">${financialReport.pendingPayouts}</div>
              <div className="text-sm text-gray-600">Pending Payouts</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">${financialReport.completedPayouts}</div>
              <div className="text-sm text-gray-600">Completed Payouts</div>
            </div>
          </div>
          
          <div className="mt-6 space-y-4">
            <h4 className="text-sm font-medium">Recent Transactions</h4>
            <div className="space-y-2">
              {[
                { id: 'TXN-001', amount: 150, status: 'completed', date: '2024-01-15' },
                { id: 'TXN-002', amount: 200, status: 'pending', date: '2024-01-14' },
                { id: 'TXN-003', amount: 180, status: 'completed', date: '2024-01-13' },
              ].map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-sm font-medium">{txn.id}</span>
                      <span className="text-xs text-gray-500 ml-2">${txn.amount}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      txn.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {txn.status}
                    </span>
                    <span className="text-xs text-gray-500">{txn.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
