import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';

export default function AddonItems() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({ queryKey: ['addon-items'], queryFn: api.getAddonItems });

  const [modal, setModal] = useState<null | 'create' | 'edit'>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ name: '', default_price: '', unit: 'pcs', status: 'Active' });
  const [delConfirm, setDelConfirm] = useState<number | null>(null);

  const openCreate = () => { setForm({ name: '', default_price: '', unit: 'pcs', status: 'Active' }); setModal('create'); };
  const openEdit = (it: any) => { setSelected(it); setForm({ name: it.name, default_price: String(it.default_price ?? ''), unit: it.unit || 'pcs', status: it.status }); setModal('edit'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const payload = () => ({ name: form.name, default_price: parseFloat(form.default_price) || 0, unit: form.unit, status: form.status });

  const create = useMutation({
    mutationFn: () => api.createAddonItem(payload()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addon-items'] }); closeModal(); },
  });
  const update = useMutation({
    mutationFn: () => api.updateAddonItem(selected.id, payload()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addon-items'] }); closeModal(); },
  });
  const del = useMutation({
    mutationFn: (id: number) => api.deleteAddonItem(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['addon-items'] }); setDelConfirm(null); },
  });

  const submit = () => {
    if (!form.name.trim()) return;
    modal === 'create' ? create.mutate() : update.mutate();
  };

  const fmt = (n: number) => n.toLocaleString('en-LK', { minimumFractionDigits: 2 });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Package size={18} /> Add-on Items</h2>
          <p style={{ color: 'var(--text3)', fontSize: '0.82rem', margin: 0 }}>Manage add-on services and charges added to invoices</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> New Add-on</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)' }}>
            <Package size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
            <div>No add-on items yet</div>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openCreate}>Create First Add-on</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--surface)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>#</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Name</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Default Price</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Unit</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any, i: number) => (
                <tr key={it.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text3)', fontSize: '0.82rem' }}>{i + 1}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{it.name}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)' }}>Rs. {fmt(it.default_price || 0)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text2)', fontSize: '0.85rem' }}>{it.unit}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700,
                      background: it.status === 'Active' ? '#E8F5E9' : '#FFF3E0',
                      color: it.status === 'Active' ? '#2E7D32' : '#E65100',
                    }}>{it.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button onClick={() => openEdit(it)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, marginRight: 4 }} title="Edit">
                      <Pencil size={14} />
                    </button>
                    {delConfirm === it.id ? (
                      <span>
                        <button onClick={() => del.mutate(it.id)} style={{ fontSize: '0.72rem', background: '#C0001A', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', marginRight: 4 }}>Confirm</button>
                        <button onClick={() => setDelConfirm(null)} style={{ fontSize: '0.72rem', background: 'none', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}>Cancel</button>
                      </span>
                    ) : (
                      <button onClick={() => setDelConfirm(it.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C0001A', padding: 4 }} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 28, width: 420, maxWidth: '92vw', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1rem' }}>{modal === 'create' ? 'New Add-on Item' : 'Edit Add-on Item'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Name *</label>
                <input className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Delivery, Packaging, Alterations" autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Default Price</label>
                  <input className="form-control" type="number" min={0} step="0.01" value={form.default_price} onChange={e => setForm(p => ({ ...p, default_price: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Unit</label>
                  <select className="form-control" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}>
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="m">m</option>
                    <option value="hr">hr</option>
                    <option value="set">set</option>
                    <option value="job">job</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Status</label>
                <select className="form-control" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={submit} disabled={create.isPending || update.isPending || !form.name.trim()}>
                {create.isPending || update.isPending ? 'Saving…' : modal === 'create' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
