import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { activationAPI } from '../services/api';
import { GraduationCap, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function ActivatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = 'LeeTec SMS — Activate Account'; }, []);

  if (!token) {
    return (
      <div className="auth-page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="auth-login-card" style={{ textAlign: 'center', maxWidth: 420 }}>
            <h2 className="auth-login-title">Invalid Link</h2>
            <p className="auth-login-sub">
              This activation link is missing a token. Please use the link sent to your email.
            </p>
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
      const res = await activationAPI.activate(token, password, confirmPassword);
      const { token: jwt, student } = res.data;
      localStorage.setItem('student_token', jwt);
      localStorage.setItem('student_info', JSON.stringify(student));
      navigate('/student-dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Activation failed. The link may have expired.');
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
            <span className="auth-badge">Account Activation</span>
            <h2 className="auth-login-title">Set your password</h2>
            <p className="auth-login-sub">
              Choose a secure password to activate your student portal account.
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
                {loading ? 'Activating...' : <><span>Activate Account</span><ArrowRight size={15} /></>}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
