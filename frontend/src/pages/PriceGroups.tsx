import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';

export default function PriceGroups() {
  const qc = useQueryClient();
  const { data: groups = [], isLoading } = useQuery({ queryKey: ['price-groups'], queryFn: api.getPriceGroups });

  const [modal, setModal] = useState<null | 'create' | 'edit'>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', status: 'Active' });
  const [delConfirm, setDelConfirm] = useState<number | null>(null);

  const openCreate = () => { setForm({ name: '', description: '', status: 'Active' }); setModal('create'); };
  const openEdit = (g: any) => { setSelected(g); setForm({ name: g.name, description: g.description || '', status: g.status }); setModal('edit'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const create = useMutation({
    mutationFn: () => api.createPriceGroup(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['price-groups'] }); closeModal(); },
  });
  const update = useMutation({
    mutationFn: () => api.updatePriceGroup(selected.id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['price-groups'] }); closeModal(); },
  });
  const del = useMutation({
    mutationFn: (id: number) => api.deletePriceGroup(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['price-groups'] }); setDelConfirm(null); },
  });

  const submit = () => {
    if (!form.name.trim()) return;
    modal === 'create' ? create.mutate() : update.mutate();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Tag size={18} /> Price Groups</h2>
          <p style={{ color: 'var(--text3)', fontSize: '0.82rem', margin: 0 }}>Manage retail, wholesale, and custom pricing tiers</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> New Group</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>Loading…</div>
        ) : groups.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text3)' }}>
            <Tag size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
            <div>No price groups yet</div>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openCreate}>Create First Group</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--surface)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>#</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Name</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Description</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g: any, i: number) => (
                <tr key={g.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text3)', fontSize: '0.82rem' }}>{i + 1}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{g.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text2)', fontSize: '0.85rem' }}>{g.description || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700,
                      background: g.status === 'Active' ? '#E8F5E9' : '#FFF3E0',
                      color: g.status === 'Active' ? '#2E7D32' : '#E65100',
                    }}>{g.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button onClick={() => openEdit(g)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, marginRight: 4 }} title="Edit">
                      <Pencil size={14} />
                    </button>
                    {delConfirm === g.id ? (
                      <span>
                        <button onClick={() => del.mutate(g.id)} style={{ fontSize: '0.72rem', background: '#C0001A', color: '#fff', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', marginRight: 4 }}>Confirm</button>
                        <button onClick={() => setDelConfirm(null)} style={{ fontSize: '0.72rem', background: 'none', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}>Cancel</button>
                      </span>
                    ) : (
                      <button onClick={() => setDelConfirm(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C0001A', padding: 4 }} title="Delete">
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
          <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 28, width: 400, maxWidth: '92vw', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1rem' }}>{modal === 'create' ? 'New Price Group' : 'Edit Price Group'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Name *</label>
                <input className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Retail, Wholesale" autoFocus />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Description</label>
                <input className="form-control" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
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
