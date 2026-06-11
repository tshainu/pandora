import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';

const DEPARTMENTS = ['Cutting', 'Sewing', 'Finishing', 'Quality Control', 'Warehouse', 'Administration', 'HR', 'Production', 'Maintenance'];

const blank = { name: '', department: '', position: '', employee_id: '' };

export default function Employees() {
  const qc = useQueryClient();
  const { data: employees = [], isLoading } = useQuery({ queryKey: ['employees'], queryFn: api.getEmployees });
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<null | 'add' | 'edit'>(null);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const create = useMutation({ mutationFn: (d: object) => api.createEmployee(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); close(); } });
  const update = useMutation({ mutationFn: ({ id, d }: { id: number; d: object }) => api.updateEmployee(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); close(); } });
  const remove = useMutation({ mutationFn: (id: number) => api.deleteEmployee(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }) });

  function close() { setModal(null); setForm(blank); setEditId(null); setError(''); }
  function openAdd() { setForm(blank); setModal('add'); }
  function openEdit(e: any) { setForm({ name: e.name, department: e.department, position: e.position, employee_id: e.employee_id }); setEditId(e.id); setModal('edit'); }

  async function save() {
    if (!form.name || !form.department || !form.position || !form.employee_id) { setError('All fields required'); return; }
    if (modal === 'add') create.mutate(form);
    else if (editId) update.mutate({ id: editId, d: form });
  }

  const filtered = employees.filter((e: any) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="topbar">
        <h2>Employees</h2>
        <div className="topbar-right">
          <button className="btn btn-primary" onClick={openAdd}><Plus size={14} /> Add Employee</button>
        </div>
      </div>
      <div className="content">
        <div className="card">
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
              <input className="form-control" style={{ paddingLeft: 32 }} placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text3)', alignSelf: 'center' }}>{filtered.length} employees</span>
          </div>

          {isLoading ? <div className="loading">Loading…</div> : filtered.length === 0 ? (
            <div className="empty"><div className="empty-icon">👥</div><p>No employees found</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Name</th><th>Department</th><th>Position</th><th>Joined</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e: any) => (
                    <tr key={e.id}>
                      <td><span className="badge badge-verygood">{e.employee_id}</span></td>
                      <td style={{ fontWeight: 500 }}>{e.name}</td>
                      <td>{e.department}</td>
                      <td style={{ color: 'var(--text2)' }}>{e.position}</td>
                      <td style={{ color: 'var(--text3)' }}>{new Date(e.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon" onClick={() => openEdit(e)}><Pencil size={14} /></button>
                          <button className="btn-icon" onClick={() => { if (confirm(`Delete ${e.name}?`)) remove.mutate(e.id); }}><Trash2 size={14} /></button>
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

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal">
            <div className="modal-header">
              <h3>{modal === 'add' ? 'Add Employee' : 'Edit Employee'}</h3>
              <button className="btn-icon" onClick={close}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Employee name" />
                </div>
                <div className="form-group">
                  <label>Employee ID</label>
                  <input className="form-control" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} placeholder="e.g. PG001" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <select className="form-control" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <input className="form-control" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} placeholder="e.g. Machine Operator" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={close}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={create.isPending || update.isPending}>
                {create.isPending || update.isPending ? 'Saving…' : 'Save Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
