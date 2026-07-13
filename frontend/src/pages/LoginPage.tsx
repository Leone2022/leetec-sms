import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Mail, Lock, Eye, EyeOff, ArrowRight, GraduationCap } from 'lucide-react';

const FEATURES = [
  'Student Information System',
  'Fees & Billing Management',
  'Student Portal & Parent Access',
  'Term-by-Term Academic Records',
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => { document.title = 'LeeTec SMS — Admin Login'; }, []);

  const handleLogin = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.login(email, password);
      const data = response.data;
      login(data.token, {
        id: data.id || 1,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.roles?.[0] || 'Admin',
        schoolId: 1,
      });
      localStorage.setItem('admin_permissions', JSON.stringify(data.permissions || []));
      navigate(data.mustChangePassword ? '/change-password' : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    setForgotEmail(email);
    setForgotError('');
    setForgotSent(false);
    setShowForgotPassword(true);
  };

  const backToLogin = () => {
    setShowForgotPassword(false);
    setForgotError('');
    setForgotSent(false);
  };

  const handleForgotPassword = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    try {
      await authAPI.forgotPassword(forgotEmail);
      setForgotSent(true);
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Failed to send temporary password');
    } finally {
      setForgotLoading(false);
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
              <p className="admin-brand-title">LeeTec Solutions</p>
              <p className="admin-brand-subtitle">School Management Platform</p>
            </div>
          </div>
          <div className="auth-navbar-meta">
            <span>Legacy Software</span>
            <span className="divider" />
            <span>Harare, Zimbabwe</span>
          </div>
        </div>
      </header>

      <section className="auth-hero">
        <div className="container auth-hero-grid">
          <div>
            <h1 className="auth-title">A premium command center for modern school operations.</h1>
            <p className="auth-subtitle">
              Manage enrolment, billing, and academic administration through one secure,
              streamlined control panel.
            </p>

            <div className="auth-actions">
              <button className="btn btn-primary" type="button">
                Request Demo
              </button>
              <Link className="btn btn-secondary" to="/student-login">
                Student Portal
              </Link>
            </div>

            <div className="auth-chips">
              {FEATURES.map((feature) => (
                <span key={feature} className="auth-chip">
                  {feature}
                </span>
              ))}
            </div>

            <div className="auth-stats">
              <span className="auth-stat one">99.9% uptime</span>
              <span className="auth-stat two">Role-based access</span>
              <span className="auth-stat three">Secure API workflows</span>
            </div>
          </div>

          <div className="auth-login-wrap">
            <div className="auth-login-card">
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
              {showForgotPassword ? (
                <>
                  <span className="auth-badge">Staff Access</span>
                  <h2 className="auth-login-title">Forgot your password?</h2>
                  <p className="auth-login-sub">Enter your email and we'll send you a temporary password.</p>

                  {forgotError && <div className="auth-error">{forgotError}</div>}

                  {forgotSent ? (
                    <div className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ fontSize: 13, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px' }}>
                        Check your email for a temporary password.
                      </div>
                      <a href="#" onClick={(e) => { e.preventDefault(); backToLogin(); }} className="auth-forgot" style={{ textAlign: 'center' }}>
                        Back to Login
                      </a>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="auth-form">
                      <div>
                        <label className="auth-label" htmlFor="forgot-email">
                          Email address
                        </label>
                        <div className="field-wrap" style={{ marginTop: 6 }}>
                          <span className="field-icon field-icon-left">
                            <Mail size={15} />
                          </span>
                          <input
                            id="forgot-email"
                            type="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="admin@school.ac.zw"
                            required
                            className="text-field"
                          />
                        </div>
                      </div>

                      <button type="submit" disabled={forgotLoading} className="btn btn-primary">
                        {forgotLoading ? 'Sending...' : 'Send Temporary Password'}
                      </button>

                      <a href="#" onClick={(e) => { e.preventDefault(); backToLogin(); }} className="auth-forgot" style={{ textAlign: 'center' }}>
                        Back to Login
                      </a>
                    </form>
                  )}
                </>
              ) : (
                <>
                  <span className="auth-badge">Staff Access</span>
                  <h2 className="auth-login-title">Welcome back</h2>
                  <p className="auth-login-sub">Sign in to continue to your school dashboard.</p>

                  {error && <div className="auth-error">{error}</div>}

                  <form onSubmit={handleLogin} className="auth-form">
                    <div>
                      <label className="auth-label" htmlFor="email">
                        Email address
                      </label>
                      <div className="field-wrap" style={{ marginTop: 6 }}>
                        <span className="field-icon field-icon-left">
                          <Mail size={15} />
                        </span>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="admin@school.ac.zw"
                          required
                          className="text-field"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="auth-label-row">
                        <label className="auth-label" htmlFor="password">
                          Password
                        </label>
                        <a href="#" onClick={(e) => { e.preventDefault(); openForgotPassword(); }} className="auth-forgot">
                          Forgot password?
                        </a>
                      </div>
                      <div className="field-wrap">
                        <span className="field-icon field-icon-left">
                          <Lock size={15} />
                        </span>
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          required
                          className="text-field with-right"
                        />
                        <button
                          type="button"
                          className="field-icon field-icon-right"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="btn btn-primary">
                      {loading ? (
                        'Signing in...'
                      ) : (
                        <>
                          <span>Continue</span>
                          <ArrowRight size={15} />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}

              <div className="auth-divider" />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                <Link to="/teacher-login" style={{ fontSize: 12, color: '#64748b', textDecoration: 'none' }}>
                  Are you a teacher?{' '}
                  <span style={{ color: '#1a237e', fontWeight: 600, textDecoration: 'underline' }}>Login here</span>
                </Link>
                <Link to="/student-login" style={{ fontSize: 12, color: '#64748b', textDecoration: 'none' }}>
                  Are you a student?{' '}
                  <span style={{ color: '#1a237e', fontWeight: 600, textDecoration: 'underline' }}>Login here</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}