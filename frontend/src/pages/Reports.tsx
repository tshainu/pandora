import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import GradeBadge from '../components/GradeBadge';

const REPORT_TABS = [
  { key: 'top-performers', label: '🏆 Top Performers' },
  { key: 'attendance', label: '📅 Attendance Issues' },
  { key: 'discipline', label: '🛡️ Discipline Issues' },
  { key: 'salary-increment', label: '💰 Salary Increment' },
  { key: 'training-needs', label: '📚 Training Needs' },
  { key: 'risk-employees', label: '⚠️ Risk Employees' },
];

const COLUMNS: Record<string, { label: string; key: string; render?: (v: any, row: any) => any }[]> = {
  'top-performers': [
    { label: 'Rank', key: '_rank' },
    { label: 'Employee', key: 'employeeName' },
    { label: 'Department', key: 'department' },
    { label: 'Month', key: 'month' },
    { label: 'Score', key: 'percentage', render: (v) => `${v}%` },
    { label: 'Grade', key: 'percentage', render: (v) => <GradeBadge pct={v} /> },
  ],
  'attendance': [
    { label: 'Employee', key: 'employeeName' },
    { label: 'Department', key: 'department' },
    { label: 'Month', key: 'month' },
    { label: 'Days Leave', key: 'days_leave_taken', render: (v) => <span style={{ color: '#C0001A', fontWeight: 700 }}>{v} days</span> },
    { label: 'Attendance Score', key: 'attendance_score', render: (v) => `${v}/10` },
    { label: 'Remark', key: 'attendance_remark' },
  ],
  'discipline': [
    { label: 'Employee', key: 'employeeName' },
    { label: 'Department', key: 'department' },
    { label: 'Month', key: 'month' },
    { label: 'Discipline Score', key: 'discipline_score', render: (v) => <span style={{ color: '#C0001A', fontWeight: 700 }}>{v}/10</span> },
    { label: 'Remark', key: 'discipline_remark' },
  ],
  'salary-increment': [
    { label: 'Employee', key: 'employeeName' },
    { label: 'Department', key: 'department' },
    { label: 'Month', key: 'month' },
    { label: 'Score', key: 'percentage', render: (v) => `${v}%` },
    { label: 'Grade', key: 'percentage', render: (v) => <GradeBadge pct={v} /> },
    { label: 'Recommendation', key: 'recommendation' },
  ],
  'training-needs': [
    { label: 'Employee', key: 'employeeName' },
    { label: 'Department', key: 'department' },
    { label: 'Month', key: 'month' },
    { label: 'Initiative Score', key: 'initiative_score', render: (v) => <span style={{ color: '#F57C00', fontWeight: 700 }}>{v}/10</span> },
    { label: 'Remark', key: 'initiative_remark' },
  ],
  'risk-employees': [
    { label: 'Employee', key: 'employeeName' },
    { label: 'Department', key: 'department' },
    { label: 'Month', key: 'month' },
    { label: 'Score', key: 'percentage', render: (v) => <span style={{ color: '#C0001A', fontWeight: 700 }}>{v}%</span> },
    { label: 'Grade', key: 'percentage', render: (v) => <GradeBadge pct={v} /> },
    { label: 'Recommendation', key: 'recommendation' },
  ],
};

export default function Reports() {
  const [tab, setTab] = useState('top-performers');
  const [month, setMonth] = useState('');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['report', tab, month],
    queryFn: () => api.getReport(tab, month),
  });

  const cols = COLUMNS[tab] || [];

  return (
    <>
      <div className="topbar">
        <h2>Reports</h2>
        <div className="topbar-right">
          <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text2)' }}>Month:</label>
          <input type="month" className="form-control" style={{ width: 'auto' }} value={month} onChange={e => setMonth(e.target.value)} />
          {month && <button className="btn btn-secondary btn-sm" onClick={() => setMonth('')}>Clear</button>}
        </div>
      </div>
      <div className="content">
        <div className="tabs">
          {REPORT_TABS.map(t => (
            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        <div className="card">
          <div className="section-header">
            <h2>{REPORT_TABS.find(t => t.key === tab)?.label}</h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text3)' }}>{rows.length} records</span>
          </div>

          {isLoading ? <div className="loading">Loading…</div> : rows.length === 0 ? (
            <div className="empty"><div className="empty-icon">📊</div><p>No data for this report</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {cols.map((c, i) => <th key={i}>{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: any, idx: number) => (
                    <tr key={row.id || idx}>
                      {cols.map((c, i) => (
                        <td key={i}>
                          {c.key === '_rank'
                            ? <span style={{ fontWeight: idx < 3 ? 700 : 400, color: idx < 3 ? '#C0001A' : 'var(--text3)' }}>#{idx + 1}</span>
                            : c.render
                              ? c.render(row[c.key], row)
                              : row[c.key] ?? '—'
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
