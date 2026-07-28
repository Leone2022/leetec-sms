import { useState, useEffect, useCallback, useMemo } from 'react';
import { adminAPI } from '../services/api';
import AdminLayout from '../components/AdminLayout';
import { ArrowLeftRight, Check, X, Clock, CheckCircle, XCircle } from 'lucide-react';

interface SubjectChangeRequest {
  id: number;
  studentId: number;
  studentName: string;
  studentNumber: string;
  campus: string;
  form: string;
  subjectId: number;
  subjectName: string;
  action: 'Add' | 'Drop';
  reason: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason: string | null;
  reviewedAt: string | null;
}

type FilterTab = 'All' | 'Pending' | 'Approved' | 'Rejected';

const isToday = (iso: string | null) => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

export default function SubjectRequestsPage() {
  const [requests, setRequests] = useState<SubjectChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filter, setFilter] = useState<FilterTab>('Pending');
  const [rejectTarget, setRejectTarget] = useState<SubjectChangeRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getSubjectChangeRequests();
      setRequests(res.data || []);
    } catch {
      showMsg('Failed to load subject change requests', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const summary = useMemo(() => ({
    totalPending: requests.filter(r => r.status === 'Pending').length,
    approvedToday: requests.filter(r => r.status === 'Approved' && isToday(r.reviewedAt)).length,
    rejected: requests.filter(r => r.status === 'Rejected').length,
  }), [requests]);

  const filteredRequests = filter === 'All' ? requests : requests.filter(r => r.status === filter);

  const handleApprove = async (id: number) => {
    setActingId(id);
    try {
      const res = await adminAPI.approveSubjectRequest(id);
      showMsg(res.data?.message || 'Request approved', 'success');
      await loadRequests();
    } catch (err: any) {
      showMsg(err?.response?.data?.message || 'Failed to approve request', 'error');
    } finally {
      setActingId(null);
    }
  };

  const openReject = (r: SubjectChangeRequest) => {
    setRejectTarget(r);
    setRejectReason('');
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setActingId(rejectTarget.id);
    try {
      await adminAPI.rejectSubjectRequest(rejectTarget.id, rejectReason.trim() || undefined);
      showMsg('Request rejected', 'success');
      setRejectTarget(null);
      await loadRequests();
    } catch (err: any) {
      showMsg(err?.response?.data?.message || 'Failed to reject request', 'error');
    } finally {
      setActingId(null);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'Approved') return { bg: '#dcfce7', color: '#166534' };
    if (status === 'Rejected') return { bg: '#fee2e2', color: '#991b1b' };
    return { bg: '#ffedd5', color: '#9a3412' };
  };

  return (
    <AdminLayout title="Subject Change Requests" subtitle="Review and action student subject add/drop requests">
      {message && (
        <div style={{ position: 'fixed', top: 80, right: 20, padding: '14px 18px', borderRadius: 10, background: message.type === 'success' ? '#0ea5e9' : '#dc2626', color: 'white', fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
        {[
          { label: 'Total Pending', value: summary.totalPending, icon: Clock, color: '#c2410c', bg: '#fff7ed' },
          { label: 'Approved Today', value: summary.approvedToday, icon: CheckCircle, color: '#15803d', bg: '#f0fdf4' },
          { label: 'Rejected', value: summary.rejected, icon: XCircle, color: '#dc2626', bg: '#fef2f2' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={{ background: 'white', borderRadius: 12, padding: '16px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Icon size={15} color={color} />
            </div>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>{value}</p>
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['All', 'Pending', 'Approved', 'Rejected'] as FilterTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              border: filter === tab ? '1.5px solid #1a237e' : '1.5px solid #e2e8f0',
              background: filter === tab ? '#eef2ff' : 'white',
              color: filter === tab ? '#1a237e' : '#64748b',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowLeftRight size={15} style={{ color: '#94a3b8' }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0f172a' }}>
            {filter} Requests ({filteredRequests.length})
          </h3>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading...</div>
        ) : filteredRequests.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>No {filter !== 'All' ? filter.toLowerCase() : ''} subject change requests.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>No.</th>
                  <th>Campus</th>
                  <th>Form</th>
                  <th>Subject</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                  <th>Reason</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((r) => {
                  const badge = statusBadge(r.status);
                  return (
                    <tr key={r.id}>
                      <td style={{ fontSize: 13 }}>{r.studentName}</td>
                      <td style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>{r.studentNumber}</td>
                      <td style={{ fontSize: 12 }}>{r.campus}</td>
                      <td style={{ fontSize: 12 }}>{r.form}</td>
                      <td style={{ fontSize: 13 }}>{r.subjectName}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, background: r.action === 'Add' ? '#dcfce7' : '#fee2e2', color: r.action === 'Add' ? '#166534' : '#991b1b' }}>
                          {r.action}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#475569', maxWidth: 200 }}>
                        {r.reason || '—'}
                        {r.status === 'Rejected' && r.rejectionReason && (
                          <p style={{ margin: '4px 0 0', color: '#dc2626', fontWeight: 600 }}>Rejected: {r.rejectionReason}</p>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {r.date ? new Date(r.date).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: badge.bg, color: badge.color }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {r.status === 'Pending' ? (
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                            <button
                              disabled={actingId === r.id}
                              onClick={() => handleApprove(r.id)}
                              title="Approve"
                              style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', background: 'white', color: '#15803d', border: '1.5px solid #15803d', opacity: actingId === r.id ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              disabled={actingId === r.id}
                              onClick={() => openReject(r)}
                              title="Reject"
                              style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', background: 'white', color: '#dc2626', border: '1.5px solid #dc2626', opacity: actingId === r.id ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <X size={12} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>
                            {r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString('en-GB') : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejectTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: 420, maxWidth: '95vw', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Reject Request</h2>
              <button onClick={() => setRejectTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 12px' }}>
              Rejecting <strong>{rejectTarget.action}</strong> request for <strong>{rejectTarget.subjectName}</strong> ({rejectTarget.studentName})
            </p>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>Rejection reason</label>
            <textarea
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, minHeight: 70, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Explain why this request is being rejected (optional)"
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                onClick={() => setRejectTarget(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={actingId === rejectTarget.id}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: actingId === rejectTarget.id ? 0.6 : 1 }}
              >
                {actingId === rejectTarget.id ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
