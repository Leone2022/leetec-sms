import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { portalAPI } from '../services/api';
import { LogOut, GraduationCap, BarChart3, Bell, CalendarDays, Phone } from 'lucide-react';

const QUICK_LINKS = [
  { label: 'Results', desc: 'Academic performance', Icon: BarChart3 },
  { label: 'Notices', desc: 'School announcements', Icon: Bell },
  { label: 'Timetable', desc: 'Your class schedule', Icon: CalendarDays },
  { label: 'Contact', desc: 'Reach the school', Icon: Phone },
];

export default function StudentDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const studentInfo = JSON.parse(localStorage.getItem('student_info') || '{}');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await portalAPI.getDashboard(1);
      setDashboard(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_info');
    navigate('/student-login');
  };

  if (loading) {
    return (
      <div className="portal-page" style={{ display: 'grid', placeItems: 'center' }}>
        <div className="surface-card" style={{ textAlign: 'center' }}>
          Loading your portal...
        </div>
      </div>
    );
  }

  const invoice = dashboard?.latestInvoice;
  const student = dashboard?.student;

  const firstName = student?.firstName ?? studentInfo?.firstName ?? '';
  const surname = student?.surname ?? '';
  const initials = `${firstName[0] ?? ''}${surname[0] ?? ''}`;

  const statusClass = (status: string) => {
    if (status === 'Paid') {
      return 'pill pill-success';
    }
    if (status === 'PartiallyPaid') {
      return 'pill pill-warning';
    }
    return 'pill pill-danger';
  };

  return (
    <div className="portal-page">
      <header className="portal-header">
        <div className="portal-container portal-header-inner">
          <div className="auth-navbar-brand">
            <div className="admin-logo">
              <GraduationCap size={15} />
            </div>
            <div>
              <p className="admin-brand-title">Student Portal</p>
              <p className="admin-brand-subtitle">LeeTec SMS</p>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '8px 12px' }}>
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </header>

      <main className="portal-main">
        <div className="portal-container">
          <section className="surface-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="admin-avatar" style={{ width: 56, height: 56, fontSize: 18 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 28, lineHeight: 1.2 }}>
                {firstName} {surname}
              </h1>
              <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                {student?.studentNumber} · {student?.form}
              </p>
            </div>
            <span className={`pill ${student?.status === 'Active' ? 'pill-success' : 'pill-warning'}`}>
              {student?.status ?? 'Active'}
            </span>
          </section>

          {invoice ? (
            <section className="table-card">
              <div className="table-head">
                <div>
                  <h3>Fee Statement</h3>
                  <p>Latest invoice and payment status</p>
                </div>
                <span className={statusClass(invoice.status)}>
                  {invoice.status === 'PartiallyPaid' ? 'Partially Paid' : invoice.status}
                </span>
              </div>

              <div className="surface-card" style={{ border: 0, boxShadow: 'none' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 10,
                  }}
                >
                  <div className="surface-card" style={{ padding: 14 }}>
                    <p className="muted" style={{ fontSize: 12 }}>
                      Invoice No.
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>{invoice.invoiceNumber}</p>
                  </div>
                  <div className="surface-card" style={{ padding: 14 }}>
                    <p className="muted" style={{ fontSize: 12 }}>
                      Term
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>{invoice.term?.name ?? 'Term 1'}</p>
                  </div>
                </div>

                {invoice.items?.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div className="data-table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Description</th>
                            <th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoice.items.map((item: any) => (
                            <tr key={item.id}>
                              <td>{item.description}</td>
                              <td>${Number(item.amount).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="surface-card" style={{ marginTop: 14, padding: 16 }}>
                  <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="muted">Total Amount</span>
                    <strong>${Number(invoice.totalAmount).toLocaleString()}</strong>
                  </p>
                  <p style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="muted">Amount Paid</span>
                    <strong style={{ color: '#15803d' }}>${Number(invoice.amountPaid).toLocaleString()}</strong>
                  </p>
                  <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Balance</span>
                    <strong style={{ color: Number(invoice.balance) > 0 ? '#dc2626' : '#15803d' }}>
                      ${Number(invoice.balance).toLocaleString()}
                    </strong>
                  </p>
                </div>

                {invoice.dueDate && (
                  <div className="pill pill-warning" style={{ marginTop: 12 }}>
                    Due date: {new Date(invoice.dueDate).toLocaleDateString('en-ZW')}
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="surface-card portal-empty">No invoice found for this term.</section>
          )}

          <section className="portal-grid">
            {QUICK_LINKS.map(({ label, desc, Icon }) => (
              <div key={label} className="surface-card" style={{ textAlign: 'center', padding: 16 }}>
                <span className="stat-icon" style={{ margin: '0 auto', background: '#eef2ff', color: '#1a237e' }}>
                  <Icon size={17} />
                </span>
                <p style={{ marginTop: 10, fontWeight: 700, fontSize: 14 }}>{label}</p>
                <p className="muted" style={{ fontSize: 12 }}>
                  {desc}
                </p>
              </div>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}