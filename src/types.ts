export type SourceType = 'marketplace' | 'credit_card' | 'paylater' | 'loan' | 'rent' | 'other';
export type PaidStatus = 'paid' | 'unpaid';
export type InstallmentStatus = 'active' | 'completed';

export interface AppUser {
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt?: unknown;
  lastLoginAt?: unknown;
}

export interface Income {
  id: string;
  title: string;
  amount: number;
  category: string;
  receiveDate: string;
  isRecurring: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  dueDate: string;
  isRecurring: boolean;
  status: PaidStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PaymentSource {
  id: string;
  name: string;
  type: SourceType;
  billingCycleDate?: number;
  paymentDueDate?: number;
  note?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Installment {
  id: string;
  title: string;
  sourceId: string;
  sourceName: string;
  totalAmount: number;
  monthlyAmount: number;
  totalMonths: number;
  paidMonths: number;
  remainingMonths: number;
  startMonth: string; // YYYY-MM
  dueDate: number; // day of month
  status: InstallmentStatus;
  isPaidThisMonth: boolean;
  note?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ForecastLine {
  installmentId: string;
  title: string;
  sourceName: string;
  monthlyAmount: number;
  dueDate: number;
}

export interface MonthlyForecast {
  monthKey: string;
  monthLabel: string;
  total: number;
  bySource: Record<string, number>;
  lines: ForecastLine[];
}
