import { FormEvent, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './hooks/useAuth';
import { useUserCollection } from './hooks/useCollection';
import { Expense, Income, Installment, PaymentSource, SourceType } from './types';
import {
  addExpense,
  addIncome,
  addInstallment,
  addPaymentSource,
  removeDocument,
  seedDemoData,
  updateExpenseStatus,
  updateInstallmentPaidThisMonth,
} from './services/firestore';
import {
  activeInstallments,
  buildForecast,
  getMonthKey,
  installmentTotalThisMonth,
  summaryBySource,
  thb,
  topExpenseCategory,
  totalExpenses,
  totalIncome,
} from './utils/calculations';

type Tab = 'dashboard' | 'income' | 'expense' | 'sources' | 'installments' | 'forecast' | 'calendar' | 'settings';

const expenseCategories = ['ที่พัก', 'อาหาร', 'เดินทาง', 'โทรศัพท์ / อินเทอร์เน็ต', 'บัตรเครดิต', 'ผ่อนชำระ', 'สุขภาพ', 'ช้อปปิ้ง', 'อื่น ๆ'];
const incomeCategories = ['เงินเดือน', 'ฟรีแลนซ์', 'โบนัส', 'รายได้เสริม', 'อื่น ๆ'];
const sourceTypes: { label: string; value: SourceType }[] = [
  { label: 'Marketplace', value: 'marketplace' },
  { label: 'Credit Card', value: 'credit_card' },
  { label: 'PayLater', value: 'paylater' },
  { label: 'Loan', value: 'loan' },
  { label: 'Rent', value: 'rent' },
  { label: 'Other', value: 'other' },
];

function App() {
  const { user, loading, authError, loginWithGoogle, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [toast, setToast] = useState('');

  const userId = user?.uid;
  const incomeState = useUserCollection<Income>(userId, 'income');
  const expenseState = useUserCollection<Expense>(userId, 'expenses');
  const sourceState = useUserCollection<PaymentSource>(userId, 'paymentSources');
  const installmentState = useUserCollection<Installment>(userId, 'installments');

  const income = incomeState.data;
  const expenses = expenseState.data;
  const sources = sourceState.data;
  const installments = installmentState.data;

  const thisMonth = getMonthKey();
  const incomeTotal = totalIncome(income);
  const expenseTotal = totalExpenses(expenses);
  const installmentTotal = installmentTotalThisMonth(installments, thisMonth);
  const balance = incomeTotal - expenseTotal - installmentTotal;
  const balancePercent = incomeTotal > 0 ? Math.round((balance / incomeTotal) * 100) : 0;
  const forecast = useMemo(() => buildForecast(installments, thisMonth, 12), [installments, thisMonth]);
  const sourceSummary = useMemo(() => summaryBySource(installments, sources, thisMonth), [installments, sources, thisMonth]);
  const [topCategory, topCategoryAmount] = topExpenseCategory(expenses);
  const isLoadingData = incomeState.loading || expenseState.loading || sourceState.loading || installmentState.loading;

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2200);
  };

  if (loading) return <FullScreenLoader label="กำลังเตรียมแอป..." />;
  if (!user) return <LoginPage error={authError} onLogin={loginWithGoogle} />;

  const tabs: { id: Tab; label: string; short: string }[] = [
    { id: 'dashboard', label: 'Dashboard', short: 'หน้าแรก' },
    { id: 'income', label: 'Income', short: 'รายรับ' },
    { id: 'expense', label: 'Expense', short: 'รายจ่าย' },
    { id: 'sources', label: 'Sources', short: 'แหล่งจ่าย' },
    { id: 'installments', label: 'Installments', short: 'ผ่อน' },
    { id: 'forecast', label: 'Forecast', short: 'ล่วงหน้า' },
    { id: 'calendar', label: 'Calendar', short: 'ปฏิทิน' },
    { id: 'settings', label: 'Settings', short: 'ตั้งค่า' },
  ];

  return (
    <div className="min-h-screen bg-soft text-ink">
      <header className="sticky top-0 z-20 border-b border-white/70 bg-soft/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-mint">Money Planner</p>
            <h1 className="text-xl font-bold text-navy">วางแผนเงินเดือนและภาระผ่อน</h1>
          </div>
          <div className="flex items-center gap-3">
            {user.photoURL && <img src={user.photoURL} className="h-10 w-10 rounded-full border-2 border-white shadow" alt="profile" />}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user.displayName}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id ? 'bg-navy text-white shadow-soft' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.short}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-white shadow-soft">{toast}</div>}
        {isLoadingData && <div className="mb-4 rounded-3xl bg-white p-4 text-sm text-slate-500 shadow-soft">กำลังโหลดข้อมูล...</div>}

        {activeTab === 'dashboard' && (
          <Dashboard
            incomeTotal={incomeTotal}
            expenseTotal={expenseTotal}
            installmentTotal={installmentTotal}
            balance={balance}
            balancePercent={balancePercent}
            topCategory={topCategory}
            topCategoryAmount={topCategoryAmount}
            sourceSummary={sourceSummary}
            forecast={forecast}
            activeInstallmentCount={activeInstallments(installments).length}
          />
        )}

        {activeTab === 'income' && (
          <IncomePage
            userId={user.uid}
            income={income}
            onSaved={() => showToast('บันทึกรายรับเรียบร้อย')}
            onDelete={() => showToast('ลบรายการเรียบร้อย')}
          />
        )}

        {activeTab === 'expense' && (
          <ExpensePage
            userId={user.uid}
            expenses={expenses}
            onSaved={() => showToast('บันทึกรายจ่ายเรียบร้อย')}
            onUpdated={() => showToast('อัปเดตสถานะเรียบร้อย')}
            onDelete={() => showToast('ลบรายการเรียบร้อย')}
          />
        )}

        {activeTab === 'sources' && (
          <SourcePage
            userId={user.uid}
            sources={sources}
            onSaved={() => showToast('บันทึกแหล่งจ่ายเรียบร้อย')}
            onDelete={() => showToast('ลบรายการเรียบร้อย')}
          />
        )}

        {activeTab === 'installments' && (
          <InstallmentPage
            userId={user.uid}
            sources={sources}
            installments={installments}
            previousMonthTotal={installmentTotal}
            onSaved={() => showToast('บันทึกรายการผ่อนเรียบร้อย')}
            onPaid={() => showToast('อัปเดตว่าจ่ายแล้วเรียบร้อย')}
            onDelete={() => showToast('ลบรายการเรียบร้อย')}
          />
        )}

        {activeTab === 'forecast' && <ForecastPage forecast={forecast} />}
        {activeTab === 'calendar' && <CalendarPage expenses={expenses} forecast={forecast[0]} />}
        {activeTab === 'settings' && (
          <SettingsPage
            userName={user.displayName || 'User'}
            userEmail={user.email || ''}
            onSeed={async () => {
              await seedDemoData(user.uid);
              showToast('เพิ่มข้อมูลตัวอย่างเรียบร้อย');
            }}
            onLogout={logout}
          />
        )}
      </main>
    </div>
  );
}

