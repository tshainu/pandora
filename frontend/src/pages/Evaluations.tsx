import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import GradeBadge from '../components/GradeBadge';
import { Pencil, Trash2, Plus, Eye, X } from 'lucide-react';

export default function Evaluations() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [month, setMonth] = useState('');
  const [viewEval, setViewEval] = useState<any>(null);

  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: api.getEmployees });
  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['evaluations', month],
    queryFn: () => api.getEvaluations({ month }),
  });

  const remove = useMutation({ mutationFn: (id: number) => api.deleteEvaluation(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['evaluations'] }) });

  const empMap: Record<number, any> = {};
  employees.forEach((e: any) => { empMap[e.id] = e; });

  return (
    <>
      <div className="topbar">
        <h2>Evaluations</h2>
        <div className="topbar-right">
          <input type="month" className="form-control" style={{ width: 'auto' }} value={month} onChange={e => setMonth(e.target.value)} />
          {month && <button className="btn btn-secondary btn-sm" onClick={() => setMonth('')}>Clear</button>}
          <button className="btn btn-primary" onClick={() => nav('/evaluate')}><Plus size={14} /> New</button>
        </div>
      </div>
      <div className="content">
        <div className="card">
          {isLoading ? <div className="loading">Loading…</div> : evaluations.length === 0 ? (
            <div className="empty"><div className="empty-icon">📋</div><p>No evaluations found</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th><th>Department</th><th>Month</th><th>Supervisor</th>
                    <th>Score</th><th>%</th><th>Grade</th><th>Recommendation</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((e: any) => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 500 }}>{e.employee_name || '—'}</td>
                      <td>{e.department || '—'}</td>
                      <td>{e.month}</td>
                      <td style={{ color: 'var(--text2)' }}>{e.supervisor_name}</td>
                      <td>{e.total_score}/70</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div className="progress-bar" style={{ width: 60 }}>
                            <div className="progress-fill" style={{ width: `${e.percentage}%`, background: '#C0001A' }} />
                          </div>
                          <span style={{ fontWeight: 600 }}>{e.percentage}%</span>
                        </div>
                      </td>
                      <td><GradeBadge pct={e.percentage} /></td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{e.recommendation}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon" title="View" onClick={() => setViewEval(e)}><Eye size={14} /></button>
                          <button className="btn-icon" title="Edit" onClick={() => nav(`/evaluate?edit=${e.id}`)}><Pencil size={14} /></button>
                          <button className="btn-icon" title="Delete" onClick={() => { if (confirm('Delete this evaluation?')) remove.mutate(e.id); }}><Trash2 size={14} /></button>
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

      {/* View Modal */}
      {viewEval && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewEval(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>Evaluation — {viewEval.employee_name} ({viewEval.month})</h3>
              <button className="btn-icon" onClick={() => setViewEval(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  ['Department', viewEval.department],
                  ['Supervisor', viewEval.supervisor_name],
                  ['Evaluation Date', viewEval.evaluation_date],
                  ['Recommendation', viewEval.recommendation],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{label}</div>
                    <div style={{ fontWeight: 500, marginTop: 2 }}>{val}</div>
                  </div>
                ))}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 10px', background: '#FAFAFA', borderBottom: '2px solid var(--border)' }}>Category</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px', background: '#FAFAFA', borderBottom: '2px solid var(--border)' }}>Score /10</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', background: '#FAFAFA', borderBottom: '2px solid var(--border)' }}>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['📅 Attendance', viewEval.attendance_score, viewEval.attendance_remark, `${viewEval.days_leave_taken} days leave`],
                    ['⏰ Punctuality', viewEval.punctuality_score, viewEval.punctuality_remark, `${viewEval.late_minutes} late mins`],
                    ['🏭 Productivity', viewEval.productivity_score, viewEval.productivity_remark, `★ ${viewEval.productivity_stars}`],
                    ['✅ Quality', viewEval.quality_score, viewEval.quality_remark, `★ ${viewEval.quality_stars}`],
                    ['🤝 Team Work', viewEval.teamwork_score, viewEval.teamwork_remark, ''],
                    ['💡 Initiative', viewEval.initiative_score, viewEval.initiative_remark, `★ ${viewEval.initiative_stars}`],
                    ['🛡️ Discipline', viewEval.discipline_score, viewEval.discipline_remark, ''],
                  ].map(([cat, score, remark, extra]) => (
                    <tr key={cat as string}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #F0F0F0' }}>
                        <div style={{ fontWeight: 500 }}>{cat}</div>
                        {extra && <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{extra}</div>}
                      </td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #F0F0F0', textAlign: 'center', fontWeight: 700, color: 'var(--red)' }}>{score}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #F0F0F0', color: 'var(--text2)' }}>{remark || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', gap: 16, marginTop: 16, padding: '14px', background: 'var(--bg)', borderRadius: 8 }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Total Score</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--red)' }}>{viewEval.total_score}/70</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Percentage</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--red)' }}>{viewEval.percentage}%</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Grade</div>
                  <div style={{ marginTop: 4 }}><GradeBadge pct={viewEval.percentage} /></div>
                </div>
              </div>
              {viewEval.supervisor_comment && (
                <div style={{ marginTop: 12, padding: 12, background: '#FFF0F2', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>Supervisor Comment</div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text2)' }}>{viewEval.supervisor_comment}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
