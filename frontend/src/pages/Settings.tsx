import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Save } from 'lucide-react';

export default function Settings() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'company' | 'numbering'>('company');
  const [form, setForm] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => api.getSettings() });

  useEffect(() => { if (data) setForm(data as Record<string, string>); }, [data]);

  const save = useMutation({
    mutationFn: (d: object) => api.updateSettings(d),
    onSuccess: (res: { settings: Record<string, string> }) => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setForm(res.settings || res as unknown as Record<string, string>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (isLoading) return <div className="loading">Loading settings…</div>;

  return (
    <div>
      <div className="topbar">
        <h2>Settings</h2>
        <div className="topbar-right">
          <button className="btn btn-primary" disabled={save.isPending} onClick={() => save.mutate(form)}>
            <Save size={14} /> {save.isPending ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
      <div className="content">
        {saved && <div className="alert alert-success" style={{ marginBottom: 20 }}>Settings saved successfully</div>}
        <div className="tabs">
          <button className={`tab ${tab === 'company' ? 'active' : ''}`} onClick={() => setTab('company')}>Company Info</button>
          <button className={`tab ${tab === 'numbering' ? 'active' : ''}`} onClick={() => setTab('numbering')}>Number Series</button>
        </div>

        {tab === 'company' && (
          <div className="card" style={{ maxWidth: 640 }}>
            <div className="card-title">Company Information</div>
            <div className="form-row">
              <div className="form-group"><label>Company Name</label><input className="form-control" value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="form-group"><label>Phone</label><input className="form-control" value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Email</label><input className="form-control" type="email" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label>Address</label><textarea className="form-control" value={form.address || ''} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
          </div>
        )}

        {tab === 'numbering' && (
          <div className="card" style={{ maxWidth: 640 }}>
            <div className="card-title">Document Number Series</div>
            <div style={{ background: '#FFFDE7', border: '1px solid #FFC107', borderRadius: 8, padding: '10px 14px', fontSize: '0.78rem', marginBottom: 20, color: '#795548' }}>
              Changing prefix will apply to new documents only. Sequence resets are irreversible.
            </div>
            {[
              { key: 'order_prefix', seq: 'order_seq', label: 'Orders' },
              { key: 'invoice_prefix', seq: 'invoice_seq', label: 'Invoices' },
              { key: 'quotation_prefix', seq: 'quotation_seq', label: 'Quotations' },
            ].map(({ key, seq, label }) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 16, alignItems: 'end', marginBottom: 16 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, paddingBottom: 8 }}>{label}</div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Prefix</label>
                  <input className="form-control" value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder="e.g. ORD-" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Next Sequence</label>
                  <input className="form-control" type="number" value={form[seq] || 1} onChange={e => setForm(p => ({ ...p, [seq]: e.target.value }))} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: 10, padding: '12px 16px', background: '#FAFAFA', borderRadius: 8, fontSize: '0.78rem', color: 'var(--text3)' }}>
              <strong>Preview:</strong>{' '}
              {(form.order_prefix || 'ORD-')}{String(form.order_seq || 1).padStart(4, '0')},{' '}
              {(form.invoice_prefix || 'INV-')}{String(form.invoice_seq || 1).padStart(4, '0')},{' '}
              {(form.quotation_prefix || 'QT-')}{String(form.quotation_seq || 1).padStart(4, '0')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
