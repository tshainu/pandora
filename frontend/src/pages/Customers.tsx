import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Plus, Search, Edit2, Trash2, X, Eye, Phone, Mail, MapPin, CreditCard, ChevronDown, User } from 'lucide-react';
import AddCustomerModal from '../components/AddCustomerModal';

type Customer = {
  id: number; name: string; type: string; email: string; phone: string;
  address: string; contact_person: string; credit_limit: number;
  credit_balance: number; notes: string; opening_balance: number;
  total_orders: number; outstanding_balance: number; quality_rating: number;
};

const EMPTY: Partial<Customer> = {
  name: '', type: 'retail', email: '', phone: '', address: '',
  contact_person: '', credit_limit: 0, notes: '', opening_balance: 0, quality_rating: 100,
};

const fmt = (n: number) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(n || 0);

export default function Customers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modal, setModal] = useState<null | 'add' | 'edit' | 'view'>(null);
  const [selected, setSelected] = useState<Partial<Customer>>(EMPTY);
  const [form, setForm] = useState<Partial<Customer>>(EMPTY);
  const [phoneWarn, setPhoneWarn] = useState('');
  const phoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [addingType, setAddingType] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ['customers', search, typeFilter],
    queryFn: () => api.getCustomers({ search: search || undefined, type: typeFilter || undefined }),
  });

  const { data: types = ['retail', 'wholesale', 'corporate'], refetch: refetchTypes } = useQuery({
    queryKey: ['customer-types'],
    queryFn: () => api.getCustomerTypes(),
  });

  const save = useMutation({
    mutationFn: (d: Partial<Customer>) => d.id ? api.updateCustomer(d.id, d) : api.createCustomer(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setModal(null); setPhoneWarn(''); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.deleteCustomer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  const addTypeMutation = useMutation({
    mutationFn: (name: string) => api.addCustomerType(name),
    onSuccess: (newTypes) => {
      qc.setQueryData(['customer-types'], newTypes);
      setForm(p => ({ ...p, type: newTypeName.trim() }));
      setNewTypeName('');
      setAddingType(false);
      refetchTypes();
    },
  });

  // Phone duplicate check
  useEffect(() => {
    if (!form.phone || form.phone.length < 7) { setPhoneWarn(''); return; }
    if (phoneTimer.current) clearTimeout(phoneTimer.current);
    phoneTimer.current = setTimeout(async () => {
      try {
        const r = await api.checkCustomerPhone(form.phone!, form.id);
        if (r.exists) setPhoneWarn(`⚠ Phone already used by: ${r.customer.name}`);
        else setPhoneWarn('');
      } catch { setPhoneWarn(''); }
    }, 600);
    return () => { if (phoneTimer.current) clearTimeout(phoneTimer.current); };
  }, [form.phone, form.id]);

  const openAdd = () => { setForm(EMPTY); setPhoneWarn(''); setModal('add'); };
  const openEdit = (c: Customer) => { setForm(c); setPhoneWarn(''); setModal('edit'); };
  const openView = (c: Customer) => { setSelected(c); setModal('view'); };

  const typeBadge = (t: string) => {
    if (t === 'wholesale') return 'badge-verygood';
    if (t === 'corporate') return 'badge-excellent';
    return 'badge-good';
  };

  return (
    <div>
      <div className="topbar">
        <h2>Customers</h2>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> Add Customer</button>
        </div>
      </div>
      <div className="content">
        <div className="filter-bar">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
            <input className="form-control" style={{ paddingLeft: 32, width: 260 }} placeholder="Search by name, phone, email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 150 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {(types as string[]).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text3)' }}>
            {(data as Customer[]).length} customer{(data as Customer[]).length !== 1 ? 's' : ''}
          </div>
        </div>

        {isLoading ? <div className="loading">Loading…</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data as Customer[]).length === 0 && (
              <div className="empty">
                <div className="empty-icon">👤</div>
                <p>No customers found</p>
              </div>
            )}
            {(data as Customer[]).map((c: Customer) => (
              <div key={c.id}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 0, overflow: 'hidden', transition: 'box-shadow 0.15s, border-color 0.15s', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = 'var(--red)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'var(--border)'; }}>

                {/* Avatar */}
                <div style={{ padding: '0 18px', flexShrink: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* Name + contact person */}
                <div style={{ width: 200, flexShrink: 0, padding: '14px 16px 14px 0', borderRight: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                  {c.contact_person
                    ? <div style={{ fontSize: '0.74rem', color: 'var(--text3)', marginTop: 2 }}>{c.contact_person}</div>
                    : <div style={{ fontSize: '0.74rem', color: 'var(--text3)', marginTop: 2 }}>—</div>}
                  <span className={`badge ${typeBadge(c.type)}`} style={{ marginTop: 4, fontSize: '0.65rem' }}>{c.type}</span>
                </div>

                {/* Phone */}
                <div style={{ width: 160, flexShrink: 0, padding: '0 20px', borderRight: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Phone</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', fontWeight: 500 }}>
                    <Phone size={11} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                    {c.phone || <span style={{ color: 'var(--text3)' }}>—</span>}
                  </div>
                </div>

                {/* Email + Address */}
                <div style={{ flex: 1, padding: '0 20px', borderRight: '1px solid var(--border)', minWidth: 0 }}>
                  {c.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text3)', marginBottom: 3, overflow: 'hidden' }}>
                      <Mail size={11} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</span>
                    </div>
                  )}
                  {c.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text3)' }}>
                      <MapPin size={11} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address}</span>
                    </div>
                  )}
                  {!c.email && !c.address && <span style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>—</span>}
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', flexShrink: 0 }}>
                  <div style={{ padding: '0 20px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Orders</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{c.total_orders || 0}</div>
                  </div>
                  <div style={{ padding: '0 20px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Credit Limit</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)' }}>{fmt(c.credit_limit)}</div>
                  </div>
                  <div style={{ padding: '0 20px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Outstanding</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: (c.outstanding_balance || 0) > 0 ? 'var(--red)' : '#1B8A5A' }}>
                      {fmt(c.outstanding_balance || 0)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding: '0 14px', display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button className="btn-icon" title="View" onClick={() => openView(c)}><Eye size={14} /></button>
                  <button className="btn-icon" title="Edit" onClick={() => openEdit(c)}><Edit2 size={14} /></button>
                  <button className="btn-icon" title="Delete" onClick={() => { if (confirm('Delete this customer?')) del.mutate(c.id); }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal — shared component */}
      {modal === 'add' && (
        <AddCustomerModal
          onClose={() => setModal(null)}
          onCreated={() => setModal(null)}
        />
      )}

      {/* Edit Modal */}
      {modal === 'edit' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Customer</h3>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Phone *</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
                    <input className="form-control" style={{ paddingLeft: 30 }} value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="0XX XXX XXXX" />
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
                  <label>Type</label>
                  <div style={{ position: 'relative' }}>
                    <select className="form-control" value={form.type || 'retail'} onChange={e => {
                      if (e.target.value === '__add__') { setAddingType(true); return; }
                      setForm(p => ({ ...p, type: e.target.value }));
                    }} style={{ paddingRight: 28 }}>
                      {(types as string[]).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      <option value="__add__">+ Add new type…</option>
                    </select>
                    <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
                  </div>
                  {addingType && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <input className="form-control" placeholder="Type name…" value={newTypeName} onChange={e => setNewTypeName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && newTypeName.trim()) addTypeMutation.mutate(newTypeName.trim()); if (e.key === 'Escape') setAddingType(false); }}
                        autoFocus style={{ flex: 1 }} />
                      <button className="btn btn-primary btn-sm" onClick={() => newTypeName.trim() && addTypeMutation.mutate(newTypeName.trim())} disabled={addTypeMutation.isPending}>Add</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setAddingType(false)}>Cancel</button>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input className="form-control" type="email" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Contact Person</label>
                  <input className="form-control" value={form.contact_person || ''} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Credit Limit (LKR)</label>
                  <input className="form-control" type="number" value={form.credit_limit ?? 0}
                    onFocus={e => e.target.select()}
                    onChange={e => setForm(p => ({ ...p, credit_limit: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Opening Balance (LKR)</label>
                <input className="form-control" type="number" value={form.opening_balance ?? 0}
                  onFocus={e => e.target.select()}
                  onChange={e => setForm(p => ({ ...p, opening_balance: Number(e.target.value) }))}
                  placeholder="Balance brought forward from previous system" />
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea className="form-control" value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea className="form-control" value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Customer Quality Rating</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="range" min={0} max={100} step={1}
                    value={form.quality_rating ?? 100}
                    onChange={e => setForm(p => ({ ...p, quality_rating: Number(e.target.value) }))}
                    style={{ flex: 1, accentColor: (form.quality_rating ?? 100) >= 80 ? '#16A34A' : (form.quality_rating ?? 100) >= 50 ? '#D97706' : '#DC2626' }}
                  />
                  <span style={{
                    fontWeight: 800, fontSize: '1rem', minWidth: 46, textAlign: 'right',
                    color: (form.quality_rating ?? 100) >= 80 ? '#16A34A' : (form.quality_rating ?? 100) >= 50 ? '#D97706' : '#DC2626'
                  }}>{form.quality_rating ?? 100}%</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 3 }}>
                  Default 100% — lower if customer has bad reviews, disputes, or other concerns. Affects ranking.
                </div>
              </div>
              {save.isError && <div className="alert alert-danger" style={{ marginTop: 8 }}>{String((save.error as Error)?.message)}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={save.isPending || !form.name} onClick={() => save.mutate(form)}>
                {save.isPending ? 'Saving…' : 'Save Customer'}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
                  {(selected.name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>{selected.name}</h3>
                  <span className={`badge ${typeBadge(selected.type || '')}`} style={{ marginTop: 2 }}>{selected.type}</span>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Phone" value={selected.phone} icon={<Phone size={12} />} />
                <Field label="Email" value={selected.email} icon={<Mail size={12} />} />
                <Field label="Contact Person" value={selected.contact_person} icon={<User size={12} />} />
                <Field label="Credit Limit" value={fmt(selected.credit_limit || 0)} icon={<CreditCard size={12} />} />
                <Field label="Opening Balance" value={fmt(selected.opening_balance || 0)} />
                <Field label="Outstanding Balance" value={fmt((selected as any).outstanding_balance || 0)} />
                <Field label="Total Orders" value={String((selected as any).total_orders || 0)} />
              </div>
              {selected.address && (
                <div style={{ marginTop: 12 }}>
                  <Field label="Address" value={selected.address} icon={<MapPin size={12} />} />
                </div>
              )}
              {selected.notes && (
                <div style={{ marginTop: 12 }}>
                  <Field label="Notes" value={selected.notes} />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => openEdit(selected as Customer)}>Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, icon }: { label: string; value?: string | number; icon?: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text3)', fontWeight: 600, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}
