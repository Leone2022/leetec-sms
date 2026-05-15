import { useState, useEffect } from 'react';
import { portalAPI } from '../services/api';
import { ClipboardCheck, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

export default function ApprovalsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  useEffect(() => { loadAccounts(); }, []);

  const loadAccounts = async () => {
    try {
      const res = await portalAPI.getPendingAccounts();
      setAccounts(res.data || []);
    } catch (err) {
      console.error(err);
      showMessage('Failed to load pending accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleApprove = async (id: number) => {
    setActionId(id);
    try {
      await portalAPI.approveAccount(id);
      showMessage('Account approved. Student can now log in.', 'success');
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      console.error(err.response);
      showMessage(err.response?.data?.message || 'Failed to approve account', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleSuspend = async (id: number) => {
    setActionId(id);
    try {
      await portalAPI.suspendAccount(id);
      showMessage('Account suspended.', 'success');
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      console.error(err.response);
      showMessage(err.response?.data?.message || 'Failed to suspend account', 'error');
    } finally {
      setActionId(null);
    }
  };

  const pendingCount = accounts.length;

  return (
    <AdminLayout
      title="Portal Approvals"
      subtitle={pendingCount > 0 ? `${pendingCount} pending` : 'All clear'}
    >
      {message && (
        <div style={{
          position: 'fixed', top: 80, right: 20, padding: '14px 18px', borderRadius: '10px',
          background: message.type === 'success' ? '#0ea5e9' : '#dc2626', color: 'white',
          fontSize: '13px', fontWeight: '500', zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {message.text}
        </div>
      )}

      {/* Pending badge banner */}
      {pendingCount > 0 && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px',
          padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <Clock size={16} style={{ color: '#b45309', flexShrink: 0 }} />
          <div style={{ fontSize: '13px', color: '#92400e' }}>
            <strong>{pendingCount} student portal account{pendingCount !== 1 ? 's' : ''}</strong> awaiting approval.
            Review and approve or suspend each request below.
          </div>
        </div>
      )}

      <div className="table-card">
        <div className="table-head">
          <div>
            <h3>Pending Accounts</h3>
            <p>Student portal registration requests</p>
          </div>
          {pendingCount > 0 && (
            <span className="pill" style={{ background: '#fffbeb', color: '#b45309', fontSize: '12px', padding: '4px 10px' }}>
              {pendingCount} pending
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>Loading...</div>
        ) : accounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>
            <ClipboardCheck size={40} style={{ margin: '0 auto 14px', color: '#94a3b8' }} />
            <p style={{ fontWeight: 600, marginBottom: 4 }}>No pending approvals</p>
            <p style={{ fontSize: '13px' }}>All student portal requests have been reviewed.</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th><th>Student Number</th><th>Email</th><th>Registered</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc: any) => {
                  const busy = actionId === acc.id;
                  return (
                    <tr key={acc.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="mini-avatar">
                            {acc.student?.firstName?.[0] ?? <User size={14} />}
                            {acc.student?.surname?.[0]}
                          </div>
                          <div>
                            <strong style={{ fontSize: 13 }}>
                              {acc.student?.firstName ?? acc.firstName ?? '—'} {acc.student?.surname ?? acc.surname ?? ''}
                            </strong>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'ui-monospace, monospace' }}>
                        {acc.student?.studentNumber ?? acc.studentNumber ?? '—'}
                      </td>
                      <td>{acc.email}</td>
                      <td style={{ color: '#64748b', fontSize: 12 }}>
                        {acc.createdAt ? new Date(acc.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '5px 10px', fontSize: 12, opacity: busy ? 0.7 : 1 }}
                            onClick={() => handleApprove(acc.id)}
                            disabled={busy}
                          >
                            <CheckCircle size={12} /> Approve
                          </button>
                          <button
                            className="btn"
                            style={{ padding: '5px 10px', fontSize: 12, background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', opacity: busy ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                            onClick={() => handleSuspend(acc.id)}
                            disabled={busy}
                          >
                            <XCircle size={12} /> Suspend
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
    </AdminLayout>
  );
}