function LoginPage({ error, onLogin }: { error: string; onLogin: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-soft via-white to-emerald-50 px-4">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-soft">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-navy text-3xl text-white">฿</div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-mint">Money Planner</p>
        <h1 className="mt-3 text-3xl font-bold text-navy">จัดการเงินให้เห็นภาพง่ายขึ้น</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">วางแผนเงินเดือน รายจ่าย และภาระผ่อนของคุณได้ในที่เดียว</p>
        <button onClick={onLogin} className="mt-8 w-full rounded-2xl bg-navy px-5 py-4 font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-slate-900">
          เข้าสู่ระบบด้วย Google
        </button>
        {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
        <p className="mt-6 text-xs text-slate-400">ข้อมูลของคุณจะถูกแยกตาม Google Account และเก็บใน Firebase Firestore</p>
      </div>
    </div>
  );
}

function Dashboard({
  incomeTotal,
  expenseTotal,
  installmentTotal,
  balance,
  balancePercent,
  topCategory,
  topCategoryAmount,
  sourceSummary,
  forecast,
  activeInstallmentCount,
}: {
  incomeTotal: number;
  expenseTotal: number;
  installmentTotal: number;
  balance: number;
  balancePercent: number;
  topCategory: string;
  topCategoryAmount: number;
  sourceSummary: ReturnType<typeof summaryBySource>;
  forecast: ReturnType<typeof buildForecast>;
  activeInstallmentCount: number;
}) {
  const totalOut = expenseTotal + installmentTotal;
  const installmentRatio = incomeTotal > 0 ? Math.round((installmentTotal / incomeTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard title="รายรับรวม" value={thb(incomeTotal)} helper="รายรับประจำและรายได้เสริม" />
        <MetricCard title="รายจ่ายรวม" value={thb(expenseTotal)} helper="ยังไม่รวมภาระผ่อน" />
        <MetricCard title="ภาระผ่อนเดือนนี้" value={thb(installmentTotal)} helper={`${activeInstallmentCount} รายการกำลังผ่อน`} />
        <MetricCard title="เหลือใช้ประมาณ" value={thb(balance)} helper={`${balancePercent}% ของรายรับ`} highlight />
      </section>

      {(balancePercent < 20 || installmentRatio > 30) && incomeTotal > 0 && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
          <p className="font-bold">แจ้งเตือนแบบสุภาพ</p>
          <p className="mt-1 text-sm">เดือนนี้เงินคงเหลือหรือภาระผ่อนอาจค่อนข้างตึง แนะนำให้เช็กยอดผ่อนใหม่ก่อนเพิ่มรายการซื้อเพิ่ม</p>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[2rem] bg-white p-6 shadow-soft lg:col-span-2">
          <h2 className="text-lg font-bold text-navy">สรุปเดือนนี้</h2>
          <div className="mt-5 space-y-4">
            <ProgressRow label="รายจ่าย + ผ่อน เทียบรายรับ" value={incomeTotal > 0 ? Math.min(Math.round((totalOut / incomeTotal) * 100), 100) : 0} />
            <ProgressRow label="ภาระผ่อนเทียบรายรับ" value={installmentRatio} />
            <div className="rounded-3xl bg-soft p-4">
              <p className="text-sm text-slate-500">หมวดที่ใช้เงินเยอะที่สุด</p>
              <p className="mt-1 text-xl font-bold text-navy">{topCategory} · {thb(topCategoryAmount)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[2rem] bg-navy p-6 text-white shadow-soft">
          <p className="text-sm text-white/70">Insight</p>
          <h2 className="mt-2 text-2xl font-bold">ภาระผ่อนคิดเป็น {installmentRatio}% ของรายรับ</h2>
          <p className="mt-4 text-sm leading-6 text-white/70">ดู Forecast เพื่อเช็กว่าเดือนหน้า ๆ ภาระจะเพิ่มหรือลดลงอย่างไร ก่อนตัดสินใจซื้อของเพิ่ม</p>
        </div>
      </section>

      <section>
        <SectionHeader title="สรุปตามแหล่งจ่าย" helper="รวมยอดจากหลาย transaction ภายใต้ source เดียวกัน" />
        <div className="grid gap-4 md:grid-cols-3">
          {sourceSummary.length === 0 ? (
            <EmptyState label="ยังไม่มีแหล่งจ่าย ลองเพิ่ม Shopee, บัตรเครดิต หรือ PayLater ก่อน" />
          ) : (
            sourceSummary.map((source) => (
              <div key={source.sourceId} className="rounded-[2rem] bg-white p-5 shadow-soft">
                <p className="text-sm text-slate-500">{source.type}</p>
                <h3 className="mt-1 text-xl font-bold text-navy">{source.name}</h3>
                <p className="mt-4 text-2xl font-bold">{thb(source.totalThisMonth)}</p>
                <p className="text-sm text-slate-500">เดือนนี้ / {source.activeCount} รายการกำลังผ่อน</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <SectionHeader title="Forecast 3 เดือนข้างหน้า" helper="หลังรายการผ่อนหมด ยอดรวมจะลดลงอัตโนมัติ" />
        <div className="grid gap-4 md:grid-cols-3">
          {forecast.slice(0, 3).map((month) => (
            <div key={month.monthKey} className="rounded-[2rem] bg-white p-5 shadow-soft">
              <p className="text-sm font-semibold text-mint">{month.monthLabel}</p>
              <p className="mt-2 text-2xl font-bold text-navy">{thb(month.total)}</p>
              <p className="mt-1 text-sm text-slate-500">{month.lines.length} รายการ</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function IncomePage({ userId, income, onSaved, onDelete }: { userId: string; income: Income[]; onSaved: () => void; onDelete: () => void }) {
  const [form, setForm] = useState({ title: 'เงินเดือน', amount: '', category: 'เงินเดือน', receiveDate: new Date().toISOString().slice(0, 10), isRecurring: true });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await addIncome(userId, { ...form, amount: Number(form.amount) });
    setForm({ ...form, amount: '' });
    onSaved();
  };

  return (
    <TwoColumnLayout
      left={
        <FormCard title="เพิ่มรายรับ" onSubmit={submit}>
          <TextInput label="ชื่อรายการ" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <NumberInput label="จำนวนเงิน" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
          <SelectInput label="ประเภท" value={form.category} options={incomeCategories} onChange={(v) => setForm({ ...form, category: v })} />
          <DateInput label="วันที่ได้รับเงิน" value={form.receiveDate} onChange={(v) => setForm({ ...form, receiveDate: v })} />
          <Checkbox label="เป็นรายรับประจำทุกเดือน" checked={form.isRecurring} onChange={(v) => setForm({ ...form, isRecurring: v })} />
          <PrimaryButton label="บันทึกรายรับ" />
        </FormCard>
      }
      right={<ListCard title="รายการรายรับ" items={income.map((item) => ({ id: item.id, title: item.title, meta: item.category, amount: item.amount }))} onDelete={(id) => removeDocument(userId, 'income', id).then(onDelete)} />}
    />
  );
}

function ExpensePage({ userId, expenses, onSaved, onUpdated, onDelete }: { userId: string; expenses: Expense[]; onSaved: () => void; onUpdated: () => void; onDelete: () => void }) {
  const [form, setForm] = useState({ title: '', amount: '', category: 'อาหาร', dueDate: new Date().toISOString().slice(0, 10), isRecurring: false, status: 'unpaid' as 'paid' | 'unpaid' });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await addExpense(userId, { ...form, amount: Number(form.amount) });
    setForm({ ...form, title: '', amount: '' });
    onSaved();
  };

  return (
    <TwoColumnLayout
      left={
        <FormCard title="เพิ่มรายจ่าย" onSubmit={submit}>
          <TextInput label="ชื่อรายการ" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <NumberInput label="จำนวนเงิน" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
          <SelectInput label="หมวดหมู่" value={form.category} options={expenseCategories} onChange={(v) => setForm({ ...form, category: v })} />
          <DateInput label="วันที่ต้องจ่าย" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
          <Checkbox label="เป็นรายจ่ายประจำ" checked={form.isRecurring} onChange={(v) => setForm({ ...form, isRecurring: v })} />
          <PrimaryButton label="บันทึกรายจ่าย" />
        </FormCard>
      }
      right={
        <div className="rounded-[2rem] bg-white p-6 shadow-soft">
          <SectionHeader title="รายการรายจ่าย" helper="กดเปลี่ยนสถานะได้" />
          <div className="space-y-3">
            {expenses.length === 0 && <EmptyState label="ยังไม่มีรายจ่าย" />}
            {expenses.map((item) => (
              <div key={item.id} className="rounded-3xl bg-soft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-navy">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.category} · {item.status === 'paid' ? 'จ่ายแล้ว' : 'ยังไม่จ่าย'}</p>
                  </div>
                  <p className="font-bold">{thb(item.amount)}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="rounded-full bg-white px-3 py-2 text-xs font-bold" onClick={() => updateExpenseStatus(userId, item, item.status === 'paid' ? 'unpaid' : 'paid').then(onUpdated)}>
                    {item.status === 'paid' ? 'กลับเป็นยังไม่จ่าย' : 'จ่ายแล้ว'}
                  </button>
                  <button className="rounded-full bg-red-50 px-3 py-2 text-xs font-bold text-red-600" onClick={() => removeDocument(userId, 'expenses', item.id).then(onDelete)}>
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}

function SourcePage({ userId, sources, onSaved, onDelete }: { userId: string; sources: PaymentSource[]; onSaved: () => void; onDelete: () => void }) {
  const [form, setForm] = useState({ name: '', type: 'marketplace' as SourceType, billingCycleDate: '', paymentDueDate: '', note: '' });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await addPaymentSource(userId, {
      name: form.name,
      type: form.type,
      billingCycleDate: form.billingCycleDate ? Number(form.billingCycleDate) : undefined,
      paymentDueDate: form.paymentDueDate ? Number(form.paymentDueDate) : undefined,
      note: form.note,
    });
    setForm({ ...form, name: '', note: '' });
    onSaved();
  };

  return (
    <TwoColumnLayout
      left={
        <FormCard title="เพิ่มแหล่งจ่าย" onSubmit={submit}>
          <TextInput label="ชื่อ เช่น Shopee / KTC Credit Card" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-600">ประเภท</span>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as SourceType })}>
              {sourceTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
          <NumberInput label="วันตัดรอบบิล / ถ้ามี" value={form.billingCycleDate} onChange={(v) => setForm({ ...form, billingCycleDate: v })} />
          <NumberInput label="วันครบกำหนดชำระ" value={form.paymentDueDate} onChange={(v) => setForm({ ...form, paymentDueDate: v })} />
          <TextInput label="หมายเหตุ" value={form.note} onChange={(v) => setForm({ ...form, note: v })} required={false} />
          <PrimaryButton label="บันทึกแหล่งจ่าย" />
        </FormCard>
      }
      right={<ListCard title="แหล่งจ่ายทั้งหมด" items={sources.map((item) => ({ id: item.id, title: item.name, meta: item.type, amount: 0 }))} onDelete={(id) => removeDocument(userId, 'paymentSources', id).then(onDelete)} hideAmount />}
    />
  );
}

function InstallmentPage({
  userId,
  sources,
  installments,
  previousMonthTotal,
  onSaved,
  onPaid,
  onDelete,
}: {
  userId: string;
  sources: PaymentSource[];
  installments: Installment[];
  previousMonthTotal: number;
  onSaved: () => void;
  onPaid: () => void;
  onDelete: () => void;
}) {
  const defaultSource = sources[0];
  const [afterPreview, setAfterPreview] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: '',
    sourceId: defaultSource?.id || '',
    totalAmount: '',
    monthlyAmount: '',
    totalMonths: '',
    paidMonths: '0',
    startMonth: getMonthKey(),
    dueDate: '25',
    note: '',
  });

  const selectedSource = sources.find((source) => source.id === form.sourceId) || sources[0];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedSource) return;
    const paidMonths = Number(form.paidMonths || 0);
    const totalMonths = Number(form.totalMonths || 0);
    const remainingMonths = Math.max(totalMonths - paidMonths, 0);

    await addInstallment(userId, {
      title: form.title,
      sourceId: selectedSource.id,
      sourceName: selectedSource.name,
      totalAmount: Number(form.totalAmount),
      monthlyAmount: Number(form.monthlyAmount),
      totalMonths,
      paidMonths,
      remainingMonths,
      startMonth: form.startMonth,
      dueDate: Number(form.dueDate),
      status: remainingMonths <= 0 ? 'completed' : 'active',
      isPaidThisMonth: false,
      note: form.note,
    });

    setAfterPreview(previousMonthTotal + Number(form.monthlyAmount || 0));
    setForm({ ...form, title: '', totalAmount: '', monthlyAmount: '', totalMonths: '', paidMonths: '0', note: '' });
    onSaved();
  };

  return (
    <div className="space-y-6">
      {sources.length === 0 && <div className="rounded-3xl bg-amber-50 p-5 text-sm text-amber-800">กรุณาเพิ่ม Payment Source ก่อน เช่น Shopee, บัตรเครดิต หรือ PayLater</div>}
      <TwoColumnLayout
        left={
          <FormCard title="เพิ่มรายการผ่อนใหม่" onSubmit={submit}>
            <TextInput label="ชื่อรายการ" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-600">แหล่งที่ผ่อน</span>
              <select className="input" value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })} required>
                <option value="">เลือกแหล่งจ่าย</option>
                {sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
              </select>
            </label>
            <NumberInput label="ยอดรวมสินค้า" value={form.totalAmount} onChange={(v) => setForm({ ...form, totalAmount: v })} />
            <NumberInput label="ยอดผ่อนต่อเดือน" value={form.monthlyAmount} onChange={(v) => setForm({ ...form, monthlyAmount: v })} />
            <NumberInput label="จำนวนเดือนทั้งหมด" value={form.totalMonths} onChange={(v) => setForm({ ...form, totalMonths: v })} />
            <NumberInput label="จ่ายไปแล้วกี่เดือน" value={form.paidMonths} onChange={(v) => setForm({ ...form, paidMonths: v })} />
            <MonthInput label="เดือนที่เริ่มผ่อน" value={form.startMonth} onChange={(v) => setForm({ ...form, startMonth: v })} />
            <NumberInput label="วันที่ต้องจ่ายแต่ละเดือน" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
            <TextInput label="หมายเหตุ" value={form.note} onChange={(v) => setForm({ ...form, note: v })} required={false} />
            <PrimaryButton label="บันทึกรายการผ่อน" disabled={!selectedSource} />
          </FormCard>
        }
        right={
          <div className="space-y-4">
            <div className="rounded-[2rem] bg-white p-6 shadow-soft">
              <SectionHeader title="Before / After" helper="หลังเพิ่มรายการใหม่ ตัวเลขจะปรับทันที" />
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard title="ก่อนเพิ่ม" value={thb(previousMonthTotal)} helper="ยอดผ่อนเดือนนี้" />
                <MetricCard title="หลังเพิ่มล่าสุด" value={afterPreview === null ? '-' : thb(afterPreview)} helper={afterPreview === null ? 'ยังไม่มีการเพิ่มใหม่' : `เพิ่มขึ้น ${thb(afterPreview - previousMonthTotal)}`} highlight />
              </div>
            </div>
            <InstallmentList userId={userId} installments={installments} onPaid={onPaid} onDelete={onDelete} />
          </div>
        }
      />
    </div>
  );
}

function InstallmentList({ userId, installments, onPaid, onDelete }: { userId: string; installments: Installment[]; onPaid: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-soft">
      <SectionHeader title="รายการผ่อนทั้งหมด" helper="แต่ละ transaction คำนวณแยกกัน" />
      <div className="space-y-3">
        {installments.length === 0 && <EmptyState label="ยังไม่มีรายการผ่อน" />}
        {installments.map((item) => (
          <div key={item.id} className="rounded-3xl bg-soft p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-navy">{item.title}</p>
                <p className="text-sm text-slate-500">{item.sourceName} · เหลือ {item.remainingMonths} จาก {item.totalMonths} เดือน</p>
              </div>
              <p className="font-bold">{thb(item.monthlyAmount)}</p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-mint" style={{ width: `${Math.min(100, (item.paidMonths / item.totalMonths) * 100)}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button disabled={item.status === 'completed'} className="rounded-full bg-navy px-3 py-2 text-xs font-bold text-white disabled:bg-slate-300" onClick={() => updateInstallmentPaidThisMonth(userId, item).then(onPaid)}>
                จ่ายแล้วเดือนนี้
              </button>
              <button className="rounded-full bg-red-50 px-3 py-2 text-xs font-bold text-red-600" onClick={() => removeDocument(userId, 'installments', item.id).then(onDelete)}>
                ลบ
              </button>
              <span className={`rounded-full px-3 py-2 text-xs font-bold ${item.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-slate-500'}`}>{item.status === 'completed' ? 'จ่ายครบแล้ว' : 'กำลังผ่อน'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ForecastPage({ forecast }: { forecast: ReturnType<typeof buildForecast> }) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Monthly Installment Forecast" helper="มองยอดผ่อนล่วงหน้า 12 เดือน จากรายการย่อยทั้งหมด" />
      {forecast.map((month) => (
        <div key={month.monthKey} className="rounded-[2rem] bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-mint">{month.monthLabel}</p>
              <h3 className="text-2xl font-bold text-navy">{thb(month.total)}</h3>
            </div>
            <p className="rounded-full bg-soft px-4 py-2 text-sm font-bold text-slate-600">{month.lines.length} รายการ</p>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              {month.lines.length === 0 && <p className="text-sm text-slate-400">ไม่มีรายการผ่อนในเดือนนี้</p>}
              {month.lines.map((line) => (
                <div key={`${month.monthKey}-${line.installmentId}`} className="flex items-center justify-between rounded-2xl bg-soft p-3 text-sm">
                  <span>{line.sourceName} · {line.title}</span>
                  <strong>{thb(line.monthlyAmount)}</strong>
                </div>
              ))}
            </div>
            <div className="rounded-3xl bg-soft p-4">
              <p className="mb-3 text-sm font-bold text-navy">รวมตามแหล่งจ่าย</p>
              {Object.entries(month.bySource).map(([sourceName, amount]) => (
                <div key={sourceName} className="flex justify-between py-1 text-sm">
                  <span>{sourceName}</span>
                  <strong>{thb(amount)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CalendarPage({ expenses, forecast }: { expenses: Expense[]; forecast?: ReturnType<typeof buildForecast>[0] }) {
  const installmentItems = forecast?.lines.map((line) => ({ day: line.dueDate, title: `${line.sourceName}: ${line.title}`, amount: line.monthlyAmount, type: 'ผ่อน' })) || [];
  const expenseItems = expenses.map((expense) => ({ day: Number(expense.dueDate.slice(-2)), title: expense.title, amount: expense.amount, type: expense.status === 'paid' ? 'รายจ่าย · จ่ายแล้ว' : 'รายจ่าย · ยังไม่จ่าย' }));
  const items = [...installmentItems, ...expenseItems].sort((a, b) => a.day - b.day);

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-soft">
      <SectionHeader title="Payment Reminder View" helper="เรียงตามวันที่ต้องจ่ายในเดือนนี้" />
      <div className="space-y-3">
        {items.length === 0 && <EmptyState label="ยังไม่มีรายการที่ต้องจ่ายในเดือนนี้" />}
        {items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="flex items-center justify-between rounded-3xl bg-soft p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white font-bold text-navy">{item.day}</div>
              <div>
                <p className="font-bold text-navy">{item.title}</p>
                <p className="text-sm text-slate-500">{item.type}</p>
              </div>
            </div>
            <strong>{thb(item.amount)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPage({ userName, userEmail, onSeed, onLogout }: { userName: string; userEmail: string; onSeed: () => Promise<void>; onLogout: () => void }) {
  const [seeding, setSeeding] = useState(false);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[2rem] bg-white p-6 shadow-soft">
        <h2 className="text-xl font-bold text-navy">Account</h2>
        <p className="mt-3 font-semibold">{userName}</p>
        <p className="text-sm text-slate-500">{userEmail}</p>
        <button className="mt-6 rounded-2xl bg-navy px-5 py-3 font-bold text-white" onClick={onLogout}>Logout</button>
      </div>
      <div className="rounded-[2rem] bg-white p-6 shadow-soft">
        <h2 className="text-xl font-bold text-navy">Demo Data</h2>
        <p className="mt-2 text-sm text-slate-500">เพิ่มข้อมูลตัวอย่าง เช่น เงินเดือน ค่าเช่า Shopee Credit Card PayLater เพื่อทดสอบระบบ</p>
        <button
          className="mt-6 rounded-2xl bg-mint px-5 py-3 font-bold text-navy disabled:opacity-60"
          disabled={seeding}
          onClick={async () => {
            setSeeding(true);
            await onSeed();
            setSeeding(false);
          }}
        >
          {seeding ? 'กำลังเพิ่ม...' : 'เพิ่มข้อมูลตัวอย่าง'}
        </button>
      </div>
    </div>
  );
}

function MetricCard({ title, value, helper, highlight = false }: { title: string; value: string; helper: string; highlight?: boolean }) {
  return (
    <div className={`rounded-[2rem] p-5 shadow-soft ${highlight ? 'bg-navy text-white' : 'bg-white text-ink'}`}>
      <p className={`text-sm ${highlight ? 'text-white/70' : 'text-slate-500'}`}>{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className={`mt-1 text-xs ${highlight ? 'text-white/60' : 'text-slate-400'}`}>{helper}</p>
    </div>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm font-semibold text-slate-600">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-soft">
        <div className="h-full rounded-full bg-mint" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
      </div>
    </div>
  );
}

function SectionHeader({ title, helper }: { title: string; helper?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold text-navy">{title}</h2>
      {helper && <p className="mt-1 text-sm text-slate-500">{helper}</p>}
    </div>
  );
}

function TwoColumnLayout({ left, right }: { left: ReactNode; right: ReactNode }) {
  return <div className="grid gap-6 lg:grid-cols-[420px_1fr]">{left}{right}</div>;
}

function FormCard({ title, children, onSubmit }: { title: string; children: ReactNode; onSubmit: (event: FormEvent) => void }) {
  return (
    <form onSubmit={onSubmit} className="rounded-[2rem] bg-white p-6 shadow-soft">
      <SectionHeader title={title} />
      <div className="space-y-4">{children}</div>
    </form>
  );
}

function TextInput({ label, value, onChange, required = true }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
      <input className="input" value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
      <input className="input" type="number" min="0" value={value} onChange={(event) => onChange(event.target.value)} required />
    </label>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
      <input className="input" type="date" value={value} onChange={(event) => onChange(event.target.value)} required />
    </label>
  );
}

function MonthInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
      <input className="input" type="month" value={value} onChange={(event) => onChange(event.target.value)} required />
    </label>
  );
}

function SelectInput({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl bg-soft p-3 text-sm font-semibold text-slate-600">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function PrimaryButton({ label, disabled = false }: { label: string; disabled?: boolean }) {
  return <button disabled={disabled} className="w-full rounded-2xl bg-navy px-5 py-4 font-bold text-white shadow-soft disabled:bg-slate-300">{label}</button>;
}

function ListCard({ title, items, onDelete, hideAmount = false }: { title: string; items: { id: string; title: string; meta: string; amount: number }[]; onDelete: (id: string) => void; hideAmount?: boolean }) {
  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-soft">
      <SectionHeader title={title} />
      <div className="space-y-3">
        {items.length === 0 && <EmptyState label="ยังไม่มีข้อมูล" />}
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-3xl bg-soft p-4">
            <div>
              <p className="font-bold text-navy">{item.title}</p>
              <p className="text-sm text-slate-500">{item.meta}</p>
            </div>
            <div className="text-right">
              {!hideAmount && <p className="font-bold">{thb(item.amount)}</p>}
              <button className="mt-1 text-xs font-bold text-red-500" onClick={() => onDelete(item.id)}>ลบ</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">{label}</div>;
}

function FullScreenLoader({ label }: { label: string }) {
  return <div className="flex min-h-screen items-center justify-center bg-soft text-sm font-semibold text-slate-500">{label}</div>;
}

export default App;
