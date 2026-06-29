import { useState, useEffect } from 'react';
import { portalAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AdminLayout from '../components/AdminLayout';
import { RefreshCw, Users } from 'lucide-react';

type PortalFilter = 'All' | 'Active' | 'Pending' | 'None';

export default function PortalAccountsPage() {
  useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PortalFilter>('All');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await portalAPI.getAll();
      setRecords(res.data);
    } catch {
      showMessage('Failed to load portal accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleApprove = async (portalAccountId: number) => {
    setProcessingId(portalAccountId);
    try {
      await portalAPI.approve(portalAccountId);
      showMessage('Account approved successfully', 'success');
      load();
    } catch {
      showMessage('Failed to approve account', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (portalAccountId: number, name: string) => {
    if (!window.confirm(`Delete portal account for ${name}? They will need to register again.`)) return;
    setProcessingId(portalAccountId);
    try {
      await portalAPI.remove(portalAccountId);
      showMessage('Portal account deleted', 'success');
      load();
    } catch {
      showMessage('Failed to delete account', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const total = records.length;
  const hasPortal = records.filter(r => r.portalStatus !== 'None').length;
  const pending = records.filter(r => r.portalStatus === 'Pending').length;
  const active = records.filter(r => r.portalStatus === 'Active').length;
  const none = records.filter(r => r.portalStatus === 'None').length;

  const filtered = filter === 'All' ? records : records.filter(r => r.portalStatus === filter);

  const filterCount: Record<PortalFilter, number> = { All: total, Active: active, Pending: pending, None: none };

  const statusBadge = (status: string) => {
    const styles: Record<string, React.CSSProperties> = {
      Active:  { background: '#dcfce7', color: '#15803d' },
      Pending: { background: '#fef3c7', color: '#92400e' },
      None:    { background: '#f1f5f9', color: '#64748b' },
    };
    const s = styles[status] ?? styles['None'];
    return (
      <span style={{ ...s, padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
        {status}
      </span>
    );
  };

  return (
    <AdminLayout title="Student Portal Accounts" subtitle={`${total} students`}>
      {message && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '14px 20px', borderRadius: 10,
          background: message.type === 'success' ? '#16a34a' : '#dc2626',
          color: 'white', fontSize: 14, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)', cursor: 'pointer',
        }} onClick={() => setMessage(null)}>
          {message.text}
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {([
          { label: 'Total Students', value: total,     color: '#1a237e', bg: '#eef2ff' },
          { label: 'Has Portal',     value: hasPortal, color: '#0369a1', bg: '#e0f2fe' },
          { label: 'Pending',        value: pending,   color: '#92400e', bg: '#fef3c7' },
          { label: 'Active',         value: active,    color: '#15803d', bg: '#dcfce7' },
          { label: 'No Account',     value: none,      color: '#475569', bg: '#f1f5f9' },
        ] as const).map(({ label, value, color, bg }) => (
          <div key={label} style={{
            background: 'white', borderRadius: 10, padding: '16px 20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: `4px solid ${color}`,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>{label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color, margin: 0, background: bg, display: 'inline-block', padding: '1px 10px', borderRadius: 6 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="toolbar">
        <div style={{ display: 'flex', gap: 4 }}>
          {(['All', 'Active', 'Pending', 'None'] as PortalFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', fontSize: 13,
                fontWeight: filter === f ? 700 : 500,
                background: filter === f ? '#1a237e' : 'transparent',
                color: filter === f ? 'white' : '#475569',
                border: filter === f ? 'none' : '1px solid #e2e8f0',
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              {f} ({filterCount[f]})
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-secondary" onClick={load} style={{ fontSize: 13 }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
            <Users size={36} style={{ color: '#cbd5e1', marginBottom: 12 }} />
            <p style={{ fontWeight: 600, margin: '0 0 4px', fontSize: 15 }}>No records</p>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              {filter === 'All' ? 'No students enrolled yet.' : `No students with portal status "${filter}".`}
            </p>
          </div>
        ) : (
          <>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student No.</th>
                    <th>Name</th>
                    <th>Form</th>
                    <th>Campus</th>
                    <th>Portal Email</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.studentId}>
                      <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{r.studentNumber}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="mini-avatar">{r.firstName?.[0]}{r.surname?.[0]}</div>
                          <strong style={{ fontSize: 13 }}>{r.firstName} {r.surname}</strong>
                        </div>
                      </td>
                      <td>{r.form}</td>
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1a237e', background: '#eef2ff', padding: '3px 8px', borderRadius: 4 }}>
                          {r.campus}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: r.portalEmail ? '#0f172a' : '#94a3b8' }}>
                        {r.portalEmail ?? '—'}
                      </td>
                      <td>{statusBadge(r.portalStatus)}</td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>
                        {r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {r.portalStatus === 'Pending' && (
                            <button
                              className="btn"
                              disabled={processingId === r.portalAccountId}
                              onClick={() => handleApprove(r.portalAccountId)}
                              style={{ background: '#16a34a', color: 'white', border: 'none', fontSize: 12, opacity: processingId === r.portalAccountId ? 0.6 : 1 }}
                            >
                              {processingId === r.portalAccountId ? '...' : 'Approve'}
                            </button>
                          )}
                          {r.portalStatus !== 'None' && (
                            <button
                              className="btn"
                              disabled={processingId === r.portalAccountId}
                              onClick={() => handleDelete(r.portalAccountId, `${r.firstName} ${r.surname}`)}
                              style={{ background: '#dc2626', color: 'white', border: 'none', fontSize: 12, opacity: processingId === r.portalAccountId ? 0.6 : 1 }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              {filtered.length} of {total} students
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
