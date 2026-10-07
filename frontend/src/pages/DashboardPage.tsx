import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { studentsAPI, feesAPI, adminAPI, marksAPI } from '../services/api';
import { Users, ArrowUpRight, Search, X, Clock, FileEdit, Receipt } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingSubjectRequests: 0,
    pendingAmendments: 0,
    unpaidInvoices: 0,
  });
  const [activeTerm, setActiveTerm] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [studentsRes, termsRes, subjectReqRes, amendmentRes] = await Promise.all([
        studentsAPI.getAll(1),
        feesAPI.getTerms(1),
        adminAPI.getSubjectChangeRequests(),
        marksAPI.getAmendmentRequests(),
      ]);

      const students: any[] = studentsRes.data || [];
      setAllStudents(students);

      const active = (termsRes.data as any[]).find((t) => t.isActive) ?? null;
      setActiveTerm(active);

      const pendingSubjectRequests = (subjectReqRes.data || []).filter((r: any) => r.status === 'Pending').length;
      const pendingAmendments = (amendmentRes.data || []).length;

      let unpaidInvoices = 0;
      if (active) {
        try {
          const feesRes = await feesAPI.getTermInvoices(1, active.id);
          unpaidInvoices = feesRes.data?.summary?.unpaid || 0;
        } catch { /* leave at 0 if this specific call fails */ }
      }

      setStats({
        totalStudents: students.length,
        pendingSubjectRequests,
        pendingAmendments,
        unpaidInvoices,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return allStudents
      .filter((s: any) => `${s.firstName} ${s.surname} ${s.studentNumber}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, allStudents]);

  const goToStudent = (student: any) => {
    setSearch('');
    navigate('/students', { state: { openStudentId: student.id } });
  };

  const statCards = [
    {
      label: 'Total Students',
      value: stats.totalStudents.toLocaleString(),
      icon: Users,
      iconBg: '#eef2ff',
      iconColor: '#1a237e',
      path: '/students',
    },
    {
      label: 'Pending Subject Requests',
      value: stats.pendingSubjectRequests.toLocaleString(),
      icon: Clock,
      iconBg: '#fff7ed',
      iconColor: '#c2410c',
      path: '/subject-requests',
    },
    {
      label: 'Pending Marks Amendments',
      value: stats.pendingAmendments.toLocaleString(),
      icon: FileEdit,
      iconBg: '#f5f3ff',
      iconColor: '#7c3aed',
      path: '/super-admin',
    },
    {
      label: 'Unpaid Invoices',
      value: stats.unpaidInvoices.toLocaleString(),
      icon: Receipt,
      iconBg: '#fef2f2',
      iconColor: '#dc2626',
      path: '/fees',
    },
  ];

  const quickNav = [
    { label: 'Students', desc: 'Manage enrolment and profiles', path: '/students' },
    { label: 'Fees & Billing', desc: 'Track invoices and collections', path: '/fees' },
    { label: 'Approvals', desc: 'Review pending requests', path: '/portal-accounts' },
  ];

  return (
    <AdminLayout title="Dashboard" subtitle={`${greeting}, ${user?.firstName ?? 'Admin'}`}>
      <div className="page-grid">
        <section className="hero-card">
          <h2>
            {greeting}, {user?.firstName} {user?.lastName}
          </h2>
          <p>
            Real-time visibility into student records, billing flow, and cash collection for{' '}
            {activeTerm ? activeTerm.name : 'the current term'}.
          </p>
        </section>

        <section
          style={{
            background: 'white',
            borderRadius: 16,
            padding: '20px 24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <label style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', display: 'block', marginBottom: 10 }}>
            Find a Student
          </label>
          <div style={{ position: 'relative', maxWidth: 480 }}>
            <div className="field-wrap">
              <span className="field-icon field-icon-left"><Search size={15} /></span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students by name or student number..."
                className="text-field with-right"
              />
              {search && (
                <button className="field-icon field-icon-right" onClick={() => setSearch('')}>
                  <X size={13} />
                </button>
              )}
            </div>
            {searchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
                  border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                  zIndex: 100, marginTop: 4, overflow: 'hidden',
                }}
              >
                {searchResults.map((s: any) => {
                  const campus = (s.studentNumber || '').split('/')[0] || '—';
                  return (
                    <div
                      key={s.id}
                      onClick={() => goToStudent(s)}
                      style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                    >
                      <div className="mini-avatar" style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>
                        {s.firstName?.[0]}{s.surname?.[0]}
                      </div>
                      <div>
                        <strong style={{ fontSize: 13 }}>{s.firstName} {s.surname}</strong>
                        <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontFamily: 'ui-monospace, monospace' }}>
                          {s.studentNumber} · {s.form || '—'} · {campus}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="stat-grid">
          {statCards.map(({ label, value, icon: Icon, iconBg, iconColor, path }) => (
            <button
              key={label}
              className="stat-card"
              onClick={() => navigate(path)}
              style={{ textAlign: 'left', cursor: 'pointer' }}
            >
              <span className="stat-icon" style={{ background: iconBg, color: iconColor }}>
                <Icon size={18} />
              </span>
              <p className="value">{value}</p>
              <p className="label">{label}</p>
            </button>
          ))}
        </section>

        <section className="quick-grid">
          {quickNav.map(({ label, desc, path }) => (
            <button
              key={label}
              className="quick-card"
              onClick={() => navigate(path)}
              style={{ textAlign: 'left', cursor: 'pointer' }}
            >
              <h3>{label}</h3>
              <p>{desc}</p>
              <span style={{ marginTop: 8, color: '#2563eb', fontSize: 12, fontWeight: 600 }}>
                Open module <ArrowUpRight size={13} style={{ verticalAlign: 'middle' }} />
              </span>
            </button>
          ))}
        </section>
      </div>
    </AdminLayout>
  );
}
