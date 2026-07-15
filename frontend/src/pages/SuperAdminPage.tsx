import { useState, useEffect } from 'react';
import { superadminAPI, adminAPI, marksAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, TrendingUp, Shield, Plus, X, ToggleLeft, ToggleRight, Pencil, KeyRound, Trash2 } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

const blankSchool = () => ({ name: '', address: '', phone: '', email: '' });

const PERMISSION_OPTIONS = [
  'Students', 'Fees & Billing', 'Fee Setup', 'Marks Entry', 'Bulk Reports',
  'Subjects', 'Announcements', 'Portal Accounts', 'Terms & Periods', 'Staff Assignments',
];

const blankAdminForm = () => ({
  firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
  permissions: [...PERMISSION_OPTIONS],
});

export default function SuperAdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [schoolForm, setSchoolForm] = useState(blankSchool());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Admin Accounts ────────────────────────────────────────────────────────
  const [admins, setAdmins] = useState<any[]>([]);
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
  const [adminForm, setAdminForm] = useState(blankAdminForm());
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const [permEditAdmin, setPermEditAdmin] = useState<any>(null);
  const [permEditValues, setPermEditValues] = useState<string[]>([]);
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  const [resetPwAdmin, setResetPwAdmin] = useState<any>(null);
  const [resetPwValue, setResetPwValue] = useState('');
  const [isResettingPw, setIsResettingPw] = useState(false);

  const [deletingAdminId, setDeletingAdminId] = useState<number | null>(null);

  // ── Marks Amendment Requests ─────────────────────────────────────────────
  const [amendmentRequests, setAmendmentRequests] = useState<any[]>([]);
  const [loadingAmendments, setLoadingAmendments] = useState(false);
  const [actioningAmendmentKey, setActioningAmendmentKey] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'SuperAdmin') {
      navigate('/dashboard');
      return;
    }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    try {
      const [statsRes, schoolsRes, usersRes, adminsRes, amendmentsRes] = await Promise.all([
        superadminAPI.getStats(),
        superadminAPI.getSchools(),
        superadminAPI.getUsers(),
        adminAPI.getAdmins(),
        marksAPI.getAmendmentRequests(),
      ]);
      setStats(statsRes.data);
      setSchools(schoolsRes.data || []);
      setUsers(usersRes.data || []);
      setAdmins(adminsRes.data || []);
      setAmendmentRequests(amendmentsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAmendmentRequests = async () => {
    setLoadingAmendments(true);
    try {
      const res = await marksAPI.getAmendmentRequests();
      setAmendmentRequests(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAmendments(false);
    }
  };

  const amendmentKey = (g: any) => `${g.subjectId}-${g.termId}-${g.campus}-${g.form}`;

  const handleApproveAmendment = async (g: any) => {
    const key = amendmentKey(g);
    setActioningAmendmentKey(key);
    try {
      await marksAPI.approveAmendment({ subjectId: g.subjectId, termId: g.termId, campus: g.campus, form: g.form });
      showMessage('Marks unlocked for teacher to re-enter', 'success');
      await loadAmendmentRequests();
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to approve amendment', 'error');
    } finally {
      setActioningAmendmentKey(null);
    }
  };

  const handleRejectAmendment = async (g: any) => {
    const reason = window.prompt(`Reject the amendment request for ${g.subjectName} — ${g.form}? Optional reason:`);
    if (reason === null) return;
    const key = amendmentKey(g);
    setActioningAmendmentKey(key);
    try {
      await marksAPI.rejectAmendment({ subjectId: g.subjectId, termId: g.termId, campus: g.campus, form: g.form, reason: reason || undefined });
      showMessage('Amendment request rejected', 'success');
      await loadAmendmentRequests();
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to reject amendment', 'error');
    } finally {
      setActioningAmendmentKey(null);
    }
  };

  const loadAdmins = async () => {
    try {
      const res = await adminAPI.getAdmins();
      setAdmins(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolForm.name.trim()) { showMessage('School name is required', 'error'); return; }
    setIsSubmitting(true);
    try {
      await superadminAPI.createSchool(schoolForm);
      showMessage('School created successfully', 'success');
      setIsModalOpen(false);
      setSchoolForm(blankSchool());
      const res = await superadminAPI.getSchools();
      setSchools(res.data || []);
    } catch (err: any) {
      console.error(err.response);
      showMessage(err.response?.data?.message || 'Failed to create school', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSchool = async (id: number) => {
    try {
      await superadminAPI.toggleSchoolActive(id);
      const res = await superadminAPI.getSchools();
      setSchools(res.data || []);
      showMessage('School status updated', 'success');
    } catch (err: any) {
      console.error(err.response);
      showMessage(err.response?.data?.message || 'Failed to toggle status', 'error');
    }
  };

  // ── Admin Account handlers ───────────────────────────────────────────────
  const toggleAdminFormPermission = (perm: string) => {
    setAdminForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter((p) => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.firstName.trim() || !adminForm.lastName.trim() || !adminForm.email.trim()) {
      showMessage('First name, last name and email are required', 'error'); return;
    }
    if (adminForm.password.length < 8) { showMessage('Password must be at least 8 characters', 'error'); return; }
    if (adminForm.password !== adminForm.confirmPassword) { showMessage('Passwords do not match', 'error'); return; }
    setIsCreatingAdmin(true);
    try {
      await adminAPI.createAdmin({
        firstName: adminForm.firstName.trim(),
        lastName: adminForm.lastName.trim(),
        email: adminForm.email.trim(),
        password: adminForm.password,
        permissions: adminForm.permissions,
      });
      showMessage('Admin account created successfully', 'success');
      setIsCreateAdminOpen(false);
      setAdminForm(blankAdminForm());
      loadAdmins();
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to create admin', 'error');
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const openPermissionsModal = (admin: any) => {
    setPermEditAdmin(admin);
    setPermEditValues(admin.permissions || []);
  };

  const togglePermEditValue = (perm: string) => {
    setPermEditValues((vals) => vals.includes(perm) ? vals.filter((p) => p !== perm) : [...vals, perm]);
  };

  const handleSavePermissions = async () => {
    if (!permEditAdmin) return;
    setIsSavingPerms(true);
    try {
      await adminAPI.updateAdminPermissions(permEditAdmin.id, permEditValues);
      showMessage('Permissions updated successfully', 'success');
      setPermEditAdmin(null);
      loadAdmins();
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to update permissions', 'error');
    } finally {
      setIsSavingPerms(false);
    }
  };

  const handleResetAdminPassword = async () => {
    if (!resetPwAdmin) return;
    if (resetPwValue.length < 8) { showMessage('Password must be at least 8 characters', 'error'); return; }
    setIsResettingPw(true);
    try {
      await adminAPI.resetAdminPassword(resetPwAdmin.id, resetPwValue);
      showMessage('Password reset successfully', 'success');
      setResetPwAdmin(null);
      setResetPwValue('');
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to reset password', 'error');
    } finally {
      setIsResettingPw(false);
    }
  };

  const handleDeleteAdmin = async (admin: any) => {
    if (!window.confirm(`Delete admin account for ${admin.firstName} ${admin.lastName}? This cannot be undone.`)) return;
    setDeletingAdminId(admin.id);
    try {
      await adminAPI.deleteAdmin(admin.id);
      showMessage('Admin deleted successfully', 'success');
      loadAdmins();
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to delete admin', 'error');
    } finally {
      setDeletingAdminId(null);
    }
  };

  const statCards = stats ? [
    { label: 'Total Schools', value: stats.totalSchools ?? 0, Icon: Building2, bg: '#eef2ff', color: '#4338ca' },
    { label: 'Total Students', value: stats.totalStudents ?? 0, Icon: Users, bg: '#f0fdf4', color: '#15803d' },
    { label: 'Total Users', value: stats.totalUsers ?? 0, Icon: Shield, bg: '#fff7ed', color: '#ea580c' },
    { label: 'Active Schools', value: stats.activeSchools ?? 0, Icon: TrendingUp, bg: '#eff6ff', color: '#1d4ed8' },
  ] : [];

  const fieldStyle = { paddingLeft: '14px', paddingRight: '14px' };
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: '600', color: '#0f172a', display: 'block', marginBottom: '6px' };

  return (
    <AdminLayout title="Super Admin" subtitle="Platform management">
      {message && (
        <div style={{
          position: 'fixed', top: 80, right: 20, padding: '14px 18px',
          borderRadius: '10px', background: message.type === 'success' ? '#0ea5e9' : '#dc2626',
          color: 'white', fontSize: '13px', fontWeight: '500', zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>Loading platform data...</div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <section className="stat-grid" style={{ marginBottom: 20 }}>
              {statCards.map(({ label, value, Icon, bg, color }) => (
                <div key={label} className="stat-card">
                  <span className="stat-icon" style={{ background: bg, color }}>
                    <Icon size={17} />
                  </span>
                  <p className="value">{value.toLocaleString()}</p>
                  <p className="label">{label}</p>
                </div>
              ))}
            </section>
          )}

          {/* Admin Accounts */}
          <div className="table-card" style={{ marginBottom: 20 }}>
            <div className="table-head">
              <div>
                <h3>Admin Accounts</h3>
                <p>{admins.length} admin account{admins.length !== 1 ? 's' : ''}</p>
              </div>
              <button className="btn btn-primary" onClick={() => { setAdminForm(blankAdminForm()); setIsCreateAdminOpen(true); }}>
                <Plus size={14} /> Create Admin
              </button>
            </div>

            {admins.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>No admin accounts yet</div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th><th>Email</th><th>Status</th><th>Permissions</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((a: any) => {
                      const isSuperAdminRow = a.role === 'SuperAdmin';
                      const permList: string[] = a.permissions || [];
                      return (
                        <tr key={a.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="mini-avatar">{a.firstName?.[0]}{a.lastName?.[0]}</div>
                              <div>
                                <strong style={{ fontSize: 13 }}>{a.firstName} {a.lastName}</strong>
                                {isSuperAdminRow && (
                                  <p style={{ fontSize: 10, color: '#9333ea', margin: 0, fontWeight: 700 }}>SUPERADMIN</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>{a.email}</td>
                          <td>
                            <span className={`pill ${a.status === 'Active' ? 'pill-success' : 'pill-danger'}`}>
                              {a.status}
                            </span>
                          </td>
                          <td style={{ maxWidth: 260 }}>
                            {isSuperAdminRow ? (
                              <span style={{ fontSize: 12, color: '#64748b' }}>All (SuperAdmin)</span>
                            ) : permList.length === 0 ? (
                              <span style={{ fontSize: 12, color: '#94a3b8' }}>None</span>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }} title={permList.join(', ')}>
                                {permList.slice(0, 3).map((p) => (
                                  <span key={p} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: '#eef2ff', color: '#4338ca', fontWeight: 600 }}>{p}</span>
                                ))}
                                {permList.length > 3 && (
                                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>+{permList.length - 3} more</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button
                                className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }}
                                onClick={() => openPermissionsModal(a)}
                                disabled={isSuperAdminRow}
                              >
                                <Pencil size={12} /> Permissions
                              </button>
                              <button
                                className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }}
                                onClick={() => { setResetPwAdmin(a); setResetPwValue(''); }}
                              >
                                <KeyRound size={12} /> Reset Password
                              </button>
                              <button
                                className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12, color: '#dc2626' }}
                                onClick={() => handleDeleteAdmin(a)}
                                disabled={isSuperAdminRow || deletingAdminId === a.id}
                              >
                                <Trash2 size={12} /> {deletingAdminId === a.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Marks Amendment Requests */}
          <div className="table-card" style={{ marginBottom: 20 }}>
            <div className="table-head">
              <div>
                <h3>
                  📝 Marks Amendment Requests
                  {amendmentRequests.length > 0 && (
                    <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                      {amendmentRequests.length}
                    </span>
                  )}
                </h3>
                <p>Requests to amend already-approved marks</p>
              </div>
            </div>

            {loadingAmendments ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>Loading...</div>
            ) : amendmentRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>No amendment requests</div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject</th><th>Form</th><th>Campus</th><th>Reason</th><th>Meeting Date</th><th>Minute Ref</th><th>Requested By</th><th>Date</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amendmentRequests.map((g: any) => {
                      const key = amendmentKey(g);
                      const busy = actioningAmendmentKey === key;
                      return (
                        <tr key={key}>
                          <td>{g.subjectName}</td>
                          <td>{g.form}</td>
                          <td>{g.campus}</td>
                          <td style={{ maxWidth: 220 }}>{g.reason}</td>
                          <td>{g.meetingDate}</td>
                          <td>{g.minuteReference}</td>
                          <td>{g.requestedBy}</td>
                          <td>{g.requestedAt ? new Date(g.requestedAt).toLocaleDateString() : ''}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button
                                className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12, color: '#16a34a' }}
                                onClick={() => handleApproveAmendment(g)}
                                disabled={busy}
                              >
                                ✅ {busy ? 'Working...' : 'Approve'}
                              </button>
                              <button
                                className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: 12, color: '#dc2626' }}
                                onClick={() => handleRejectAmendment(g)}
                                disabled={busy}
                              >
                                ❌ Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Schools */}
          <div className="table-card" style={{ marginBottom: 20 }}>
            <div className="table-head">
              <div>
                <h3>Schools</h3>
                <p>{schools.length} registered school{schools.length !== 1 ? 's' : ''}</p>
              </div>
              <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                <Plus size={14} /> New School
              </button>
            </div>

            {schools.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>No schools registered yet</div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>School Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schools.map((s: any) => (
                      <tr key={s.id}>
                        <td>
                          <div>
                            <strong style={{ fontSize: 13 }}>{s.name}</strong>
                            {s.address && <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{s.address}</p>}
                          </div>
                        </td>
                        <td>{s.email || '—'}</td>
                        <td>{s.phone || '—'}</td>
                        <td>
                          <span className={`pill ${s.isActive ? 'pill-success' : 'pill-danger'}`}>
                            {s.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: 12 }}
                            onClick={() => handleToggleSchool(s.id)}
                          >
                            {s.isActive
                              ? <><ToggleRight size={13} /> Deactivate</>
                              : <><ToggleLeft size={13} /> Activate</>
                            }
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Users */}
          <div className="table-card">
            <div className="table-head">
              <div>
                <h3>All Users</h3>
                <p>{users.length} user{users.length !== 1 ? 's' : ''} across all schools</p>
              </div>
            </div>

            {users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>No users found</div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th><th>Email</th><th>Role</th><th>School</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u: any) => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="mini-avatar">{u.firstName?.[0]}{u.lastName?.[0]}</div>
                            <strong style={{ fontSize: 13 }}>{u.firstName} {u.lastName}</strong>
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span className="pill" style={{ background: u.role === 'SuperAdmin' ? '#fdf4ff' : '#eef2ff', color: u.role === 'SuperAdmin' ? '#9333ea' : '#4338ca' }}>
                            {u.role}
                          </span>
                        </td>
                        <td>{u.schoolName ?? 'Advent Hope Academy'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create School Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setIsModalOpen(false)}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Create New School</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSchool} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>School Name *</label>
                <input type="text" value={schoolForm.name} onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                  placeholder="e.g. LeeTec High School" required className="text-field" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Address</label>
                <input type="text" value={schoolForm.address} onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                  placeholder="123 School Street, Harare" className="text-field" style={fieldStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input type="text" value={schoolForm.phone} onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                    placeholder="+263 4 123456" className="text-field" style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={schoolForm.email} onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                    placeholder="admin@school.ac.zw" className="text-field" style={fieldStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Creating...' : 'Create School'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {isCreateAdminOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setIsCreateAdminOpen(false)}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Create Admin</h2>
              <button onClick={() => setIsCreateAdminOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateAdmin} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>First Name *</label>
                  <input type="text" value={adminForm.firstName} onChange={(e) => setAdminForm({ ...adminForm, firstName: e.target.value })}
                    placeholder="First name" required className="text-field" style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Last Name *</label>
                  <input type="text" value={adminForm.lastName} onChange={(e) => setAdminForm({ ...adminForm, lastName: e.target.value })}
                    placeholder="Last name" required className="text-field" style={fieldStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input type="email" value={adminForm.email} onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  placeholder="admin@school.ac.zw" required className="text-field" style={fieldStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Password *</label>
                  <input type="password" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    placeholder="At least 8 characters" required minLength={8} className="text-field" style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Confirm Password *</label>
                  <input type="password" value={adminForm.confirmPassword} onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                    placeholder="Re-enter password" required minLength={8} className="text-field" style={fieldStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Permissions</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                  {PERMISSION_OPTIONS.map((perm) => (
                    <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0f172a', cursor: 'pointer' }}>
                      <input type="checkbox" checked={adminForm.permissions.includes(perm)} onChange={() => toggleAdminFormPermission(perm)} />
                      {perm}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateAdminOpen(false)} disabled={isCreatingAdmin}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isCreatingAdmin} style={{ opacity: isCreatingAdmin ? 0.7 : 1 }}>
                  {isCreatingAdmin ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {permEditAdmin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setPermEditAdmin(null)}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Edit Permissions</h2>
                <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>{permEditAdmin.firstName} {permEditAdmin.lastName}</p>
              </div>
              <button onClick={() => setPermEditAdmin(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                {PERMISSION_OPTIONS.map((perm) => (
                  <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0f172a', cursor: 'pointer' }}>
                    <input type="checkbox" checked={permEditValues.includes(perm)} onChange={() => togglePermEditValue(perm)} />
                    {perm}
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPermEditAdmin(null)} disabled={isSavingPerms}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSavePermissions} disabled={isSavingPerms} style={{ opacity: isSavingPerms ? 0.7 : 1 }}>
                  {isSavingPerms ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPwAdmin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setResetPwAdmin(null)}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '420px' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Reset Password</h2>
                <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>{resetPwAdmin.firstName} {resetPwAdmin.lastName}</p>
              </div>
              <button onClick={() => setResetPwAdmin(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>New Password *</label>
                <input type="password" value={resetPwValue} onChange={(e) => setResetPwValue(e.target.value)}
                  placeholder="At least 8 characters" minLength={8} className="text-field" style={fieldStyle} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setResetPwAdmin(null)} disabled={isResettingPw}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleResetAdminPassword} disabled={isResettingPw} style={{ opacity: isResettingPw ? 0.7 : 1 }}>
                  {isResettingPw ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
