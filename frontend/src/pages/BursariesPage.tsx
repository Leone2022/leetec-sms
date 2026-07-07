import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { feesAPI } from '../services/api';
import AdminLayout from '../components/AdminLayout';
import { GraduationCap, Plus } from 'lucide-react';

const FILTERS = ['All', 'Scholarship', 'Bursary', 'BEAM', 'Discount'] as const;
type FilterType = typeof FILTERS[number];

export default function BursariesPage() {
  const navigate = useNavigate();
  const [activeTerm, setActiveTerm] = useState<any>(null);
  const [bursaries, setBursaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('All');
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const termsRes = await feesAPI.getTerms(1);
      const active = (termsRes.data as any[]).find((t) => t.isActive) ?? null;
      setActiveTerm(active);
      if (active) {
        const res = await feesAPI.getBursariesByTerm(active.id);
        setBursaries(res.data || []);
      } else {
        setBursaries([]);
      }
    } catch {
      showMsg('Failed to load bursaries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (filter === 'All') return bursaries;
    return bursaries.filter((b: any) => b.type === filter);
  }, [bursaries, filter]);

  const totalAwarded = filtered.length;
  const totalCredited = filtered.reduce((s, b: any) => s + Number(b.amount || 0), 0);

  const handleRevoke = async (id: number) => {
    if (!window.confirm("Revoke this bursary? This will reverse the credit on the student's invoice.")) return;
    setRevokingId(id);
    try {
      await feesAPI.revokeBursary(id);
      showMsg('Bursary revoked', 'success');
      if (activeTerm) {
        const res = await feesAPI.getBursariesByTerm(activeTerm.id);
        setBursaries(res.data || []);
      }
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Failed to revoke bursary', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <AdminLayout title="Bursaries" subtitle="Scholarships, bursaries, and discounts awarded this term">
      {message && (
        <div style={{ position: 'fixed', top: 80, right: 20, padding: '14px 18px', borderRadius: 10, background: message.type === 'success' ? '#0ea5e9' : '#dc2626', color: 'white', fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Action bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => navigate('/fee-setup')}>
            <Plus size={14} /> Award New Bursary
          </button>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ background: '#eef2ff', borderRadius: 10, padding: '14px 20px', minWidth: 200 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#1a237e', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>
              Total Awarded
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#1a237e', margin: 0 }}>{totalAwarded}</p>
          </div>
          <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '14px 20px', minWidth: 200 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>
              Total Amount Credited
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#15803d', margin: 0 }}>${totalCredited.toLocaleString()}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'white', borderRadius: 10, padding: 5, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', width: 'fit-content' }}>
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: filter === f ? '#1a237e' : 'transparent', color: filter === f ? 'white' : '#475569', transition: 'all 0.15s',
            }}>
              {f}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <GraduationCap size={15} style={{ color: '#94a3b8' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0f172a' }}>
              {activeTerm?.name || 'Current Term'} — {filtered.length} bursar{filtered.length !== 1 ? 'ies' : 'y'}
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading...</div>
          ) : !activeTerm ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>No active term.</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>No bursaries found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Campus</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Date</th>
                    <th>Revoke</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b: any) => (
                    <tr key={b.id}>
                      <td style={{ fontSize: 12 }}>
                        <strong>{b.studentName}</strong>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>{b.studentNumber}</p>
                      </td>
                      <td><span className="pill" style={{ background: '#eef2ff', color: '#4338ca', fontSize: 10 }}>{(b.studentNumber || '').split('/')[0] || '—'}</span></td>
                      <td style={{ fontSize: 12 }}>{b.type}</td>
                      <td style={{ fontSize: 12 }}>{b.description}</td>
                      <td style={{ textAlign: 'right', fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                        ${Number(b.amount).toLocaleString()}{b.percentage ? ` (${b.percentage}%)` : ''}
                      </td>
                      <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {b.awardedAt ? new Date(b.awardedAt).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td>
                        <button
                          disabled={revokingId === b.id}
                          onClick={() => handleRevoke(b.id)}
                          style={{ padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 5, cursor: 'pointer', background: 'white', color: '#dc2626', border: '1.5px solid #dc2626', opacity: revokingId === b.id ? 0.5 : 1 }}
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
