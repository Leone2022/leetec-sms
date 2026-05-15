import { useState, useEffect } from 'react';
import { feesAPI } from '../services/api';
import { Calendar, Plus, X, Zap, AlertTriangle } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

const todayISO = () => new Date().toISOString().split('T')[0];

const blankTerm = () => ({
  name: '',
  termNumber: '1',
  year: new Date().getFullYear().toString(),
  startDate: todayISO(),
  endDate: '',
});

export default function TermsPage() {
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [termForm, setTermForm] = useState(blankTerm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activatingId, setActivatingId] = useState<number | null>(null);

  useEffect(() => { loadTerms(); }, []);

  const loadTerms = async () => {
    try {
      const res = await feesAPI.getTerms(1);
      setTerms(res.data || []);
    } catch (err) {
      console.error(err);
      showMessage('Failed to load terms', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termForm.name.trim()) { showMessage('Term name is required', 'error'); return; }
    if (!termForm.endDate) { showMessage('End date is required', 'error'); return; }
    setIsSubmitting(true);
    try {
      await feesAPI.createTerm({
        schoolId: 1,
        name: termForm.name,
        termNumber: Number(termForm.termNumber),
        year: Number(termForm.year),
        startDate: termForm.startDate,
        endDate: termForm.endDate,
      });
      showMessage('Term created successfully', 'success');
      setIsModalOpen(false);
      setTermForm(blankTerm());
      loadTerms();
    } catch (err: any) {
      console.error(err.response);
      showMessage(err.response?.data?.message || 'Failed to create term', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (id: number) => {
    const active = terms.find((t) => t.isActive);
    if (active && active.id !== id) {
      const ok = window.confirm(
        `Warning: "${active.name}" is currently active. Activating a new term will deactivate it. Continue?`
      );
      if (!ok) return;
    }
    setActivatingId(id);
    try {
      await feesAPI.activateTerm(id);
      showMessage('Term activated successfully', 'success');
      loadTerms();
    } catch (err: any) {
      console.error(err.response);
      showMessage(err.response?.data?.message || 'Failed to activate term', 'error');
    } finally {
      setActivatingId(null);
    }
  };

  const fieldStyle = { paddingLeft: '14px', paddingRight: '14px' };
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: '600', color: '#0f172a', display: 'block', marginBottom: '6px' };

  const activeTerm = terms.find((t) => t.isActive);

  return (
    <AdminLayout title="Terms & Periods" subtitle="Manage academic terms">
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

      {/* Active term banner */}
      {activeTerm && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px',
          padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <Zap size={16} style={{ color: '#15803d', flexShrink: 0 }} />
          <div style={{ fontSize: '13px' }}>
            <strong style={{ color: '#15803d' }}>Active Term:</strong>
            <span style={{ color: '#166534', marginLeft: 6 }}>
              {activeTerm.name} ({new Date(activeTerm.startDate).toLocaleDateString()} — {new Date(activeTerm.endDate).toLocaleDateString()})
            </span>
          </div>
        </div>
      )}

      <div className="table-card">
        <div className="table-head">
          <div>
            <h3>Academic Terms</h3>
            <p>{terms.length} term{terms.length !== 1 ? 's' : ''} registered</p>
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={14} /> New Term
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>Loading terms...</div>
        ) : terms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#475569' }}>
            <Calendar size={32} style={{ margin: '0 auto 12px', color: '#94a3b8' }} />
            <p>No terms created yet. Create your first term to get started.</p>
          </div>
        ) : (
          <>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Term Name</th><th>Term No.</th><th>Year</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {terms.map((term: any) => (
                    <tr key={term.id}>
                      <td><strong style={{ fontSize: 13 }}>{term.name}</strong></td>
                      <td>Term {term.termNumber}</td>
                      <td>{term.year}</td>
                      <td>{new Date(term.startDate).toLocaleDateString()}</td>
                      <td>{new Date(term.endDate).toLocaleDateString()}</td>
                      <td>
                        {term.isActive ? (
                          <span className="pill pill-success">Active</span>
                        ) : (
                          <span className="pill" style={{ background: '#f1f5f9', color: '#475569' }}>Inactive</span>
                        )}
                      </td>
                      <td>
                        {!term.isActive && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: 12, opacity: activatingId === term.id ? 0.7 : 1 }}
                            onClick={() => handleActivate(term.id)}
                            disabled={activatingId === term.id}
                          >
                            <Zap size={12} />
                            {activatingId === term.id ? 'Activating...' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              {terms.length} term{terms.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>

      {/* Warning note */}
      <div style={{
        marginTop: 16, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a',
        borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '12px', color: '#92400e',
      }}>
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        Only one term can be active at a time. Activating a term will automatically deactivate any currently active term.
        Fee packages and invoices are linked to specific terms.
      </div>

      {/* Create Term Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setIsModalOpen(false)}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Create New Term</h2>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Define the academic period</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTerm} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Term Name *</label>
                <input type="text" value={termForm.name} onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
                  placeholder="e.g. Term 1 2026" required className="text-field" style={fieldStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Term Number</label>
                  <select value={termForm.termNumber} onChange={(e) => setTermForm({ ...termForm, termNumber: e.target.value })}
                    className="text-field" style={{ ...fieldStyle, appearance: 'auto', cursor: 'pointer' }}>
                    <option value="1">Term 1</option>
                    <option value="2">Term 2</option>
                    <option value="3">Term 3</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Year</label>
                  <input type="number" value={termForm.year} onChange={(e) => setTermForm({ ...termForm, year: e.target.value })}
                    min="2020" max="2099" className="text-field" style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input type="date" value={termForm.startDate} onChange={(e) => setTermForm({ ...termForm, startDate: e.target.value })}
                    className="text-field" style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>End Date *</label>
                  <input type="date" value={termForm.endDate} onChange={(e) => setTermForm({ ...termForm, endDate: e.target.value })}
                    required className="text-field" style={fieldStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Creating...' : 'Create Term'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
