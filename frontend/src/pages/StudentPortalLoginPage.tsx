import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { portalAPI } from '../services/api';
import { Mail, Lock, ArrowRight, GraduationCap, Receipt, BarChart3, Bell, BookOpen, Hash, CheckCircle } from 'lucide-react';

type Tab = 'login' | 'register' | 'forgot';

const PORTAL_FEATURES = [
  { Icon: Receipt, label: 'Fee statements', desc: 'View invoices and balances' },
  { Icon: BarChart3, label: 'Academic results', desc: 'Track term-by-term progress' },
  { Icon: Bell, label: 'School notices', desc: 'Announcements and updates' },
  { Icon: BookOpen, label: 'Learning schedule', desc: 'View classes and timelines' },
];

export default function StudentPortalLoginPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('login');

  useEffect(() => { document.title = 'LeeTec SMS — Student Portal'; }, []);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginPending, setLoginPending] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [regStudentNumber, setRegStudentNumber] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleLogin = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    setLoginPending(false);
    try {
      const res = await portalAPI.login(loginEmail, loginPassword);
      const { token, student } = res.data;
      localStorage.setItem('student_token', token);
      localStorage.setItem('student_info', JSON.stringify(student));
      navigate('/student-dashboard');
    } catch (err: any) {
      const msg: string = err.response?.data?.message || err.response?.data || 'Invalid email or password';
      const isPending = msg.toLowerCase().includes('pending') ||
        err.response?.data?.status?.toLowerCase?.() === 'pending' ||
        err.response?.status === 403;
      if (isPending) {
        setLoginPending(true);
      } else {
        setLoginError(msg);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setRegError('');
    if (regPassword !== regConfirm) { setRegError('Passwords do not match'); return; }
    if (regPassword.length < 6) { setRegError('Password must be at least 6 characters'); return; }
    setRegLoading(true);
    try {
      await portalAPI.register({
        schoolId: 1,
        studentNumber: regStudentNumber,
        email: regEmail,
        password: regPassword,
      });
      setRegSuccess(true);
    } catch (err: any) {
      setRegError(err.response?.data?.message || 'Registration failed. Check your student number and try again.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleForgot = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);
    try {
      await portalAPI.forgotPassword(forgotEmail);
      setForgotSuccess(true);
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px', fontSize: '13px', fontWeight: active ? '700' : '500',
    background: active ? '#0ea5e9' : 'transparent', color: active ? 'white' : '#475569',
    border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s',
  });

  return (
    <div className="auth-page">
      <header className="auth-navbar">
        <div className="container auth-navbar-inner">
          <div className="auth-navbar-brand">
            <div className="admin-logo"><GraduationCap size={16} /></div>
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
              Access fee statements, school updates, and academic information through a clean, always-available experience.
            </p>
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {PORTAL_FEATURES.map(({ Icon, label, desc }) => (
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
              {/* Tab switcher (only login + register) */}
              {tab !== 'forgot' && (
                <>
                  <span className="auth-badge">Student Access</span>
                  <div style={{ display: 'flex', gap: '4px', padding: '4px', background: '#f1f5f9', borderRadius: '10px', marginBottom: '20px' }}>
                    <button style={tabStyle(tab === 'login')} onClick={() => setTab('login')}>Sign In</button>
                    <button style={tabStyle(tab === 'register')} onClick={() => setTab('register')}>Register</button>
                  </div>
                </>
              )}

              {/* ── Login Tab ── */}
              {tab === 'login' && (
                <>
                  <h2 className="auth-login-title">Welcome back</h2>
                  <p className="auth-login-sub">Sign in to open your student dashboard.</p>
                  {loginPending && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: '#92400e', lineHeight: 1.5 }}>
                      Your account is pending admin approval. You will receive an email once approved.
                    </div>
                  )}
                  {loginError && <div className="auth-error">{loginError}</div>}
                  <form onSubmit={handleLogin} className="auth-form">
                    <div>
                      <label className="auth-label">Email address</label>
                      <div className="field-wrap" style={{ marginTop: 6 }}>
                        <span className="field-icon field-icon-left"><Mail size={15} /></span>
                        <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="student@email.com" required className="text-field" />
                      </div>
                    </div>
                    <div>
                      <label className="auth-label">Password</label>
                      <div className="field-wrap" style={{ marginTop: 6 }}>
                        <span className="field-icon field-icon-left"><Lock size={15} /></span>
                        <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Enter your password" required className="text-field" />
                      </div>
                    </div>
                    <button type="submit" disabled={loginLoading} className="btn btn-primary">
                      {loginLoading ? 'Signing in...' : <><span>Sign in</span><ArrowRight size={15} /></>}
                    </button>
                  </form>
                  <button
                    onClick={() => setTab('forgot')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0ea5e9', fontSize: '12px', marginTop: '10px', padding: 0 }}
                  >
                    Forgot your password?
                  </button>
                </>
              )}

              {/* ── Register Tab ── */}
              {tab === 'register' && (
                <>
                  <h2 className="auth-login-title">Create account</h2>
                  <p className="auth-login-sub">Use your student number to register for portal access.</p>

                  {regSuccess ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <CheckCircle size={40} style={{ color: '#15803d', margin: '0 auto 12px' }} />
                      <h3 style={{ fontWeight: '700', fontSize: '16px', marginBottom: 8 }}>Registration successful!</h3>
                      <p style={{ fontSize: '13px', color: '#475569', marginBottom: 16 }}>
                        You can now log in with your email and password.
                      </p>
                      <button className="btn btn-primary" onClick={() => { setRegSuccess(false); setTab('login'); }}>
                        Back to Sign In
                      </button>
                    </div>
                  ) : (
                    <>
                      {regError && <div className="auth-error">{regError}</div>}
                      <form onSubmit={handleRegister} className="auth-form">
                        <div>
                          <label className="auth-label">Student Number</label>
                          <div className="field-wrap" style={{ marginTop: 6 }}>
                            <span className="field-icon field-icon-left"><Hash size={15} /></span>
                            <input type="text" value={regStudentNumber} onChange={(e) => setRegStudentNumber(e.target.value)}
                              placeholder="e.g. LT2026001" required className="text-field" />
                          </div>
                        </div>
                        <div>
                          <label className="auth-label">Email address</label>
                          <div className="field-wrap" style={{ marginTop: 6 }}>
                            <span className="field-icon field-icon-left"><Mail size={15} /></span>
                            <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                              placeholder="student@email.com" required className="text-field" />
                          </div>
                        </div>
                        <div>
                          <label className="auth-label">Password</label>
                          <div className="field-wrap" style={{ marginTop: 6 }}>
                            <span className="field-icon field-icon-left"><Lock size={15} /></span>
                            <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                              placeholder="Min. 6 characters" required className="text-field" />
                          </div>
                        </div>
                        <div>
                          <label className="auth-label">Confirm Password</label>
                          <div className="field-wrap" style={{ marginTop: 6 }}>
                            <span className="field-icon field-icon-left"><Lock size={15} /></span>
                            <input type="password" value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)}
                              placeholder="Repeat password" required className="text-field" />
                          </div>
                        </div>
                        <button type="submit" disabled={regLoading} className="btn btn-primary">
                          {regLoading ? 'Registering...' : <><span>Register</span><ArrowRight size={15} /></>}
                        </button>
                      </form>
                    </>
                  )}
                </>
              )}

              {/* ── Forgot Password Tab ── */}
              {tab === 'forgot' && (
                <>
                  <span className="auth-badge">Password Reset</span>
                  <h2 className="auth-login-title">Reset your password</h2>
                  <p className="auth-login-sub">Enter your email and we'll send a reset link.</p>

                  {forgotSuccess ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <CheckCircle size={40} style={{ color: '#15803d', margin: '0 auto 12px' }} />
                      <h3 style={{ fontWeight: '700', fontSize: '16px', marginBottom: 8 }}>Email sent!</h3>
                      <p style={{ fontSize: '13px', color: '#475569', marginBottom: 16 }}>
                        If an account exists for that email, you'll receive a password reset link shortly.
                      </p>
                      <button className="btn btn-primary" onClick={() => { setForgotSuccess(false); setTab('login'); }}>
                        Back to Sign In
                      </button>
                    </div>
                  ) : (
                    <>
                      {forgotError && <div className="auth-error">{forgotError}</div>}
                      <form onSubmit={handleForgot} className="auth-form">
                        <div>
                          <label className="auth-label">Email address</label>
                          <div className="field-wrap" style={{ marginTop: 6 }}>
                            <span className="field-icon field-icon-left"><Mail size={15} /></span>
                            <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                              placeholder="student@email.com" required className="text-field" />
                          </div>
                        </div>
                        <button type="submit" disabled={forgotLoading} className="btn btn-primary">
                          {forgotLoading ? 'Sending...' : <><span>Send Reset Link</span><ArrowRight size={15} /></>}
                        </button>
                      </form>
                      <button
                        onClick={() => setTab('login')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0ea5e9', fontSize: '12px', marginTop: '10px', padding: 0 }}
                      >
                        ← Back to sign in
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
