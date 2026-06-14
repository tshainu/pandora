import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import GradeBadge from '../components/GradeBadge';
import { Pencil, Trash2, Plus, Eye, X, BarChart2, List } from 'lucide-react';

// ── helpers ────────────────────────────────────────────────────────────────
function ScoreBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 80 ? '#16A34A' : pct >= 60 ? '#D97706' : '#DC2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden', minWidth: 40 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontWeight: 600, fontSize: '0.78rem', color, minWidth: 28, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function formatMonth(m: string) {
  if (!m) return '—';
  const [y, mo] = m.split('-');
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${names[parseInt(mo) - 1]} ${y}`;
}

// ── EvalDetailModal ────────────────────────────────────────────────────────
function EvalDetailModal({ ev, onClose }: { ev: any; onClose: () => void }) {
  const pct = ev.percentage;
  const gradeColor = pct >= 90 ? '#166534' : pct >= 80 ? '#1e40af' : pct >= 70 ? '#92400e' : pct >= 60 ? '#5b21b6' : '#991b1b';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3>Evaluation — {ev.employee_name} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({formatMonth(ev.month)})</span></h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            {[
              ['Department', ev.department],
              ['Supervisor', ev.supervisor_name],
              ['Evaluation Date', ev.evaluation_date],
              ['Recommendation', ev.recommendation],
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
                ['📅 Attendance', ev.attendance_score, ev.attendance_remark, `${ev.days_leave_taken} days leave`],
                ['⏰ Punctuality', ev.punctuality_score, ev.punctuality_remark, `${ev.late_minutes} late mins`],
                ['🏭 Productivity', ev.productivity_score, ev.productivity_remark, `★ ${ev.productivity_stars}`],
                ['✅ Quality', ev.quality_score, ev.quality_remark, `★ ${ev.quality_stars}`],
                ['🤝 Team Work', ev.teamwork_score, ev.teamwork_remark, ''],
                ['💡 Initiative', ev.initiative_score, ev.initiative_remark, `★ ${ev.initiative_stars}`],
                ['🛡️ Discipline', ev.discipline_score, ev.discipline_remark, ''],
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

          <div style={{ display: 'flex', gap: 16, marginTop: 16, padding: 14, background: 'var(--bg)', borderRadius: 8 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Total Score</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: gradeColor }}>{ev.total_score}/70</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Percentage</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: gradeColor }}>{ev.percentage}%</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Grade</div>
              <div style={{ marginTop: 4 }}><GradeBadge pct={ev.percentage} /></div>
            </div>
          </div>

          {ev.supervisor_comment && (
            <div style={{ marginTop: 12, padding: 12, background: '#FFF0F2', borderRadius: 8 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--red)', marginBottom: 4 }}>Supervisor Comment</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text2)', margin: 0 }}>{ev.supervisor_comment}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SummaryDetailModal ─────────────────────────────────────────────────────
function SummaryDetailModal({ row, onClose }: { row: any; onClose: () => void }) {
  const pct = row.avg_percentage;
  const gradeColor = pct >= 90 ? '#166534' : pct >= 80 ? '#1e40af' : pct >= 70 ? '#92400e' : pct >= 60 ? '#5b21b6' : '#991b1b';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3>Monthly Summary — {row.employee_name} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({formatMonth(row.month)})</span></h3>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {/* meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
            {[
              ['Department', row.department],
              ['Month', formatMonth(row.month)],
              ['Evaluations Done', `${row.eval_count} session${row.eval_count !== 1 ? 's' : ''}`],
            ].map(([label, val]) => (
              <div key={label} style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 8 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{label}</div>
                <div style={{ fontWeight: 500, marginTop: 2 }}>{val}</div>
              </div>
            ))}
          </div>

          {/* breakdown */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 10px', background: '#FAFAFA', borderBottom: '2px solid var(--border)' }}>Category</th>
                <th style={{ textAlign: 'right', padding: '8px 10px', background: '#FAFAFA', borderBottom: '2px solid var(--border)' }}>Avg Score /10</th>
                <th style={{ padding: '8px 10px', background: '#FAFAFA', borderBottom: '2px solid var(--border)', minWidth: 120 }}>Bar</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['📅 Attendance', row.avg_attendance, `avg ${row.avg_leave} days leave`],
                ['⏰ Punctuality', row.avg_punctuality, `avg ${row.avg_late_minutes} late mins`],
                ['🏭 Productivity', row.avg_productivity, ''],
                ['✅ Quality', row.avg_quality, ''],
                ['🤝 Team Work', row.avg_teamwork, ''],
                ['💡 Initiative', row.avg_initiative, ''],
                ['🛡️ Discipline', row.avg_discipline, ''],
              ].map(([cat, score, note]) => (
                <tr key={cat as string}>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #F0F0F0' }}>
                    <div style={{ fontWeight: 500 }}>{cat}</div>
                    {note && <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{note}</div>}
                  </td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #F0F0F0', textAlign: 'right', fontWeight: 700, color: 'var(--red)' }}>{score}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #F0F0F0' }}>
                    <ScoreBar value={Number(score)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: 16, marginTop: 16, padding: 14, background: 'var(--bg)', borderRadius: 8 }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Avg Total /70</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: gradeColor }}>{row.avg_total}</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Avg Score %</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: gradeColor }}>{row.avg_percentage}%</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Grade</div>
              <div style={{ marginTop: 4 }}><GradeBadge pct={row.avg_percentage} /></div>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: '10px 14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: '0.78rem', color: '#1e40af' }}>
            This summary averages <strong>{row.eval_count}</strong> evaluation{row.eval_count !== 1 ? 's' : ''} done for {row.employee_name} in {formatMonth(row.month)}.
            Individual evaluations are visible in the <strong>All Evaluations</strong> tab.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Evaluations() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [tab, setTab] = useState<'all' | 'summary'>('all');
  const [month, setMonth] = useState('');
  const [viewEval, setViewEval] = useState<any>(null);
  const [viewSummary, setViewSummary] = useState<any>(null);

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['evaluations', month],
    queryFn: () => api.getEvaluations({ month: month || undefined }),
  });

  const { data: summaries = [], isLoading: summLoading } = useQuery({
    queryKey: ['evaluations-summary', month],
    queryFn: () => api.getEvaluationSummary({ month: month || undefined }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteEvaluation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evaluations'] });
      qc.invalidateQueries({ queryKey: ['evaluations-summary'] });
    },
  });

  return (
    <>
      <div className="topbar">
        <h2>Staff Evaluations</h2>
        <div className="topbar-right">
          <input type="month" className="form-control" style={{ width: 'auto' }} value={month} onChange={e => setMonth(e.target.value)} placeholder="Filter by month" />
          {month && <button className="btn btn-secondary btn-sm" onClick={() => setMonth('')}>Clear</button>}
          <button className="btn btn-primary" onClick={() => nav('/evaluate')}><Plus size={14} /> New Evaluation</button>
        </div>
      </div>

      <div className="content">
        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button
            className={`tab ${tab === 'all' ? 'active' : ''}`}
            onClick={() => setTab('all')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <List size={14} /> All Evaluations
            {evaluations.length > 0 && (
              <span style={{ background: 'var(--accent,#6366f1)', color: '#fff', borderRadius: 10, fontSize: '0.68rem', padding: '1px 7px', fontWeight: 700 }}>
                {evaluations.length}
              </span>
            )}
          </button>
          <button
            className={`tab ${tab === 'summary' ? 'active' : ''}`}
            onClick={() => setTab('summary')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <BarChart2 size={14} /> Monthly Summary
            {summaries.length > 0 && (
              <span style={{ background: '#0891b2', color: '#fff', borderRadius: 10, fontSize: '0.68rem', padding: '1px 7px', fontWeight: 700 }}>
                {summaries.length}
              </span>
            )}
          </button>
        </div>

        {/* ── ALL EVALUATIONS ── */}
        {tab === 'all' && (
          <div className="card">
            {isLoading ? <div className="loading">Loading…</div> : evaluations.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📋</div>
                <p>No evaluations found{month ? ` for ${formatMonth(month)}` : ''}</p>
                <button className="btn btn-primary btn-sm" onClick={() => nav('/evaluate')}>
                  <Plus size={13} /> Add First Evaluation
                </button>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Dept</th>
                      <th>Date</th>
                      <th>Month</th>
                      <th>Supervisor</th>
                      <th>Score</th>
                      <th>%</th>
                      <th>Grade</th>
                      <th>Recommendation</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluations.map((e: any) => (
                      <tr key={e.id}>
                        <td style={{ fontWeight: 500 }}>{e.employee_name || '—'}</td>
                        <td style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>{e.department || '—'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>{e.evaluation_date || '—'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>{formatMonth(e.month)}</td>
                        <td style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>{e.supervisor_name}</td>
                        <td style={{ fontWeight: 600 }}>{e.total_score}/70</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div className="progress-bar" style={{ width: 52 }}>
                              <div className="progress-fill" style={{ width: `${e.percentage}%`, background: '#C0001A' }} />
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{e.percentage}%</span>
                          </div>
                        </td>
                        <td><GradeBadge pct={e.percentage} /></td>
                        <td><span style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{e.recommendation}</span></td>
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
        )}

        {/* ── MONTHLY SUMMARY ── */}
        {tab === 'summary' && (
          <div>
            {/* Info banner */}
            <div style={{
              background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10,
              padding: '12px 16px', marginBottom: 16, fontSize: '0.82rem', color: '#0c4a6e',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <BarChart2 size={16} style={{ flexShrink: 0 }} />
              <span>
                Each row shows the <strong>average</strong> of all evaluations done for that employee in that month —
                no matter how many times you evaluated them. Evaluate as often as needed; the summary always reflects the monthly average.
              </span>
            </div>

            <div className="card">
              {summLoading ? <div className="loading">Loading…</div> : summaries.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">📊</div>
                  <p>No summary data{month ? ` for ${formatMonth(month)}` : ''}</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Dept</th>
                        <th>Month</th>
                        <th style={{ textAlign: 'center' }}>Sessions</th>
                        <th>Attend</th>
                        <th>Punct</th>
                        <th>Prod</th>
                        <th>Quality</th>
                        <th>Team</th>
                        <th>Init</th>
                        <th>Disc</th>
                        <th>Avg %</th>
                        <th>Grade</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaries.map((s: any, i: number) => {
                        const pct = s.avg_percentage;
                        const color = pct >= 80 ? '#16A34A' : pct >= 60 ? '#D97706' : '#DC2626';
                        return (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{s.employee_name}</td>
                            <td style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>{s.department}</td>
                            <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', color: 'var(--text2)' }}>{formatMonth(s.month)}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block', background: '#EFF6FF', color: '#1D4ED8',
                                borderRadius: 20, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700,
                              }}>{s.eval_count}×</span>
                            </td>
                            {[s.avg_attendance, s.avg_punctuality, s.avg_productivity, s.avg_quality, s.avg_teamwork, s.avg_initiative, s.avg_discipline].map((v, vi) => (
                              <td key={vi} style={{ fontWeight: 600, fontSize: '0.82rem', color: Number(v) >= 7 ? '#16A34A' : Number(v) >= 5 ? '#D97706' : '#DC2626' }}>
                                {v}
                              </td>
                            ))}
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div className="progress-bar" style={{ width: 50 }}>
                                  <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                                </div>
                                <span style={{ fontWeight: 700, fontSize: '0.82rem', color }}>{pct}%</span>
                              </div>
                            </td>
                            <td><GradeBadge pct={pct} /></td>
                            <td>
                              <button className="btn-icon" title="View breakdown" onClick={() => setViewSummary(s)}>
                                <Eye size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {viewEval && <EvalDetailModal ev={viewEval} onClose={() => setViewEval(null)} />}
      {viewSummary && <SummaryDetailModal row={viewSummary} onClose={() => setViewSummary(null)} />}
    </>
  );
}
