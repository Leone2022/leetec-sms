import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { portalAPI } from '../services/api';
import { GraduationCap, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => { document.title = 'LeeTec SMS — Reset Password'; }, []);

  if (!token) {
    return (
      <div className="auth-page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="auth-login-card" style={{ textAlign: 'center', maxWidth: 420 }}>
            <h2 className="auth-login-title">Invalid or Missing Link</h2>
            <p className="auth-login-sub">
              This reset link is invalid or has expired. Please request a new one.
            </p>
            <Link to="/student-login" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 16 }}>
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await portalAPI.resetPassword(token, password, confirmPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
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
              <p className="admin-brand-title">Advent Hope Academy</p>
              <p className="admin-brand-subtitle">Student Portal</p>
            </div>
          </div>
        </div>
      </header>

      <section className="auth-hero">
        <div className="container" style={{ maxWidth: 480, margin: '0 auto', paddingTop: 60 }}>
          <div className="auth-login-card">
            <span className="auth-badge">Password Reset</span>

            {success ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h2 className="auth-login-title">Password reset!</h2>
                <p className="auth-login-sub">
                  Your password has been updated. You can now log in with your new password.
                </p>
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 16 }}
                  onClick={() => navigate('/student-login')}
                >
                  Go to Login <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <>
                <h2 className="auth-login-title">Set a new password</h2>
                <p className="auth-login-sub">
                  Choose a secure password for your student portal account.
                </p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                  <div>
                    <label className="auth-label">New Password</label>
                    <div className="field-wrap" style={{ marginTop: 6 }}>
                      <span className="field-icon field-icon-left"><Lock size={15} /></span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        required
                        className="text-field with-right"
                      />
                      <button
                        type="button"
                        className="field-icon field-icon-right"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="auth-label">Confirm Password</label>
                    <div className="field-wrap" style={{ marginTop: 6 }}>
                      <span className="field-icon field-icon-left"><Lock size={15} /></span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        required
                        className="text-field"
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn btn-primary">
                    {loading ? 'Resetting...' : <><span>Reset Password</span><ArrowRight size={15} /></>}
                  </button>
                </form>
                <Link
                  to="/student-login"
                  style={{ display: 'block', textAlign: 'center', fontSize: 12, color: '#0ea5e9', marginTop: 10 }}
                >
                  ← Back to login
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
