import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Lock, Eye, EyeOff, ArrowRight, GraduationCap } from 'lucide-react';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { document.title = 'LeeTec SMS — Change Password'; }, []);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password');
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
              <p className="admin-brand-title">LeeTec Solutions</p>
              <p className="admin-brand-subtitle">School Management Platform</p>
            </div>
          </div>
        </div>
      </header>

      <section className="auth-hero">
        <div className="container" style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="auth-login-wrap">
            <div className="auth-login-card">
              <span className="auth-badge">Security</span>
              <h2 className="auth-login-title">Change Your Password</h2>
              <p className="auth-login-sub">You must set a new password before continuing</p>

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={handleSubmit} className="auth-form">
                <div>
                  <label className="auth-label" htmlFor="currentPassword">
                    Current / Temporary Password
                  </label>
                  <div className="field-wrap" style={{ marginTop: 6 }}>
                    <span className="field-icon field-icon-left">
                      <Lock size={15} />
                    </span>
                    <input
                      id="currentPassword"
                      type={showPasswords ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current or temporary password"
                      required
                      className="text-field with-right"
                    />
                    <button
                      type="button"
                      className="field-icon field-icon-right"
                      onClick={() => setShowPasswords((v) => !v)}
                      aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                    >
                      {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="auth-label" htmlFor="newPassword">
                    New Password
                  </label>
                  <div className="field-wrap" style={{ marginTop: 6 }}>
                    <span className="field-icon field-icon-left">
                      <Lock size={15} />
                    </span>
                    <input
                      id="newPassword"
                      type={showPasswords ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      minLength={8}
                      className="text-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="auth-label" htmlFor="confirmPassword">
                    Confirm New Password
                  </label>
                  <div className="field-wrap" style={{ marginTop: 6 }}>
                    <span className="field-icon field-icon-left">
                      <Lock size={15} />
                    </span>
                    <input
                      id="confirmPassword"
                      type={showPasswords ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      minLength={8}
                      className="text-field"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? (
                    'Saving...'
                  ) : (
                    <>
                      <span>Set New Password</span>
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
