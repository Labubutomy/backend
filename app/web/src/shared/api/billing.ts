import { api } from './base'

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

export const billingApi = {
  getPaymentMethods: () =>
    api.get<PaymentMethod[]>('/billing/payment-methods'),
  
  addPaymentMethod: (data: { type: string; token: string }) =>
    api.post<PaymentMethod>('/billing/payment-methods', data),
  
  setDefaultPaymentMethod: (id: string) =>
    api.put(`/billing/payment-methods/${id}/default`),
  
  deletePaymentMethod: (id: string) =>
    api.delete(`/billing/payment-methods/${id}`),
  
  getTransactions: (params?: { limit?: number; offset?: number }) =>
    api.get<Transaction[]>('/billing/transactions', { params }),
  
  getInvoices: () =>
    api.get<Invoice[]>('/billing/invoices'),
  
  downloadInvoice: (id: string) =>
    api.get(`/billing/invoices/${id}/download`, { responseType: 'blob' }),
  
  makePayment: (data: { taskId: string; amount: number; paymentMethodId: string }) =>
    api.post('/billing/payments', data),
}
