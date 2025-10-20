import { createStore, createEvent } from 'effector'

export interface PaymentMethod {
  id: string
  type: 'card' | 'paypal' | 'crypto'
  last4?: string
  brand?: string
  isDefault: boolean
}

export interface Transaction {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed'
  description: string
  createdAt: string
  taskId?: string
}

export interface Invoice {
  id: string
  amount: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  dueDate: string
  createdAt: string
  downloadUrl: string
}

export const paymentMethodsLoaded = createEvent<PaymentMethod[]>()
export const transactionsLoaded = createEvent<Transaction[]>()
export const invoicesLoaded = createEvent<Invoice[]>()
export const paymentMethodAdded = createEvent<PaymentMethod>()
export const paymentMethodDeleted = createEvent<string>()
export const defaultPaymentMethodSet = createEvent<string>()
export const paymentMade = createEvent<{ taskId: string; amount: number; paymentMethodId: string }>()

export const $paymentMethods = createStore<PaymentMethod[]>([])
export const $transactions = createStore<Transaction[]>([])
export const $invoices = createStore<Invoice[]>([])
export const $isLoading = createStore(false)

$paymentMethods.on(paymentMethodsLoaded, (_, methods) => methods)
$paymentMethods.on(paymentMethodAdded, (current, method) => [...current, method])
$paymentMethods.on(paymentMethodDeleted, (current, id) => current.filter(m => m.id !== id))
$paymentMethods.on(defaultPaymentMethodSet, (current, id) => 
  current.map(m => ({ ...m, isDefault: m.id === id }))
)

$transactions.on(transactionsLoaded, (_, transactions) => transactions)
$transactions.on(paymentMade, (current, payment) => [
  ...current,
  {
    id: `TXN-${Date.now()}`,
    amount: payment.amount,
    currency: 'USD',
    status: 'pending',
    description: `Payment for task ${payment.taskId}`,
    createdAt: new Date().toISOString(),
    taskId: payment.taskId,
  }
])

$invoices.on(invoicesLoaded, (_, invoices) => invoices)

export const billingModel = {
  $paymentMethods,
  $transactions,
  $invoices,
  $isLoading,
  paymentMethodsLoaded,
  transactionsLoaded,
  invoicesLoaded,
  paymentMethodAdded,
  paymentMethodDeleted,
  defaultPaymentMethodSet,
  paymentMade,
}
