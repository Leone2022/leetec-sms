import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Receipt,
  ClipboardCheck,
  LogOut,
  Menu,
  ChevronRight,
  X,
  GraduationCap,
} from 'lucide-react';

const NAV = [
  { label: 'Dashboard', Icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Students', Icon: Users, path: '/students' },
  { label: 'Fees & Billing', Icon: Receipt, path: '/fees' },
  { label: 'Approvals', Icon: ClipboardCheck, path: '/approvals' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}` || 'A';

  const close = () => setOpen(false);
  const toggle = () => setOpen((v) => !v);

  return (
    <div className={`admin-shell${open ? ' sidebar-open' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-logo">
            <GraduationCap size={16} />
          </div>
          <div>
            <p className="admin-brand-title">LeeTec SMS</p>
            <p className="admin-brand-subtitle">Admin Console</p>
          </div>
          <button className="admin-sidebar-close" onClick={close} aria-label="Close sidebar">
            <X size={16} />
          </button>
        </div>

        <nav className="admin-nav">
          <p className="admin-nav-label">Menu</p>
          {NAV.map(({ label, Icon, path }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                className={`admin-nav-btn${active ? ' active' : ''}`}
                onClick={() => {
                  navigate(path);
                  close();
                }}
              >
                <Icon size={15} />
                <span>{label}</span>
                {active && <ChevronRight size={13} className="chevron" />}
              </button>
            );
          })}
        </nav>

        <div className="admin-user">
          <div className="admin-user-row">
            <div className="admin-avatar">{initials}</div>
            <div>
              <p className="admin-user-name">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="admin-user-role">{user?.role}</p>
            </div>
          </div>
          <button
            className="btn btn-secondary admin-logout"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-topbar-toggle" onClick={toggle} aria-label="Toggle sidebar">
            <Menu size={18} />
          </button>

          <div className="admin-topbar-title">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <time className="admin-topbar-date">
            {new Date().toLocaleDateString('en-ZW', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </time>
        </header>

        <main className="admin-content">{children}</main>
      </div>

      <div className="admin-backdrop" onClick={close} />
    </div>
  );
}