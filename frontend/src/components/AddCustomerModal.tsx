import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Phone, X, ChevronDown } from 'lucide-react';

type Customer = {
  id?: number; name: string; type: string; email: string; phone: string;
  address: string; contact_person: string; credit_limit: number;
  credit_balance?: number; notes: string; opening_balance: number;
  total_orders?: number; outstanding_balance?: number; quality_rating: number;
};

const EMPTY: Partial<Customer> = {
  name: '', type: 'retail', email: '', phone: '', address: '',
  contact_person: '', credit_limit: 0, notes: '', opening_balance: 0, quality_rating: 100,
};

interface Props {
  onClose: () => void;
  /** Called with the newly created customer object */
  onCreated: (c: Customer) => void;
}

export default function AddCustomerModal({ onClose, onCreated }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Customer>>(EMPTY);
  const [phoneWarn, setPhoneWarn] = useState('');
  const phoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [addingType, setAddingType] = useState(false);

  const { data: types = ['retail', 'wholesale', 'corporate'] } = useQuery({
    queryKey: ['customer-types'],
    queryFn: () => api.getCustomerTypes(),
  });

  const addTypeMutation = useMutation({
    mutationFn: (name: string) => api.addCustomerType(name),
    onSuccess: (newTypes) => {
      qc.setQueryData(['customer-types'], newTypes);
      setForm(p => ({ ...p, type: newTypeName.trim() }));
      setNewTypeName('');
      setAddingType(false);
    },
  });

  const save = useMutation({
    mutationFn: (d: Partial<Customer>) => api.createCustomer(d),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setPhoneWarn('');
      onCreated(created);
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Customer</h3>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
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
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={save.isPending || !form.name} onClick={() => save.mutate(form)}>
            {save.isPending ? 'Saving…' : 'Save Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}
