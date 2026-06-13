import { Expense, Income, Installment, MonthlyForecast, PaymentSource } from '../types';

export const thb = (value: number) =>
  new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(value || 0);

const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function formatMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getMonthKey(date = new Date()) {
  return formatMonthKey(date);
}

export function addMonths(monthKey: string, monthsToAdd: number) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + monthsToAdd, 1, 12, 0, 0);
  return formatMonthKey(date);
}

export function monthDiff(startMonth: string, targetMonth: string) {
  const [sy, sm] = startMonth.split('-').map(Number);
  const [ty, tm] = targetMonth.split('-').map(Number);

  if (!sy || !sm || !ty || !tm) return 0;

  return (ty - sy) * 12 + (tm - sm);
}

export function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return `${monthNames[month - 1]} ${year + 543}`;
}

export function totalIncome(income: Income[]) {
  return income.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

export function totalExpenses(expenses: Expense[]) {
  return expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

export function activeInstallments(installments: Installment[]) {
  return installments.filter((item) => item.status === 'active' && Number(item.remainingMonths) > 0);
}

function getPayableStartMonth(item: Installment, forecastStartMonth: string) {
  const itemStartMonth = item.startMonth || forecastStartMonth;

  // ถ้ารายการเริ่มในอนาคต ให้เริ่มจ่ายตาม startMonth จริง
  if (monthDiff(forecastStartMonth, itemStartMonth) > 0) {
    return itemStartMonth;
  }

  // ถ้ารายการเริ่มไปแล้ว และยังมี remainingMonths ให้ถือว่าเดือนนี้ยังเป็นภาระที่ต้องจ่าย
  return forecastStartMonth;
}

function isInstallmentPayableInMonth(item: Installment, targetMonth: string, forecastStartMonth: string) {
  const remainingMonths = Number(item.remainingMonths || 0);

  if (item.status !== 'active' || remainingMonths <= 0) {
    return false;
  }

  const payableStartMonth = getPayableStartMonth(item, forecastStartMonth);
  const elapsedFromPayableStart = monthDiff(payableStartMonth, targetMonth);

  return elapsedFromPayableStart >= 0 && elapsedFromPayableStart < remainingMonths;
}

export function installmentTotalThisMonth(installments: Installment[], monthKey = getMonthKey()) {
  return buildForecast(installments, monthKey, 1)[0]?.total || 0;
}

export function buildForecast(installments: Installment[], startMonth = getMonthKey(), months = 12): MonthlyForecast[] {
  const active = activeInstallments(installments);

  return Array.from({ length: months }, (_, index) => {
    const monthKey = addMonths(startMonth, index);

    const lines = active
      .filter((item) => isInstallmentPayableInMonth(item, monthKey, startMonth))
      .map((item) => ({
        installmentId: item.id,
        title: item.title,
        sourceName: item.sourceName,
        monthlyAmount: Number(item.monthlyAmount || 0),
        dueDate: Number(item.dueDate || 1),
      }));

    const bySource = lines.reduce<Record<string, number>>((acc, line) => {
      acc[line.sourceName] = (acc[line.sourceName] || 0) + line.monthlyAmount;
      return acc;
    }, {});

    const total = lines.reduce((sum, line) => sum + line.monthlyAmount, 0);

    return {
      monthKey,
      monthLabel: monthLabel(monthKey),
      total,
      bySource,
      lines,
    };
  });
}

export function summaryBySource(installments: Installment[], sources: PaymentSource[], monthKey = getMonthKey()) {
  const forecast = buildForecast(installments, monthKey, 1)[0];
  const active = activeInstallments(installments);

  return sources.map((source) => {
    const itemCount = active.filter((item) => item.sourceId === source.id).length;

    return {
      sourceId: source.id,
      name: source.name,
      type: source.type,
      totalThisMonth: forecast?.bySource[source.name] || 0,
      activeCount: itemCount,
    };
  });
}

export function topExpenseCategory(expenses: Expense[]) {
  const byCategory = expenses.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + Number(item.amount || 0);
    return acc;
  }, {});

  return Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
}
