import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { portalAPI } from '../services/api';
import { Mail, Lock, ArrowRight, GraduationCap, Receipt, BarChart3, Bell, BookOpen } from 'lucide-react';

const PORTAL_FEATURES = [
  { Icon: Receipt, label: 'Fee statements', desc: 'View invoices and balances' },
  { Icon: BarChart3, label: 'Academic results', desc: 'Track term-by-term progress' },
  { Icon: Bell, label: 'School notices', desc: 'Announcements and updates' },
  { Icon: BookOpen, label: 'Learning schedule', desc: 'View classes and timelines' },
];

export default function StudentPortalLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await portalAPI.login(email, password);
      const { token, student } = response.data;
      localStorage.setItem('student_token', token);
      localStorage.setItem('student_info', JSON.stringify(student));
      navigate('/student-dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-navbar">
        <div className="container auth-navbar-inner">
          <div className="auth-navbar-brand">
            <div className="admin-logo">
              <GraduationCap size={16} />
            </div>
            <div>
              <p className="admin-brand-title">LeeTec SMS</p>
              <p className="admin-brand-subtitle">Student Portal</p>
            </div>
          </div>
          <Link to="/login" className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }}>
            Admin access
          </Link>
        </div>
      </header>

      <section className="auth-hero">
        <div className="container auth-hero-grid">
          <div>
            <h1 className="auth-title">Everything students need, in one secure portal.</h1>
            <p className="auth-subtitle">
              Access fee statements, school updates, and academic information through a clean,
              always-available experience.
            </p>

            <div
              style={{
                marginTop: 20,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 10,
              }}
            >
              {PORTAL_FEATURES.map(({ Icon, label, desc }) => (
                <div key={label} className="surface-card" style={{ padding: 16, display: 'flex', gap: 10 }}>
                  <span className="stat-icon" style={{ background: '#eef2ff', color: '#1a237e' }}>
                    <Icon size={16} />
                  </span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{label}</p>
                    <p className="muted" style={{ fontSize: 12 }}>
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="auth-login-wrap">
            <div className="auth-login-card">
              <span className="auth-badge">Student Access</span>
              <h2 className="auth-login-title">Welcome back</h2>
              <p className="auth-login-sub">Sign in to open your student dashboard.</p>

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={handleLogin} className="auth-form">
                <div>
                  <label className="auth-label">Email address</label>
                  <div className="field-wrap" style={{ marginTop: 6 }}>
                    <span className="field-icon field-icon-left">
                      <Mail size={15} />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@email.com"
                      required
                      className="text-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="auth-label">Password</label>
                  <div className="field-wrap" style={{ marginTop: 6 }}>
                    <span className="field-icon field-icon-left">
                      <Lock size={15} />
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="text-field"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? (
                    'Signing in...'
                  ) : (
                    <>
                      <span>Sign in</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}