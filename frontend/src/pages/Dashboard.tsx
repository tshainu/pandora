import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  CartesianGrid
} from 'recharts';
import {
  TrendingUp, ShoppingCart, Package, Users, DollarSign,
  AlertTriangle, Clock, CheckCircle, CalendarClock
} from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n: number) => new Intl.NumberFormat().format(n || 0);
const COLORS = ['#C0001A', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'];

export default function Dashboard() {
  const { data: d, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.getDashboard() });

  if (isLoading) return <div className="loading">Loading dashboard…</div>;
  if (error) return <div className="content"><div className="alert alert-danger">Failed to load dashboard</div></div>;

  if (!d) return null;

  // Merge salesTrend + expenseTrend into one dataset keyed by month
  const salesMap: Record<string, number> = {};
  const expenseMap: Record<string, number> = {};
  (d.salesTrend || []).forEach((r: { m: string; total: number }) => { salesMap[r.m] = r.total; });
  (d.expenseTrend || []).forEach((r: { m: string; total: number }) => { expenseMap[r.m] = r.total; });
  const allMonths = Array.from(new Set([...Object.keys(salesMap), ...Object.keys(expenseMap)])).sort();

  // Pad to at least 2 months so Recharts can draw a line
  if (allMonths.length === 1) {
    const [y, mo] = allMonths[0].split('-').map(Number);
    const prev = mo === 1
      ? `${y - 1}-12`
      : `${y}-${String(mo - 1).padStart(2, '0')}`;
    allMonths.unshift(prev);
  }

  const trendData = allMonths.map(m => ({
    month: m.slice(0, 7),
    revenue: salesMap[m] || 0,
    expenses: expenseMap[m] || 0,
    profit: Math.max(0, (salesMap[m] || 0) - (expenseMap[m] || 0)),
  }));

  const orderStatusDist = (d.orderStatusDist || []).map((r: { status: string; c: number }) => ({ status: r.status, count: r.c }));
  const topCustomers = d.topCustomers || [];
  const recentOrders = d.recentOrders || [];
  const upcomingDeliveries = d.upcomingDeliveries || [];

  return (
    <div>
      <div className="topbar">
        <h2>Executive Dashboard</h2>
        <div className="topbar-right">
          <span style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>
            {new Date().toLocaleDateString('en-LK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>
      <div className="content">

        {/* Alerts */}
        {(d.lowStock > 0 || d.delayedOrders > 0) && (
          <div style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {d.lowStock > 0 && (
              <div className="alert alert-danger" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={14} /> {d.lowStock} item(s) are low on stock
              </div>
            )}
            {d.delayedOrders > 0 && (
              <div className="alert alert-danger" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={14} /> {d.delayedOrders} order(s) are overdue
              </div>
            )}
          </div>
        )}

        {/* KPI Grid row 1 */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <KpiCard icon={<TrendingUp size={20} />} color="#C0001A" label="Revenue (This Month)" value={fmt(d.monthlySales || 0)} sub={`${d.pendingQuotations || 0} pending quotes`} />
          <KpiCard icon={<ShoppingCart size={20} />} color="#1565C0" label="Active Orders" value={fmtNum(d.activeOrders || 0)} sub={`${d.delayedOrders || 0} overdue`} />
          <KpiCard icon={<Package size={20} />} color="#F57C00" label="Low Stock Items" value={fmtNum(d.lowStock || 0)} sub="need reorder" />
          <KpiCard icon={<Users size={20} />} color="#2E7D32" label="Total Customers" value={fmtNum(d.totalCustomers || 0)} sub={`${d.totalStaff || 0} staff`} />
        </div>
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <KpiCard icon={<DollarSign size={20} />} color="#6A1FA0" label="Expenses (This Month)" value={fmt(d.monthlyExpenses || 0)} sub="total spend" />
          <KpiCard icon={<CheckCircle size={20} />} color="#2E7D32" label="Net Profit" value={fmt(d.monthlyProfit || 0)} sub="revenue - expenses" />
          <KpiCard icon={<Clock size={20} />} color="#F57C00" label="Uncollected Orders" value={fmtNum(d.uncollectedOrders || 0)} sub="ready to dispatch" />
          <KpiCard icon={<Users size={20} />} color="#1565C0" label="HR: Avg KPI Score" value={`${d.avgKpi || 0}%`} sub={`${d.totalEmployees || 0} employees`} />
        </div>

        {/* Charts row 1 — full-width multi-series trend */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Revenue, Expenses & Profit Trend</div>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--text3)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 24, height: 2, background: '#4E6FFF', display: 'inline-block', borderRadius: 2 }} /> Revenue</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 24, height: 2, background: '#FF9F43', display: 'inline-block', borderRadius: 2 }} /> Expenses</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 24, height: 2, background: '#28C76F', display: 'inline-block', borderRadius: 2 }} /> Profit</span>
            </div>
          </div>
          {trendData.length === 0
            ? <div className="empty"><div className="empty-icon">📈</div><p>No trend data yet</p></div>
            : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4E6FFF" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#4E6FFF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF9F43" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#FF9F43" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gPro" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#28C76F" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#28C76F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#999' }}
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#999' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    width={38}
                  />
                  <CartesianGrid stroke="#F3F3F3" strokeDasharray="" vertical={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                    formatter={(v, name) => [fmt(Number(v)), String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#4E6FFF" strokeWidth={2.5} fill="url(#gRev)" dot={{ r: 4, fill: '#4E6FFF', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Area type="monotone" dataKey="expenses" stroke="#FF9F43" strokeWidth={2.5} fill="url(#gExp)" dot={{ r: 4, fill: '#FF9F43', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Area type="monotone" dataKey="profit" stroke="#28C76F" strokeWidth={2.5} fill="url(#gPro)" dot={{ r: 4, fill: '#28C76F', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Charts row 2 — pie + bar + recent orders */}
        <div className="charts-grid">
          <div className="card">
            <div className="card-title">Orders by Status</div>
            {orderStatusDist.length === 0
              ? <div className="empty"><div className="empty-icon">📋</div><p>No orders yet</p></div>
              : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={orderStatusDist} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={75}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {orderStatusDist.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
          </div>
          <div className="card">
            <div className="card-title">Top Customers by Revenue</div>
            {topCustomers.length === 0
              ? <div className="empty"><div className="empty-icon">👥</div><p>No customer data yet</p></div>
              : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topCustomers} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                    <Bar dataKey="total" fill="#C0001A" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </div>
          <div className="card">
            <div className="card-title">Recent Orders</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text3)', padding: 24 }}>No orders yet</td></tr>
                  )}
                  {recentOrders.map((o: { id: number; order_no: string; customer_name: string; delivery_date: string; status: string }) => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600, color: 'var(--red)' }}>{o.order_no}</td>
                      <td>{o.customer_name}</td>
                      <td style={{ fontSize: '0.78rem' }}>{o.delivery_date || '—'}</td>
                      <td><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Upcoming Deliveries */}
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="card-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarClock size={16} style={{ color: 'var(--red)' }} />
              Upcoming Deliveries (Next 7 Days)
            </div>
            <span style={{ background: '#C0001A15', color: 'var(--red)', borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
              {d.ordersDueWeek || 0} due
            </span>
          </div>
          {upcomingDeliveries.length === 0 ? (
            <div className="empty" style={{ padding: '24px 0' }}>
              <div className="empty-icon">📅</div>
              <p>No deliveries due this week</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Order #</th><th>Customer</th><th>Due Date</th><th>Status</th><th>Days Left</th></tr>
                </thead>
                <tbody>
                  {upcomingDeliveries.map((o: { id: number; order_no: string; customer_name: string; delivery_date: string; status: string }) => {
                    const daysLeft = Math.ceil((new Date(o.delivery_date).getTime() - Date.now()) / 86400000);
                    return (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 600, color: 'var(--red)' }}>{o.order_no}</td>
                        <td>{o.customer_name}</td>
                        <td style={{ fontSize: '0.78rem' }}>{o.delivery_date}</td>
                        <td><StatusBadge status={o.status} /></td>
                        <td>
                          <span style={{ fontWeight: 700, color: daysLeft === 0 ? 'var(--red)' : daysLeft <= 2 ? '#E65100' : 'var(--success)', fontSize: '0.82rem' }}>
                            {daysLeft === 0 ? 'Today!' : daysLeft < 0 ? 'Overdue' : `${daysLeft}d`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function KpiCard({ icon, color, label, value, sub }: { icon: React.ReactNode; color: string; label: string; value: string; sub: string }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: `${color}15`, color }}>{icon}</div>
      <div className="kpi-info">
        <label>{label}</label>
        <h3 style={{ fontSize: '1.3rem' }}>{value}</h3>
        <span>{sub}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    New: 'badge-good', Confirmed: 'badge-verygood', 'In Progress': 'badge-verygood',
    Ready: 'badge-excellent', Delivered: 'badge-excellent', Collected: 'badge-excellent',
    Cancelled: 'badge-needs', Pending: 'badge-average', Paid: 'badge-excellent',
  };
  return <span className={`badge ${map[status] || 'badge-average'}`}>{status}</span>;
}
