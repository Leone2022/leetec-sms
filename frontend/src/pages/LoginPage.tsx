import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { SCHOOL_NAME, SCHOOL_LOGO, SCHOOL_WEBSITE, SCHOOL_WEBSITE_LABEL, SCHOOL_MOTTO, setPageMeta } from '../utils/brand';

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

  useEffect(() => { setPageMeta('Staff Login', 'Advent Hope Academy staff portal: sign in to manage enrolment, fees, marks and reports. Students and parents use the Student Portal. School website: adventhope.ac.zw'); }, []);

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
            <img src={SCHOOL_LOGO} alt={SCHOOL_NAME} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain', background: 'white' }} />
            <div>
              <p className="admin-brand-title">{SCHOOL_NAME}</p>
              <p className="admin-brand-subtitle">School Portal</p>
            </div>
          </div>
          <div className="auth-navbar-meta">
            <a href={SCHOOL_WEBSITE} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', fontWeight: 600 }}>
              {SCHOOL_WEBSITE_LABEL} ↗
            </a>
          </div>
        </div>
      </header>

      <section className="auth-hero">
        <div className="container auth-hero-grid">
          <div>
            <h1 className="auth-title">Welcome to the {SCHOOL_NAME} school portal.</h1>
            <p className="auth-subtitle">
              Staff sign in here to manage enrolment, fees, marks and reports for the Junior School,
              Academy and High School. Parents and students use the Student Portal.
            </p>

            <div className="auth-actions">
              <a className="btn btn-primary" href={SCHOOL_WEBSITE} target="_blank" rel="noopener noreferrer">
                Visit our website
              </a>
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
              {SCHOOL_MOTTO.map((word, i) => (
                <span key={word} className={`auth-stat ${['one', 'two', 'three'][i % 3]}`}>{word}</span>
              ))}
            </div>
          </div>

          <div className="auth-login-wrap">
            <div className="auth-login-card">
              <img src={SCHOOL_LOGO}
                alt={SCHOOL_NAME}
                style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'contain', background: 'white' }}
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
              }}>AH</div>
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