import { useState, useEffect } from 'react';
import { superadminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, TrendingUp, Shield, Plus, X, ToggleLeft, ToggleRight } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

const blankSchool = () => ({ name: '', address: '', phone: '', email: '' });

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

  useEffect(() => {
    if (user?.role !== 'SuperAdmin') {
      navigate('/dashboard');
      return;
    }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    try {
      const [statsRes, schoolsRes, usersRes] = await Promise.all([
        superadminAPI.getStats(),
        superadminAPI.getSchools(),
        superadminAPI.getUsers(),
      ]);
      setStats(statsRes.data);
      setSchools(schoolsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
                        <td>{u.school?.name ?? `School ${u.schoolId}`}</td>
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
    </AdminLayout>
  );
}
