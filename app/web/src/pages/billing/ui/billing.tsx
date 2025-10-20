import { useUnit } from 'effector-react'
import { billingModel } from '../model/billing-model'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card'
import { Button } from '@shared/ui/button'
import { CreditCard, Plus, Trash2, Download, DollarSign, FileText } from 'lucide-react'

export const Billing = () => {
  const {
    $paymentMethods,
    $transactions,
    $invoices,
    $isLoading,
    paymentMethodDeleted,
    defaultPaymentMethodSet,
  } = billingModel

  const [paymentMethods, transactions, invoices, isLoading] = useUnit([
    $paymentMethods,
    $transactions,
    $invoices,
    $isLoading,
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      case 'paid':
        return 'text-green-600 bg-green-100'
      case 'overdue':
        return 'text-red-600 bg-red-100'
      case 'sent':
        return 'text-blue-600 bg-blue-100'
      case 'draft':
        return 'text-gray-600 bg-gray-100'
      default:
        return 'text-gray-600 bg-gray-100'
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
      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Methods</CardTitle>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentMethods.map(method => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <CreditCard className="w-6 h-6 text-gray-400" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium capitalize">{method.type}</span>
                      {method.isDefault && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    {method.last4 && (
                      <span className="text-sm text-gray-600">**** **** **** {method.last4}</span>
                    )}
                    {method.brand && <span className="text-sm text-gray-600">{method.brand}</span>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!method.isDefault && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => defaultPaymentMethodSet(method.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => paymentMethodDeleted(method.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {paymentMethods.length === 0 && (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No payment methods</h3>
                <p className="text-gray-600 mb-4">Add a payment method to get started</p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Payment Method
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.map(transaction => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-sm font-medium">{transaction.description}</span>
                      <div className="text-xs text-gray-500">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">${transaction.amount}</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}
                    >
                      {transaction.status}
                    </span>
                  </div>
                </div>
              ))}

              {transactions.length === 0 && (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                  <p className="text-gray-600">Your payment history will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoices & Receipts */}
        <Card>
          <CardHeader>
            <CardTitle>Invoices & Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices.map(invoice => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="text-sm font-medium">Invoice #{invoice.id}</span>
                      <div className="text-xs text-gray-500">
                        Due: {new Date(invoice.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">${invoice.amount}</span>
                    <div className="flex items-center space-x-1">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}
                      >
                        {invoice.status}
                      </span>
                      <Button size="sm" variant="outline">
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {invoices.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
                  <p className="text-gray-600">Your invoices will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Payment */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Task #123</h4>
                <p className="text-sm text-gray-600 mb-3">Create auth service</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">$150.00</span>
                  <Button size="sm">Pay Now</Button>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Task #124</h4>
                <p className="text-sm text-gray-600 mb-3">Fix responsive layout</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">$200.00</span>
                  <Button size="sm">Pay Now</Button>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Task #125</h4>
                <p className="text-sm text-gray-600 mb-3">Add unit tests</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">$120.00</span>
                  <Button size="sm">Pay Now</Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
