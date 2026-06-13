import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Expense, Income, Installment, PaymentSource } from '../types';

const userCollection = (userId: string, collectionName: string) => collection(db, 'users', userId, collectionName);

export async function addIncome(userId: string, data: Omit<Income, 'id'>) {
  return addDoc(userCollection(userId, 'income'), {
    ...data,
    amount: Number(data.amount),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function addExpense(userId: string, data: Omit<Expense, 'id'>) {
  return addDoc(userCollection(userId, 'expenses'), {
    ...data,
    amount: Number(data.amount),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function addPaymentSource(userId: string, data: Omit<PaymentSource, 'id'>) {
  return addDoc(userCollection(userId, 'paymentSources'), {
    ...data,
    billingCycleDate: data.billingCycleDate ? Number(data.billingCycleDate) : null,
    paymentDueDate: data.paymentDueDate ? Number(data.paymentDueDate) : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function addInstallment(userId: string, data: Omit<Installment, 'id'>) {
  const paidMonths = Number(data.paidMonths || 0);
  const totalMonths = Number(data.totalMonths || 0);
  const remainingMonths = Math.max(totalMonths - paidMonths, 0);

  return addDoc(userCollection(userId, 'installments'), {
    ...data,
    totalAmount: Number(data.totalAmount),
    monthlyAmount: Number(data.monthlyAmount),
    totalMonths,
    paidMonths,
    remainingMonths,
    dueDate: Number(data.dueDate),
    status: remainingMonths <= 0 ? 'completed' : 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateInstallmentPaidThisMonth(userId: string, item: Installment) {
  if (item.status === 'completed') return;

  const nextPaidMonths = Math.min(item.totalMonths, item.paidMonths + 1);
  const nextRemainingMonths = Math.max(item.totalMonths - nextPaidMonths, 0);

  return updateDoc(doc(db, 'users', userId, 'installments', item.id), {
    paidMonths: nextPaidMonths,
    remainingMonths: nextRemainingMonths,
    status: nextRemainingMonths === 0 ? 'completed' : 'active',
    isPaidThisMonth: true,
    updatedAt: serverTimestamp(),
  });
}

export async function updateExpenseStatus(userId: string, item: Expense, status: 'paid' | 'unpaid') {
  return updateDoc(doc(db, 'users', userId, 'expenses', item.id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function removeDocument(userId: string, collectionName: string, id: string) {
  return deleteDoc(doc(db, 'users', userId, collectionName, id));
}

export async function resetAllUserData(userId: string) {
  const batch = writeBatch(db);
  const collectionNames = ['income', 'expenses', 'paymentSources', 'installments'];

  const snapshots = await Promise.all(
    collectionNames.map((collectionName) => getDocs(userCollection(userId, collectionName)))
  );

  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((documentSnapshot) => {
      batch.delete(documentSnapshot.ref);
    });
  });

  return batch.commit();
}

export async function seedDemoData(userId: string) {
  const batch = writeBatch(db);
  const now = serverTimestamp();

  const sources = [
    { id: 'source_shopee', name: 'Shopee', type: 'marketplace', paymentDueDate: 25 },
    { id: 'source_creditcard', name: 'Credit Card', type: 'credit_card', billingCycleDate: 15, paymentDueDate: 5 },
    { id: 'source_paylater', name: 'PayLater', type: 'paylater', paymentDueDate: 20 },
  ];

  sources.forEach((source) => {
    batch.set(doc(db, 'users', userId, 'paymentSources', source.id), {
      ...source,
      createdAt: now,
      updatedAt: now,
    });
  });

  const income: Omit<Income, 'id'>[] = [
    { title: 'เงินเดือน', amount: 29000, category: 'เงินเดือน', receiveDate: new Date().toISOString().slice(0, 10), isRecurring: true },
  ];

  income.forEach((item) => {
    batch.set(doc(userCollection(userId, 'income')), { ...item, createdAt: now, updatedAt: now });
  });

  const expenses: Omit<Expense, 'id'>[] = [
    { title: 'ค่าเช่าคอนโด', amount: 6500, category: 'ที่พัก', dueDate: new Date().toISOString().slice(0, 10), isRecurring: true, status: 'unpaid' },
    { title: 'ค่าอาหาร', amount: 7000, category: 'อาหาร', dueDate: new Date().toISOString().slice(0, 10), isRecurring: true, status: 'unpaid' },
    { title: 'ค่าอินเทอร์เน็ต', amount: 1000, category: 'โทรศัพท์ / อินเทอร์เน็ต', dueDate: new Date().toISOString().slice(0, 10), isRecurring: true, status: 'unpaid' },
    { title: 'ค่าแมว', amount: 2000, category: 'อื่น ๆ', dueDate: new Date().toISOString().slice(0, 10), isRecurring: true, status: 'unpaid' },
  ];

  expenses.forEach((item) => {
    batch.set(doc(userCollection(userId, 'expenses')), { ...item, createdAt: now, updatedAt: now });
  });

  const startMonth = new Date().toISOString().slice(0, 7);
  const installments: Omit<Installment, 'id'>[] = [
    { title: 'หูฟัง', sourceId: 'source_shopee', sourceName: 'Shopee', totalAmount: 2500, monthlyAmount: 500, totalMonths: 5, paidMonths: 0, remainingMonths: 5, startMonth, dueDate: 25, status: 'active', isPaidThisMonth: false },
    { title: 'เครื่องดูดฝุ่น', sourceId: 'source_shopee', sourceName: 'Shopee', totalAmount: 3600, monthlyAmount: 1200, totalMonths: 3, paidMonths: 0, remainingMonths: 3, startMonth, dueDate: 25, status: 'active', isPaidThisMonth: false },
    { title: 'มือถือ', sourceId: 'source_creditcard', sourceName: 'Credit Card', totalAmount: 9000, monthlyAmount: 1500, totalMonths: 6, paidMonths: 0, remainingMonths: 6, startMonth, dueDate: 5, status: 'active', isPaidThisMonth: false },
    { title: 'เสื้อผ้า', sourceId: 'source_paylater', sourceName: 'PayLater', totalAmount: 1200, monthlyAmount: 300, totalMonths: 4, paidMonths: 0, remainingMonths: 4, startMonth, dueDate: 20, status: 'active', isPaidThisMonth: false },
  ];

  installments.forEach((item) => {
    batch.set(doc(userCollection(userId, 'installments')), { ...item, createdAt: now, updatedAt: now });
  });

  return batch.commit();
}
