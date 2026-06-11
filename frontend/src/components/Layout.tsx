import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, FileText, Star } from 'lucide-react';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/employees', icon: Users, label: 'Employees' },
  { to: '/evaluate', icon: Star, label: 'New Evaluation' },
  { to: '/evaluations', icon: ClipboardList, label: 'Evaluations' },
  { to: '/reports', icon: FileText, label: 'Reports' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Pandora<br/>Garments</h1>
          <p>Performance Evaluation System</p>
        </div>
        <nav className="sidebar-nav">
          {nav.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} className={loc.pathname === to ? 'active' : ''}>
              <Icon size={16} /> {label}
            </Link>
          ))}
        </nav>
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>PG</div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>Admin</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>HR Manager</div>
            </div>
          </div>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
