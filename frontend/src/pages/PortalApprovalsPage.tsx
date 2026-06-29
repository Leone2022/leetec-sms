import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AdminLayout from '../components/AdminLayout';
import { UserCheck, RefreshCw } from 'lucide-react';

export default function PortalApprovalsPage() {
  useAuth();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => { loadRegistrations(); }, []);

  const loadRegistrations = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getPortalRegistrations();
      setRegistrations(res.data);
    } catch {
      showMessage('Failed to load registrations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    try {
      await adminAPI.approvePortalRegistration(id);
      showMessage('Account approved successfully', 'success');
      loadRegistrations();
    } catch {
      showMessage('Failed to approve account', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!window.confirm('Reject and delete this registration? This cannot be undone.')) return;
    setProcessingId(id);
    try {
      await adminAPI.rejectPortalRegistration(id);
      showMessage('Registration rejected', 'success');
      loadRegistrations();
    } catch {
      showMessage('Failed to reject registration', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AdminLayout title="Portal Registrations" subtitle={`${registrations.length} pending`}>
      {message && (
        <div style={{
          position: 'fixed', top: 20, right: 20,
          padding: '14px 20px', borderRadius: '10px',
          background: message.type === 'success' ? '#16a34a' : '#dc2626',
          color: 'white', fontSize: '14px', fontWeight: '600',
          zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          cursor: 'pointer',
        }} onClick={() => setMessage(null)}>
          {message.text}
        </div>
      )}

      <div className="toolbar">
        <div className="toolbar-meta">
          <UserCheck size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {registrations.length} pending registration{registrations.length !== 1 ? 's' : ''}
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-secondary" onClick={loadRegistrations} style={{ fontSize: '13px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>Loading...</div>
        ) : registrations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#475569' }}>
            <UserCheck size={36} style={{ color: '#cbd5e1', marginBottom: 12 }} />
            <p style={{ fontWeight: '600', margin: '0 0 4px', fontSize: '15px' }}>No pending registrations</p>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              Student portal registration requests will appear here for approval.
            </p>
          </div>
        ) : (
          <>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Number</th>
                    <th>Name</th>
                    <th>Form</th>
                    <th>Campus</th>
                    <th>Email</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{r.studentNumber}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="mini-avatar">{r.firstName?.[0]}{r.surname?.[0]}</div>
                          <strong style={{ fontSize: 13 }}>{r.firstName} {r.surname}</strong>
                        </div>
                      </td>
                      <td>{r.form}</td>
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#1a237e',
                          background: '#eef2ff', padding: '3px 8px', borderRadius: 4 }}>
                          {r.campus}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>{r.email}</td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn"
                            disabled={processingId === r.id}
                            onClick={() => handleApprove(r.id)}
                            style={{ background: '#16a34a', color: 'white', border: 'none',
                              fontSize: 12, opacity: processingId === r.id ? 0.6 : 1 }}
                          >
                            {processingId === r.id ? '...' : 'Approve'}
                          </button>
                          <button
                            className="btn"
                            disabled={processingId === r.id}
                            onClick={() => handleReject(r.id)}
                            style={{ background: '#dc2626', color: 'white', border: 'none',
                              fontSize: 12, opacity: processingId === r.id ? 0.6 : 1 }}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              {registrations.length} pending registration{registrations.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
