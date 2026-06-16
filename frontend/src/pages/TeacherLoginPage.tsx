import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { teacherAuthAPI } from '../services/api';
import { Mail, Lock, ArrowRight, GraduationCap, BookOpen, ClipboardList, Users } from 'lucide-react';

const FEATURES = [
  { Icon: BookOpen, label: 'My Classes', desc: 'View assigned subjects and classes' },
  { Icon: ClipboardList, label: 'Marks Entry', desc: 'Enter and update student scores' },
  { Icon: Users, label: 'Class Lists', desc: 'See registered students per class' },
];

export default function TeacherLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = 'LeeTec SMS — Teacher Portal'; }, []);

  const handleLogin = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await teacherAuthAPI.login(email, password);
      const { token, teacher } = res.data;
      localStorage.setItem('teacher_token', token);
      localStorage.setItem('teacher_info', JSON.stringify(teacher));
      navigate('/teacher-dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data || 'Invalid email or password';
      setError(typeof msg === 'string' ? msg : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-navbar">
        <div className="container auth-navbar-inner">
          <div className="auth-navbar-brand">
            <div className="admin-logo"><GraduationCap size={16} /></div>
            <div>
              <p className="admin-brand-title">LeeTec SMS</p>
              <p className="admin-brand-subtitle">Teacher Portal</p>
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
            <h1 className="auth-title">Teacher access to marks and class management.</h1>
            <p className="auth-subtitle">
              Sign in to view your assigned classes, enter student marks, and manage your teaching schedule.
            </p>
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {FEATURES.map(({ Icon, label, desc }) => (
                <div key={label} className="surface-card" style={{ padding: 16, display: 'flex', gap: 10 }}>
                  <span className="stat-icon" style={{ background: '#eef2ff', color: '#1a237e' }}><Icon size={16} /></span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{label}</p>
                    <p className="muted" style={{ fontSize: 12 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="auth-login-wrap">
            <div className="auth-login-card">
              <span className="auth-badge">Teacher Access</span>
              <h2 className="auth-login-title">Welcome back</h2>
              <p className="auth-login-sub">Sign in with your staff account to access your classes.</p>

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={handleLogin} className="auth-form">
                <div>
                  <label className="auth-label">Email address</label>
                  <div className="field-wrap" style={{ marginTop: 6 }}>
                    <span className="field-icon field-icon-left"><Mail size={15} /></span>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="teacher@school.com"
                      required
                      className="text-field"
                    />
                  </div>
                </div>
                <div>
                  <label className="auth-label">Password</label>
                  <div className="field-wrap" style={{ marginTop: 6 }}>
                    <span className="field-icon field-icon-left"><Lock size={15} /></span>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="text-field"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'Signing in...' : <><span>Sign in</span><ArrowRight size={15} /></>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
