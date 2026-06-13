import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';

type Expense = {
  id: number; title: string; category: string; amount: number;
  expense_date: string; payment_method: string; reference: string; notes: string;
};

const CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Raw Materials', 'Transport', 'Marketing', 'Maintenance', 'Office Supplies', 'Other'];

const EMPTY: Partial<Expense> = { title: '', category: '', amount: 0, expense_date: today(), payment_method: 'cash', reference: '', notes: '' };

export default function Expenses() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null);
  const [form, setForm] = useState<Partial<Expense>>(EMPTY);

  const { data = [], isLoading } = useQuery({
    queryKey: ['expenses', search, catFilter, month],
    queryFn: () => api.getExpenses({ search: search || undefined, category: catFilter || undefined, month: month || undefined }),
  });

  const save = useMutation({
    mutationFn: (d: Partial<Expense>) => d.id ? api.updateExpense(d.id, d) : api.createExpense(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setModal(null); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.deleteExpense(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const fmt = (n: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(n || 0);
  const total = (data as Expense[]).reduce((s: number, e: Expense) => s + (e.amount || 0), 0);

  // Category breakdown
  const byCategory: Record<string, number> = {};
  (data as Expense[]).forEach((e: Expense) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });

  return (
    <div>
      <div className="topbar">
        <h2>Expenses</h2>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal('add'); }}><Plus size={14} /> Add Expense</button>
        </div>
      </div>
      <div className="content">
        {/* Summary bar */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: '#C0001A15', color: '#C0001A' }}>💸</div>
            <div className="kpi-info">
              <label>Total Expenses</label>
              <h3 style={{ fontSize: '1.2rem' }}>{fmt(total)}</h3>
              <span>{(data as Expense[]).length} records</span>
            </div>
          </div>
          {Object.entries(byCategory).slice(0, 3).map(([cat, amt]) => (
            <div key={cat} className="kpi-card">
              <div className="kpi-icon" style={{ background: '#1565C015', color: '#1565C0' }}>📂</div>
              <div className="kpi-info">
                <label>{cat}</label>
                <h3 style={{ fontSize: '1.2rem' }}>{fmt(amt)}</h3>
                <span>{((amt / Math.max(total, 1)) * 100).toFixed(1)}% of total</span>
              </div>
            </div>
          ))}
        </div>

        <div className="filter-bar">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input className="form-control" style={{ paddingLeft: 32, width: 240 }} placeholder="Search expenses…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 160 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="form-control" type="month" style={{ width: 160 }} value={month} onChange={e => setMonth(e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
          <div className="card">
            {isLoading ? <div className="loading">Loading…</div> : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Title</th><th>Category</th><th>Date</th><th>Payment</th><th>Amount</th><th></th></tr>
                  </thead>
                  <tbody>
                    {(data as Expense[]).length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>No expenses found</td></tr>}
                    {(data as Expense[]).map((e: Expense) => (
                      <tr key={e.id}>
                        <td style={{ fontWeight: 600 }}>{e.title}</td>
                        <td><span className="badge badge-average">{e.category}</span></td>
                        <td style={{ fontSize: '0.78rem' }}>{e.expense_date}</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{e.payment_method}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(e.amount)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn-icon" onClick={() => { setForm(e); setModal('edit'); }}><Edit2 size={14} /></button>
                            <button className="btn-icon" onClick={() => { if (confirm('Delete expense?')) del.mutate(e.id); }}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Category breakdown sidebar */}
          <div className="card" style={{ alignSelf: 'flex-start' }}>
            <div className="card-title">By Category</div>
            {Object.keys(byCategory).length === 0 && <div style={{ color: 'var(--text3)', fontSize: '0.82rem' }}>No data</div>}
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <div key={cat} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                  <span style={{ fontWeight: 500 }}>{cat}</span>
                  <span style={{ color: 'var(--text3)' }}>{fmt(amt)}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(amt / Math.max(total, 1)) * 100}%`, background: 'var(--red)' }} />
                </div>
              </div>
            ))}
            {total > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.85rem' }}>
                <span>Total</span><span>{fmt(total)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal === 'add' ? 'Add Expense' : 'Edit Expense'}</h3>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Title *</label><input className="form-control" value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select className="form-control" value={form.category || ''} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    <option value="">Select…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Amount (LKR)</label><input className="form-control" type="number" value={form.amount || 0} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Date</label><input className="form-control" type="date" value={form.expense_date || ''} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} /></div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select className="form-control" value={form.payment_method || 'cash'} onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Reference / Receipt No.</label><input className="form-control" value={form.reference || ''} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))} /></div>
              <div className="form-group"><label>Notes</label><textarea className="form-control" value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={save.isPending} onClick={() => save.mutate(form)}>
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function today() { return new Date().toISOString().split('T')[0]; }
