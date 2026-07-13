import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import {
  LayoutDashboard,
  Users,
  Receipt,
  LogOut,
  Menu,
  ChevronRight,
  ChevronDown,
  X,
  Calendar,
  Shield,
  BookOpen,
  ClipboardList,
  FileStack,
  Bell,
  Globe,
  ArrowLeftRight,
  KeyRound,
} from 'lucide-react';

interface NavChild {
  label: string;
  path: string;
  permission?: string;
}

interface NavItem {
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  path?: string;
  permission?: string;
  superAdminOnly?: boolean;
  children?: NavChild[];
}

const NAV: NavItem[] = [
  { label: 'Dashboard', Icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Students', Icon: Users, path: '/students', permission: 'Students' },
  { label: 'Subject Requests', Icon: ArrowLeftRight, path: '/subject-requests' },
  {
    label: 'Finances',
    Icon: Receipt,
    children: [
      { label: 'Fee Setup', path: '/fee-setup', permission: 'Fee Setup' },
      { label: 'Fees & Billing', path: '/fees', permission: 'Fees & Billing' },
      // { label: 'Bursaries', path: '/bursaries' },
    ],
  },
  { label: 'Portal Accounts', Icon: Globe, path: '/portal-accounts', permission: 'Portal Accounts' },
  { label: 'Terms & Periods', Icon: Calendar, path: '/terms', permission: 'Terms & Periods' },
  { label: 'Subjects', Icon: BookOpen, path: '/subjects', permission: 'Subjects' },
  { label: 'Marks Entry', Icon: ClipboardList, path: '/marks-entry', permission: 'Marks Entry' },
  { label: 'Bulk Reports', Icon: FileStack, path: '/bulk-reports', permission: 'Bulk Reports' },
  { label: 'Announcements', Icon: Bell, path: '/announcements', permission: 'Announcements' },
  { label: 'Staff Assignments', Icon: Users, path: '/teacher-assignments', permission: 'Staff Assignments' },
  { label: 'Super Admin', Icon: Shield, path: '/super-admin', superAdminOnly: true },
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
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [pendingSubjectRequests, setPendingSubjectRequests] = useState(0);

  useEffect(() => {
    document.title = `LeeTec SMS — ${title}`;
  }, [title]);

  useEffect(() => {
    adminAPI.getSubjectChangeRequests()
      .then((res) => setPendingSubjectRequests((res.data || []).length))
      .catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    const activeParent = NAV.find((item) => item.children?.some((c) => c.path === location.pathname));
    if (activeParent) setExpandedGroup(activeParent.label);
  }, [location.pathname]);

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}` || 'A';
  const isSuperAdmin = user?.role === 'SuperAdmin';

  const close = () => setOpen(false);
  const toggle = () => setOpen((v) => !v);

  const permissions: string[] = (() => {
    try {
      const raw = JSON.parse(localStorage.getItem('admin_permissions') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  })();
  const hasPermission = (permission?: string) => !permission || isSuperAdmin || permissions.includes(permission);

  const visibleNav = NAV
    .filter((item) => !item.superAdminOnly || isSuperAdmin)
    .filter((item) => hasPermission(item.permission))
    .map((item) => item.children ? { ...item, children: item.children.filter((c) => hasPermission(c.permission)) } : item)
    .filter((item) => !item.children || item.children.length > 0);

  return (
    <div className={`admin-shell${open ? ' sidebar-open' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <img src="/leetec.jpg"
            alt="LeeTec"
            style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.setAttribute('style', 'display:flex');
            }}
          />
          <div style={{
            display: 'none',
            width: 48, height: 48,
            background: 'linear-gradient(135deg, #1a237e, #3949ab)',
            borderRadius: 10,
            alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 16
          }}>LC</div>
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
          {visibleNav.map((item) => {
            if (item.children) {
              const childActive = item.children.some((c) => c.path === location.pathname);
              const isExpanded = expandedGroup === item.label;
              return (
                <div key={item.label}>
                  <button
                    className={`admin-nav-btn${childActive ? ' active' : ''}`}
                    onClick={() => setExpandedGroup(isExpanded ? null : item.label)}
                  >
                    <item.Icon size={15} />
                    <span>{item.label}</span>
                    <ChevronDown
                      size={13}
                      className="chevron"
                      style={{ marginLeft: 'auto', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                    />
                  </button>
                  {isExpanded && (
                    <div style={{ borderLeft: '2px solid #e2e8f0', marginLeft: 18, paddingLeft: 4 }}>
                      {item.children.map((child) => {
                        const active = location.pathname === child.path;
                        return (
                          <button
                            key={child.path}
                            className={`admin-nav-btn${active ? ' active' : ''}`}
                            onClick={() => { navigate(child.path); close(); }}
                            style={{ paddingLeft: 24, fontSize: 13 }}
                          >
                            <span>{child.label}</span>
                            {active && <ChevronRight size={13} className="chevron" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                className={`admin-nav-btn${active ? ' active' : ''}`}
                onClick={() => { navigate(item.path!); close(); }}
              >
                <item.Icon size={15} />
                <span>{item.label}</span>
                {item.label === 'Subject Requests' && pendingSubjectRequests > 0 && (
                  <span style={{ marginLeft: 'auto', background: '#dc2626', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 7px', lineHeight: '14px' }}>
                    {pendingSubjectRequests}
                  </span>
                )}
                {active && <ChevronRight size={13} className="chevron" />}
              </button>
            );
          })}
        </nav>

        <div className="admin-user">
          <div className="admin-user-row">
            <div className="admin-avatar">{initials}</div>
            <div>
              <p className="admin-user-name">{user?.firstName} {user?.lastName}</p>
              <p className="admin-user-role">{user?.role}</p>
            </div>
          </div>
          <button
            className="btn btn-secondary admin-logout"
            onClick={() => { navigate('/change-password'); close(); }}
            style={{ marginBottom: 8 }}
          >
            <KeyRound size={14} />
            <span>Change Password</span>
          </button>
          <button
            className="btn btn-secondary admin-logout"
            onClick={() => { logout(); navigate('/login'); }}
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
            {new Date().toLocaleDateString('en-ZW', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </time>
        </header>
        <main className="admin-content">{children}</main>
      </div>

      <div className="admin-backdrop" onClick={close} />
    </div>
  );
}
