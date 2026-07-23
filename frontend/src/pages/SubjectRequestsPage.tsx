import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import AdminLayout from '../components/AdminLayout';
import { ArrowLeftRight, Check, X } from 'lucide-react';

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
}

export default function SubjectRequestsPage() {
  const [requests, setRequests] = useState<SubjectChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
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

  const handleApprove = async (id: number) => {
    setActingId(id);
    try {
      await adminAPI.approveSubjectRequest(id);
      showMsg('Request approved', 'success');
      await loadRequests();
    } catch {
      showMsg('Failed to approve request', 'error');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id: number) => {
    const reason = window.prompt('Reason for rejection (optional):');
    if (reason === null) return;
    setActingId(id);
    try {
      await adminAPI.rejectSubjectRequest(id, reason || undefined);
      showMsg('Request rejected', 'success');
      await loadRequests();
    } catch {
      showMsg('Failed to reject request', 'error');
    } finally {
      setActingId(null);
    }
  };

  return (
    <AdminLayout title="Subject Change Requests" subtitle="Review and action student subject add/drop requests">
      {message && (
        <div style={{ position: 'fixed', top: 80, right: 20, padding: '14px 18px', borderRadius: 10, background: message.type === 'success' ? '#0ea5e9' : '#dc2626', color: 'white', fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {message.text}
        </div>
      )}

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowLeftRight size={15} style={{ color: '#94a3b8' }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Pending Requests ({requests.length})
          </h3>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading...</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>No pending subject change requests.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Campus</th>
                  <th>Form</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                  <th>Subject</th>
                  <th>Reason</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'center' }}>Approve</th>
                  <th style={{ textAlign: 'center' }}>Reject</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontSize: 13 }}>
                      <strong>{r.studentName}</strong>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>{r.studentNumber}</p>
                    </td>
                    <td style={{ fontSize: 12 }}>{r.campus}</td>
                    <td style={{ fontSize: 12 }}>{r.form}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, background: r.action === 'Add' ? '#dcfce7' : '#fee2e2', color: r.action === 'Add' ? '#166534' : '#991b1b' }}>
                        {r.action}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>{r.subjectName}</td>
                    <td style={{ fontSize: 12, color: '#475569', maxWidth: 220 }}>{r.reason || '—'}</td>
                    <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                      {r.date ? new Date(r.date).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        disabled={actingId === r.id}
                        onClick={() => handleApprove(r.id)}
                        title="Approve"
                        style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', background: 'white', color: '#15803d', border: '1.5px solid #15803d', opacity: actingId === r.id ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Check size={12} /> Approve
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        disabled={actingId === r.id}
                        onClick={() => handleReject(r.id)}
                        title="Reject"
                        style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', background: 'white', color: '#dc2626', border: '1.5px solid #dc2626', opacity: actingId === r.id ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <X size={12} /> Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
