import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import GradeBadge from '../components/GradeBadge';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

export default function Dashboard() {
  const [month, setMonth] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['dashboard', month], queryFn: () => api.getDashboard(month) });

  if (isLoading) return <div className="loading">Loading dashboard…</div>;

  const d = data || {};

  const kpis = [
    { icon: '👥', label: 'Total Employees', value: d.totalEmployees ?? 0, sub: 'registered', bg: '#FFF0F2', color: '#C0001A' },
    { icon: '📋', label: 'Evaluated', value: d.evaluatedCount ?? 0, sub: month || 'all time', bg: '#E3F2FD', color: '#1565C0' },
    { icon: '⭐', label: 'Avg Score', value: `${d.avgScore ?? 0}%`, sub: 'performance', bg: '#E8F5E9', color: '#2E7D32' },
    { icon: '🏆', label: 'Excellent', value: d.excellent ?? 0, sub: '≥90% score', bg: '#F3E5F5', color: '#6A1FA0' },
    { icon: '⚠️', label: 'Needs Attention', value: d.needsImprovement ?? 0, sub: '<60% score', bg: '#FFF3E0', color: '#F57C00' },
    { icon: '📅', label: 'Attendance Issues', value: d.attendanceIssues ?? 0, sub: '≥3 days leave', bg: '#FFEBEE', color: '#C0001A' },
    { icon: '🚀', label: 'Promotion Ready', value: d.promotionCandidates ?? 0, sub: 'recommended', bg: '#E8F5E9', color: '#2E7D32' },
    { icon: '💰', label: 'Salary Increment', value: d.salaryIncrementCandidates ?? 0, sub: '≥80% score', bg: '#E3F2FD', color: '#1565C0' },
  ];

  return (
    <>
      <div className="topbar">
        <h2>Dashboard</h2>
        <div className="topbar-right">
          <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text2)' }}>Filter by Month:</label>
          <input type="month" className="form-control" style={{ width: 'auto' }} value={month} onChange={e => setMonth(e.target.value)} />
          {month && <button className="btn btn-secondary btn-sm" onClick={() => setMonth('')}>Clear</button>}
        </div>
      </div>

      <div className="content">
        {/* KPI Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {kpis.map(k => (
            <div key={k.label} className="kpi-card">
              <div className="kpi-icon" style={{ background: k.bg }}>
                <span>{k.icon}</span>
              </div>
              <div className="kpi-info">
                <label>{k.label}</label>
                <h3 style={{ color: k.color }}>{k.value}</h3>
                <span>{k.sub}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="charts-grid">
          {/* Grade Distribution Pie */}
          <div className="card">
            <p className="card-title">Grade Distribution</p>
            {(d.gradeDistribution ?? []).some((g: any) => g.count > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={d.gradeDistribution} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={80} label={(props: any) => props.count > 0 ? `${props.grade}: ${props.count}` : ''}>
                    {(d.gradeDistribution ?? []).map((entry: any) => (
                      <Cell key={entry.grade} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="empty"><p>No evaluations yet</p></div>}
          </div>

          {/* Department Performance Bar */}
          <div className="card">
            <p className="card-title">Department Performance</p>
            {(d.deptPerformance ?? []).length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={d.deptPerformance} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`${v}%`, 'Avg Score']} />
                  <Bar dataKey="avgScore" fill="#C0001A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="empty"><p>No data</p></div>}
          </div>
        </div>

        {/* Top Employees */}
        <div className="card">
          <p className="card-title">Top Performing Employees</p>
          {(d.topEmployees ?? []).length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Month</th>
                    <th>Score</th>
                    <th>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {(d.topEmployees ?? []).map((e: any, i: number) => (
                    <tr key={e.id}>
                      <td style={{ color: i < 3 ? '#C0001A' : 'var(--text3)', fontWeight: i < 3 ? 700 : 400 }}>{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{e.employeeName}</td>
                      <td>{e.department}</td>
                      <td>{e.month}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar" style={{ width: 80 }}>
                            <div className="progress-fill" style={{ width: `${e.percentage}%`, background: '#C0001A' }} />
                          </div>
                          <span style={{ fontWeight: 600 }}>{e.percentage}%</span>
                        </div>
                      </td>
                      <td><GradeBadge pct={e.percentage} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="empty"><p>No evaluations to display</p></div>}
        </div>
      </div>
    </>
  );
}
