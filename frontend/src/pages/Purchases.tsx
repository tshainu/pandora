import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Plus, Search, Eye, X, Trash2, ChevronDown, DollarSign } from 'lucide-react';

type LineItem = { item_id: number; item_name: string; qty: number; unit_price: number };
type Purchase = {
  id: number; purchase_no: string; supplier_id: number; supplier_name: string;
  purchase_date: string; payment_status: string; payment_mode: string;
  total_amount: number; paid_amount: number; notes: string; items?: LineItem[];
};

const STATUS_OPTS = ['draft', 'ordered', 'received', 'cancelled'];
const PAY_MODES = ['Cash', 'Cheque', 'Online', 'Bank Transfer'];

function StatusDropdown({ purchase, onUpdate }: { purchase: Purchase; onUpdate: (id: number, status: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggle = useCallback(() => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const menuHeight = 110;
      const flip = r.bottom + menuHeight > window.innerHeight;
      setPos({
        top: flip ? r.top + window.scrollY - menuHeight - 4 : r.bottom + window.scrollY + 4,
        left: r.left + window.scrollX,
      });
    }
    setOpen(v => !v);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const cls = purchase.payment_status === 'Paid' ? 'badge-excellent'
    : purchase.payment_status === 'Partial' ? 'badge-good' : 'badge-needs';

  return (
    <>
      <button
        ref={btnRef}
        className={`badge ${cls}`}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: undefined }}
        onClick={toggle}
      >
        {purchase.payment_status} <ChevronDown size={10} />
      </button>
      {open && createPortal(
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999,
            background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
            boxShadow: '0 8px 20px rgba(0,0,0,0.12)', minWidth: 130, padding: '4px 0',
          }}
        >
          {['Unpaid', 'Partial', 'Paid'].map(s => (
            <button key={s} onClick={() => { onUpdate(purchase.id, s); setOpen(false); }}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 12px', fontSize: '0.8rem', textAlign: 'left', color: 'var(--text)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >{s}</button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

export default function Purchases() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState<null | 'create' | 'view' | 'pay'>(null);
  const [selected, setSelected] = useState<Purchase | null>(null);
  const [form, setForm] = useState({
    supplier_id: '', purchase_date: today(), notes: '', items: [] as LineItem[],
    payment_status: 'Unpaid', paid_amount: 0, payment_mode: 'Cash',
  });
  const [payForm, setPayForm] = useState({ payment_status: 'Paid', paid_amount: 0, payment_mode: 'Cash' });

  const { data = [], isLoading } = useQuery({
    queryKey: ['purchases', search, status],
    queryFn: () => api.getPurchases({ search: search || undefined, status: status || undefined }),
  });

  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.getSuppliers() });
  const { data: items = [] } = useQuery({ queryKey: ['items'], queryFn: () => api.getItems() });

  const save = useMutation({
    mutationFn: (d: object) => api.createPurchase(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); setModal(null); },
  });

  const updatePay = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => api.updatePurchase(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); setModal(null); setSelected(null); },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status: s }: { id: number; status: string }) =>
      api.updatePurchase(id, { payment_status: s }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); },
  });

  const fmt = (n: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(n || 0);

  const addLine = () => setForm(p => ({ ...p, items: [...p.items, { item_id: 0, item_name: '', qty: 1, unit_price: 0 }] }));
  const removeLine = (i: number) => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  const updateLine = (i: number, field: keyof LineItem, val: string | number) =>
    setForm(p => ({ ...p, items: p.items.map((line, idx) => idx === i ? { ...line, [field]: val } : line) }));

  const total = form.items.reduce((s, l) => s + l.qty * l.unit_price, 0);

  const viewPurchase = async (id: number) => {
    const res = await api.getPurchase(id);
    setSelected({ ...res.purchase, items: res.items });
    setModal('view');
  };

  const openPay = (p: Purchase) => {
    setSelected(p);
    setPayForm({ payment_status: 'Paid', paid_amount: p.total_amount - (p.paid_amount || 0), payment_mode: 'Cash' });
    setModal('pay');
  };



  return (
    <div>
      <div className="topbar">
        <h2>Purchases</h2>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={() => {
            setForm({ supplier_id: '', purchase_date: today(), notes: '', items: [], payment_status: 'Unpaid', paid_amount: 0, payment_mode: 'Cash' });
            setModal('create');
          }}>
            <Plus size={14} /> New Purchase
          </button>
        </div>
      </div>
      <div className="content">
        <div className="filter-bar">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input className="form-control" style={{ paddingLeft: 32, width: 260 }} placeholder="Search purchases…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 140 }} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="card">
          {isLoading ? <div className="loading">Loading…</div> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Purchase #</th><th>Supplier</th><th>Date</th><th>Status</th><th>Total</th><th>Paid</th><th>Mode</th><th></th></tr>
                </thead>
                <tbody>
                  {(data as Purchase[]).length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>No purchases found</td></tr>}
                  {(data as Purchase[]).map((p: Purchase) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: 'var(--red)' }}>{p.purchase_no}</td>
                      <td>{p.supplier_name}</td>
                      <td style={{ fontSize: '0.78rem' }}>{p.purchase_date}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <StatusDropdown purchase={p} onUpdate={(id, s) => updateStatus.mutate({ id, status: s })} />
                      </td>
                      <td style={{ fontWeight: 600 }}>{fmt(p.total_amount)}</td>
                      <td style={{ color: p.paid_amount >= p.total_amount ? 'var(--success)' : 'var(--text3)' }}>{fmt(p.paid_amount || 0)}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{p.payment_mode || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon" onClick={() => viewPurchase(p.id)}><Eye size={14} /></button>
                          {p.payment_status !== 'Paid' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => openPay(p)} title="Add Payment">
                              <DollarSign size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {modal === 'create' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Purchase Order</h3>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Supplier *</label>
                  <select className="form-control" value={form.supplier_id} onChange={e => setForm(p => ({ ...p, supplier_id: e.target.value }))}>
                    <option value="">Select supplier…</option>
                    {(suppliers as { id: number; name: string }[]).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Purchase Date</label>
                  <input className="form-control" type="date" value={form.purchase_date} onChange={e => setForm(p => ({ ...p, purchase_date: e.target.value }))} />
                </div>
              </div>

              {/* Line Items */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label style={{ fontWeight: 600, fontSize: '0.82rem' }}>Items</label>
                  <button className="btn btn-secondary btn-sm" onClick={addLine}><Plus size={12} /> Add Line</button>
                </div>
                {form.items.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '20px 0', fontSize: '0.82rem' }}>No items added yet</div>}
                {form.items.map((line, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 120px 32px', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                    <div>
                      {i === 0 && <label style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Item</label>}
                      <select className="form-control" value={line.item_id} onChange={e => {
                        const item = (items as { id: number; name: string; cost_price: number }[]).find(it => it.id === Number(e.target.value));
                        updateLine(i, 'item_id', Number(e.target.value));
                        if (item) { updateLine(i, 'item_name', item.name); updateLine(i, 'unit_price', item.cost_price); }
                      }}>
                        <option value={0}>Select item…</option>
                        {(items as { id: number; name: string }[]).map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                      </select>
                    </div>
                    <div>
                      {i === 0 && <label style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Qty</label>}
                      <input className="form-control" type="number" min={1} value={line.qty}
                        onFocus={e => e.target.select()}
                        onChange={e => updateLine(i, 'qty', Number(e.target.value))} />
                    </div>
                    <div>
                      {i === 0 && <label style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Unit Price</label>}
                      <input className="form-control" type="number" value={line.unit_price}
                        onFocus={e => e.target.select()}
                        onChange={e => updateLine(i, 'unit_price', Number(e.target.value))} />
                    </div>
                    <button className="btn-icon" style={{ alignSelf: 'flex-end', paddingBottom: 6 }} onClick={() => removeLine(i)}><Trash2 size={13} /></button>
                  </div>
                ))}
                {form.items.length > 0 && (
                  <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', marginTop: 10 }}>
                    Total: {fmt(total)}
                  </div>
                )}
              </div>

              {/* Payment Section */}
              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px', border: '1px solid var(--border)', marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: 12 }}>Payment</div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  {['Unpaid', 'Partial', 'Paid'].map(s => (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.83rem', padding: '6px 14px', borderRadius: 8, border: `1px solid ${form.payment_status === s ? 'var(--red)' : 'var(--border)'}`, background: form.payment_status === s ? '#C0001A10' : '#fff', fontWeight: form.payment_status === s ? 600 : 400 }}>
                      <input type="radio" name="pay_status" value={s} checked={form.payment_status === s} onChange={e => setForm(p => ({ ...p, payment_status: e.target.value, paid_amount: e.target.value === 'Paid' ? total : 0 }))} style={{ accentColor: 'var(--red)' }} />
                      {s}
                    </label>
                  ))}
                </div>
                {(form.payment_status === 'Partial' || form.payment_status === 'Paid') && (
                  <div className="form-row" style={{ marginBottom: 0 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Amount Paid (LKR)</label>
                      <input className="form-control" type="number" value={form.paid_amount}
                        onFocus={e => e.target.select()}
                        onChange={e => setForm(p => ({ ...p, paid_amount: Number(e.target.value) }))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Payment Mode</label>
                      <select className="form-control" value={form.payment_mode} onChange={e => setForm(p => ({ ...p, payment_mode: e.target.value }))}>
                        {PAY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea className="form-control" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={save.isPending} onClick={() => save.mutate({ ...form, total_amount: total })}>
                {save.isPending ? 'Creating…' : 'Create Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {modal === 'pay' && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Payment: {selected.purchase_no}</h3>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.83rem' }}>
                <div><div style={{ color: 'var(--text3)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 2 }}>Total</div><strong>{fmt(selected.total_amount)}</strong></div>
                <div><div style={{ color: 'var(--text3)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 2 }}>Already Paid</div><strong style={{ color: 'var(--success)' }}>{fmt(selected.paid_amount || 0)}</strong></div>
                <div><div style={{ color: 'var(--text3)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 2 }}>Balance Due</div><strong style={{ color: 'var(--red)' }}>{fmt(selected.total_amount - (selected.paid_amount || 0))}</strong></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {['Partial', 'Paid'].map(s => (
                  <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.83rem', padding: '6px 14px', borderRadius: 8, border: `1px solid ${payForm.payment_status === s ? 'var(--red)' : 'var(--border)'}`, background: payForm.payment_status === s ? '#C0001A10' : '#fff', flex: 1, justifyContent: 'center', fontWeight: payForm.payment_status === s ? 600 : 400 }}>
                    <input type="radio" name="pay_status2" value={s} checked={payForm.payment_status === s}
                      onChange={e => setPayForm(p => ({ ...p, payment_status: e.target.value, paid_amount: e.target.value === 'Paid' ? selected.total_amount - (selected.paid_amount || 0) : p.paid_amount }))}
                      style={{ accentColor: 'var(--red)' }} />
                    {s === 'Paid' ? 'Pay in Full' : 'Part Payment'}
                  </label>
                ))}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount (LKR)</label>
                  <input className="form-control" type="number" value={payForm.paid_amount}
                    onFocus={e => e.target.select()}
                    onChange={e => setPayForm(p => ({ ...p, paid_amount: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label>Mode</label>
                  <select className="form-control" value={payForm.payment_mode} onChange={e => setPayForm(p => ({ ...p, payment_mode: e.target.value }))}>
                    {PAY_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={updatePay.isPending || !payForm.paid_amount}
                onClick={() => updatePay.mutate({ id: selected.id, data: { payment_status: payForm.payment_status, paid_amount: (selected.paid_amount || 0) + payForm.paid_amount, payment_mode: payForm.payment_mode } })}>
                {updatePay.isPending ? 'Saving…' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modal === 'view' && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selected.purchase_no}</h3>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                <Field label="Supplier" value={selected.supplier_name} />
                <Field label="Date" value={selected.purchase_date} />
                <Field label="Payment Status" value={selected.payment_status} />
                <Field label="Total Amount" value={fmt(selected.total_amount)} />
                <Field label="Paid Amount" value={fmt(selected.paid_amount || 0)} />
                <Field label="Payment Mode" value={selected.payment_mode || '—'} />
              </div>
              {selected.items && selected.items.length > 0 && (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
                    <tbody>
                      {selected.items.map((l: LineItem, i: number) => (
                        <tr key={i}>
                          <td>{l.item_name}</td>
                          <td>{l.qty}</td>
                          <td>{fmt(l.unit_price)}</td>
                          <td style={{ fontWeight: 600 }}>{fmt(l.qty * l.unit_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {selected.notes && <div style={{ marginTop: 16, fontSize: '0.82rem', color: 'var(--text2)' }}>{selected.notes}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Close</button>
              {selected.payment_status !== 'Paid' && (
                <button className="btn btn-primary" onClick={() => openPay(selected)}>
                  <DollarSign size={14} /> Add Payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function today() { return new Date().toISOString().split('T')[0]; }



function Field({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text3)', fontWeight: 500, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}
