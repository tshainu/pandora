import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Plus, Search, Edit2, Trash2, X, Eye, Phone, Mail, MapPin, Building2 } from 'lucide-react';

type Supplier = {
  id: number; name: string; company: string; contact_person: string; phone: string;
  email: string; address: string; payment_terms: string; notes: string;
  total_business: number; outstanding: number;
};

const EMPTY: Partial<Supplier> = {
  name: '', company: '', contact_person: '', phone: '', email: '',
  address: '', payment_terms: 'net30', notes: '',
};

const fmt = (n: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(n || 0);

export default function Suppliers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<null | 'add' | 'edit' | 'view'>(null);
  const [form, setForm] = useState<Partial<Supplier>>(EMPTY);
  const [selected, setSelected] = useState<Partial<Supplier>>(EMPTY);
  const [phoneWarn, setPhoneWarn] = useState('');
  const phoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => api.getSuppliers({ search: search || undefined }),
  });

  const save = useMutation({
    mutationFn: (d: Partial<Supplier>) => d.id ? api.updateSupplier(d.id, d) : api.createSupplier(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setModal(null); setPhoneWarn(''); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.deleteSupplier(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });

  // Phone duplicate check
  useEffect(() => {
    if (!form.phone || form.phone.length < 7) { setPhoneWarn(''); return; }
    if (phoneTimer.current) clearTimeout(phoneTimer.current);
    phoneTimer.current = setTimeout(async () => {
      try {
        const r = await api.checkSupplierPhone(form.phone!, form.id);
        if (r.exists) setPhoneWarn(`⚠ Phone already used by: ${r.supplier.name}`);
        else setPhoneWarn('');
      } catch { setPhoneWarn(''); }
    }, 600);
    return () => { if (phoneTimer.current) clearTimeout(phoneTimer.current); };
  }, [form.phone, form.id]);

  const openAdd = () => { setForm(EMPTY); setPhoneWarn(''); setModal('add'); };
  const openEdit = (s: Supplier) => { setForm(s); setPhoneWarn(''); setModal('edit'); };
  const openView = (s: Supplier) => { setSelected(s); setModal('view'); };

  return (
    <div>
      <div className="topbar">
        <h2>Suppliers</h2>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> Add Supplier</button>
        </div>
      </div>
      <div className="content">
        <div className="filter-bar">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input className="form-control" style={{ paddingLeft: 32, width: 280 }} placeholder="Search suppliers…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text3)' }}>
            {(data as Supplier[]).length} supplier{(data as Supplier[]).length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="card">
          {isLoading ? <div className="loading">Loading…</div> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name / Company</th>
                    <th>Phone</th>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>Total Business</th>
                    <th>Outstanding</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(data as Supplier[]).length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>No suppliers found</td></tr>
                  )}
                  {(data as Supplier[]).map((s: Supplier) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        {s.company && <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{s.company}</div>}
                      </td>
                      <td style={{ fontWeight: 500 }}>{s.phone || (s as any).mobile || '—'}</td>
                      <td style={{ color: 'var(--text3)' }}>{s.contact_person || '—'}</td>
                      <td style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>{s.email || '—'}</td>
                      <td style={{ fontWeight: 600, color: 'var(--success)' }}>{fmt(s.total_business || 0)}</td>
                      <td style={{ color: (s.outstanding || 0) > 0 ? 'var(--red)' : 'var(--text3)' }}>{fmt(s.outstanding || 0)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon" onClick={() => openView(s)}><Eye size={14} /></button>
                          <button className="btn-icon" onClick={() => openEdit(s)}><Edit2 size={14} /></button>
                          <button className="btn-icon" onClick={() => { if (confirm('Delete supplier?')) del.mutate(s.id); }}><Trash2 size={14} /></button>
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

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modal === 'add' ? 'Add Supplier' : 'Edit Supplier'}</h3>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {/* Phone first */}
              <div className="form-row">
                <div className="form-group">
                  <label>Phone *</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                    <input className="form-control" style={{ paddingLeft: 30 }} value={form.phone || (form as any).mobile || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value, mobile: e.target.value }))} placeholder="0XX XXX XXXX" />
                  </div>
                  {phoneWarn && <div style={{ fontSize: '0.72rem', color: '#E65100', marginTop: 4 }}>{phoneWarn}</div>}
                </div>
                <div className="form-group">
                  <label>Name *</label>
                  <input className="form-control" value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Company / Business Name</label>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                    <input className="form-control" style={{ paddingLeft: 30 }} value={form.company || ''} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Contact Person</label>
                  <input className="form-control" value={form.contact_person || ''} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                    <input className="form-control" style={{ paddingLeft: 30 }} type="email" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Payment Terms</label>
                  <select className="form-control" value={form.payment_terms || 'net30'} onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))}>
                    <option value="immediate">Immediate</option>
                    <option value="net15">Net 15</option>
                    <option value="net30">Net 30</option>
                    <option value="net60">Net 60</option>
                    <option value="net90">Net 90</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={13} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text3)' }} />
                  <textarea className="form-control" style={{ paddingLeft: 30 }} value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea className="form-control" value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              {save.isError && <div className="alert alert-danger" style={{ marginTop: 8 }}>{String((save.error as Error)?.message)}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={save.isPending || !form.name} onClick={() => save.mutate(form)}>
                {save.isPending ? 'Saving…' : 'Save Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {modal === 'view' && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>{selected.name}</h3>
                {selected.company && <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginTop: 2 }}>{selected.company}</div>}
              </div>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {/* Business summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ background: '#2E7D3210', border: '1px solid #2E7D3230', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total Business Done</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2E7D32' }}>{fmt((selected as any).total_business || 0)}</div>
                </div>
                <div style={{ background: (selected as any).outstanding > 0 ? '#C0001A10' : '#eee', border: `1px solid ${(selected as any).outstanding > 0 ? '#C0001A30' : '#ddd'}`, borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Outstanding</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: (selected as any).outstanding > 0 ? 'var(--red)' : 'var(--text3)' }}>{fmt((selected as any).outstanding || 0)}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Phone" value={(selected as any).phone || (selected as any).mobile} />
                <Field label="Email" value={selected.email} />
                <Field label="Contact Person" value={selected.contact_person} />
                <Field label="Payment Terms" value={selected.payment_terms} />
              </div>
              {selected.address && <div style={{ marginTop: 12 }}><Field label="Address" value={selected.address} /></div>}
              {selected.notes && <div style={{ marginTop: 12 }}><Field label="Notes" value={selected.notes} /></div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => openEdit(selected as Supplier)}>Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text3)', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}
