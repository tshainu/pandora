import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#C0001A', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];
const fmt = (n: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(n || 0);

const REPORT_TYPES = [
  { key: 'sales-report', label: 'Sales Report', icon: '📈', group: 'Sales' },
  { key: 'purchase-report', label: 'Purchase Report', icon: '🛒', group: 'Purchases' },
  { key: 'stock-report', label: 'Stock Report', icon: '📦', group: 'Inventory' },
  { key: 'order-report', label: 'Orders Report', icon: '📋', group: 'Orders' },
  { key: 'expense-report', label: 'Expense Report', icon: '💸', group: 'Finance' },
  { key: 'profit-report', label: 'Profit & Loss', icon: '💰', group: 'Finance' },
  { key: 'top-performers', label: 'Top Performers', icon: '🏆', group: 'HR' },
  { key: 'attendance', label: 'Attendance Issues', icon: '⏰', group: 'HR' },
  { key: 'discipline', label: 'Discipline Report', icon: '📏', group: 'HR' },
  { key: 'salary-increment', label: 'Salary Increment', icon: '💰', group: 'HR' },
  { key: 'training-needs', label: 'Training Needs', icon: '📚', group: 'HR' },
  { key: 'risk-employees', label: 'At-Risk Employees', icon: '⚠️', group: 'HR' },
];

export default function Reports() {
  const [activeReport, setActiveReport] = useState('sales-report');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const { data, isLoading, error } = useQuery({
    queryKey: ['report', activeReport, month],
    queryFn: () => api.getReport(activeReport, { month }),
  });

  const groups = Array.from(new Set(REPORT_TYPES.map(r => r.group)));

  return (
    <div>
      <div className="topbar">
        <h2>Reports</h2>
        <div className="topbar-right">
          <input className="form-control" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 180 }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 57px)' }}>
        {/* Sidebar */}
        <div style={{ width: 220, background: 'var(--surface)', borderRight: '1px solid var(--border)', padding: '16px 0', flexShrink: 0 }}>
          {groups.map(group => (
            <div key={group}>
              <div style={{ padding: '6px 16px 4px', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{group}</div>
              {REPORT_TYPES.filter(r => r.group === group).map(r => (
                <button key={r.key} onClick={() => setActiveReport(r.key)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '8px 16px',
                    background: activeReport === r.key ? '#FFF0F2' : 'transparent',
                    border: 'none', borderLeft: `3px solid ${activeReport === r.key ? 'var(--red)' : 'transparent'}`,
                    color: activeReport === r.key ? 'var(--red)' : 'var(--text2)',
                    fontSize: '0.82rem', fontWeight: activeReport === r.key ? 600 : 400,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
                  }}>
                  <span>{r.icon}</span> {r.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {isLoading && <div className="loading">Loading report…</div>}
          {error && <div className="alert alert-danger">Failed to load report</div>}
          {!isLoading && !error && data !== undefined && (
            <ReportView type={activeReport} data={data} month={month} />
          )}
        </div>
      </div>
    </div>
  );
}

function ReportView({ type, data, month }: { type: string; data: unknown; month: string }) {
  const title = REPORT_TYPES.find(r => r.key === type)?.label || type;
  const d = data as Record<string, unknown>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{title}</h3>
        <div style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>Period: {month}</div>
      </div>

      {/* Simple table for HR reports */}
      {['top-performers', 'attendance', 'discipline', 'salary-increment', 'training-needs', 'risk-employees'].includes(type) && (
        <GenericTable rows={Array.isArray(d) ? d : (d?.rows as Record<string,unknown>[] || [])} />
      )}

      {/* Sales report */}
      {type === 'sales-report' && <SalesReport rows={Array.isArray(d) ? d : []} />}

      {/* Purchase report */}
      {type === 'purchase-report' && <GenericTable rows={Array.isArray(d) ? d : []} />}

      {/* Stock report */}
      {type === 'stock-report' && <StockReport rows={Array.isArray(d) ? d : []} />}

      {/* Order report */}
      {type === 'order-report' && <OrderReport rows={Array.isArray(d) ? d : []} />}

      {/* Expense report */}
      {type === 'expense-report' && <ExpenseReport rows={Array.isArray(d) ? d : []} summary={(data as { summary?: unknown[] })?.summary || []} />}

      {/* Profit report */}
      {type === 'profit-report' && <ProfitReport rows={Array.isArray(d) ? d : []} />}
    </div>
  );
}

function SalesReport({ rows }: { rows: Record<string,unknown>[] }) {
  const total = rows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  return (
    <div>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        <StatCard label="Total Revenue" value={fmt(total)} />
        <StatCard label="Invoices" value={String(rows.length)} />
        <StatCard label="Avg Invoice" value={fmt(rows.length ? total / rows.length : 0)} />
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Invoice #</th><th>Customer</th><th>Date</th><th>Status</th><th>Total</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>No data for this period</td></tr>}
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: 'var(--red)' }}>{String(r.invoice_no || '—')}</td>
                  <td>{String(r.customer_name || '—')}</td>
                  <td style={{ fontSize: '0.78rem' }}>{String(r.sale_date || '—')}</td>
                  <td><span className="badge badge-verygood">{String(r.payment_status || '—')}</span></td>
                  <td style={{ fontWeight: 600 }}>{fmt(Number(r.total_amount || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StockReport({ rows }: { rows: Record<string,unknown>[] }) {
  const totalValue = rows.reduce((s, r) => s + Number(r.stock_qty || 0) * Number(r.cost_price || 0), 0);
  const lowItems = rows.filter(r => Number(r.stock_qty || 0) <= Number(r.reorder_level || 0));
  return (
    <div>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        <StatCard label="Total Items" value={String(rows.length)} />
        <StatCard label="Low Stock" value={String(lowItems.length)} />
        <StatCard label="Stock Value" value={fmt(totalValue)} positive />
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Stock</th><th>Reorder</th><th>Value</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{String(r.sku || '—')}</td>
                  <td style={{ fontWeight: 500 }}>{String(r.name || '—')}</td>
                  <td>{String(r.category || '—')}</td>
                  <td style={{ color: Number(r.stock_qty) <= Number(r.reorder_level) ? 'var(--red)' : 'inherit', fontWeight: 600 }}>{String(r.stock_qty || 0)}</td>
                  <td>{String(r.reorder_level || 0)}</td>
                  <td>{fmt(Number(r.stock_qty || 0) * Number(r.cost_price || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function OrderReport({ rows }: { rows: Record<string,unknown>[] }) {
  const byStatus: Record<string, number> = {};
  rows.forEach(r => { const s = String(r.status || 'Unknown'); byStatus[s] = (byStatus[s] || 0) + 1; });
  const pieData = Object.entries(byStatus).map(([status, count]) => ({ status, count }));
  return (
    <div>
      <div className="charts-grid">
        {pieData.length > 0 && (
          <div className="card">
            <div className="card-title">By Status</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} fontSize={10}>
                  {pieData.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="card" style={{ marginTop: 0 }}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order #</th><th>Customer</th><th>Order Date</th><th>Delivery Date</th><th>Status</th><th>Total</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>No data</td></tr>}
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: 'var(--red)' }}>{String(r.order_no || '—')}</td>
                  <td>{String(r.customer_name || '—')}</td>
                  <td style={{ fontSize: '0.78rem' }}>{String(r.order_date || '—')}</td>
                  <td style={{ fontSize: '0.78rem' }}>{String(r.delivery_date || '—')}</td>
                  <td><span className="badge badge-verygood">{String(r.status || '—')}</span></td>
                  <td style={{ fontWeight: 600 }}>{fmt(Number(r.total_amount || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ExpenseReport({ rows, summary }: { rows: Record<string,unknown>[]; summary: unknown[] }) {
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const summaryArr = (summary || []) as { category: string; total: number }[];
  return (
    <div>
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: 20 }}>
        <StatCard label="Total Expenses" value={fmt(total)} />
        <StatCard label="Transactions" value={String(rows.length)} />
      </div>
      {summaryArr.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">By Category</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={summaryArr}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="category" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Bar dataKey="total" fill="#C0001A" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Title</th><th>Category</th><th>Date</th><th>Method</th><th>Amount</th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>No data</td></tr>}
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{String(r.title || '—')}</td>
                  <td><span className="badge badge-average">{String(r.category || '—')}</span></td>
                  <td style={{ fontSize: '0.78rem' }}>{String(r.expense_date || '—')}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{String(r.payment_method || '—')}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(Number(r.amount || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProfitReport({ rows }: { rows: Record<string,unknown>[] }) {
  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Monthly P&L Trend</div>
        {rows.length === 0
          ? <div className="empty"><div className="empty-icon">📊</div><p>No data available</p></div>
          : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Bar dataKey="sales" fill="#36A2EB" name="Revenue" radius={[4,4,0,0]} />
                <Bar dataKey="expenses" fill="#C0001A" name="Expenses" radius={[4,4,0,0]} />
                <Bar dataKey="profit" fill="#2E7D32" name="Profit" radius={[4,4,0,0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          )}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Profit/Loss</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{String(r.month)}</td>
                  <td style={{ color: '#2E7D32' }}>{fmt(Number(r.sales || 0))}</td>
                  <td style={{ color: 'var(--red)' }}>{fmt(Number(r.expenses || 0))}</td>
                  <td style={{ fontWeight: 700, color: Number(r.profit) >= 0 ? '#2E7D32' : 'var(--red)' }}>{fmt(Number(r.profit || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GenericTable({ rows }: { rows: Record<string,unknown>[] }) {
  if (rows.length === 0) return <div className="empty"><div className="empty-icon">📊</div><p>No data available for this period</p></div>;
  const keys = Object.keys(rows[0]);
  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead><tr>{keys.map(k => <th key={k}>{k.replace(/_/g, ' ')}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>{keys.map(k => <td key={k}>{String(row[k] ?? '—')}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, positive, neg }: { label: string; value?: string; positive?: boolean; neg?: boolean }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px' }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text3)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 4, color: positive ? '#2E7D32' : neg ? 'var(--red)' : 'inherit' }}>
        {value || '—'}
      </div>
    </div>
  );
}
