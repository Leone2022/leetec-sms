import { useState, useEffect } from 'react';
import { feesAPI, termRegistrationsAPI } from '../services/api';
import { Calendar, Plus, X, Zap, AlertTriangle, Users, Trash2, TrendingUp, Search, FileDown, FileSpreadsheet, FileText } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { exportTableToPdf, exportTableToExcel, exportTableToWord } from '../utils/exportTable';

const todayISO = () => new Date().toISOString().split('T')[0];

const blankTerm = () => ({
  name: '',
  termNumber: '1',
  year: new Date().getFullYear().toString(),
  startDate: todayISO(),
  endDate: '',
});

export default function TermsPage() {
  // ── Terms ──────────────────────────────────────────────────────────────────
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [termForm, setTermForm] = useState(blankTerm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activatingId, setActivatingId] = useState<number | null>(null);

  // ── Dashboard ──────────────────────────────────────────────────────────────
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [updatingPaymentId, setUpdatingPaymentId] = useState<number | null>(null);

  // ── Register modal ─────────────────────────────────────────────────────────
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [unregistered, setUnregistered] = useState<any[]>([]);
  const [unregLoading, setUnregLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isRegistering, setIsRegistering] = useState(false);

  // ── Promote modal ──────────────────────────────────────────────────────────
  const [isPromoteOpen, setIsPromoteOpen] = useState(false);
  const [promoteTargetId, setPromoteTargetId] = useState<number | ''>('');
  const [isPromoting, setIsPromoting] = useState(false);

  useEffect(() => { loadTerms(); }, []);

  useEffect(() => {
    if (selectedTermId) {
      loadDashboard(selectedTermId);
      setTableSearch('');
    } else {
      setDashboard(null);
    }
  }, [selectedTermId]);

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

  const loadDashboard = async (termId: number) => {
    setDashboardLoading(true);
    setDashboard(null);
    try {
      const res = await termRegistrationsAPI.getDashboard(termId);
      setDashboard(res.data);
    } catch (err) {
      console.error(err);
      showMessage('Failed to load term dashboard', 'error');
    } finally {
      setDashboardLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // ── Term CRUD ──────────────────────────────────────────────────────────────
  const handleCreateTerm = async (e: React.FormEvent<HTMLFormElement>) => {
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
      showMessage(err.response?.data?.message || 'Failed to create term', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (id: number) => {
    const active = terms.find((t) => t.isActive);
    if (active && active.id !== id) {
      const ok = window.confirm(
        `"${active.name}" is currently active. Activating a new term will deactivate it. Continue?`
      );
      if (!ok) return;
    }
    setActivatingId(id);
    try {
      await feesAPI.activateTerm(id);
      showMessage('Term activated successfully', 'success');
      loadTerms();
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to activate term', 'error');
    } finally {
      setActivatingId(null);
    }
  };

  // ── Payment status ─────────────────────────────────────────────────────────
  const handlePaymentStatus = async (regId: number, status: string) => {
    setUpdatingPaymentId(regId);
    try {
      await termRegistrationsAPI.updatePaymentStatus(regId, status);
      showMessage(status === 'Paid' ? 'Marked as paid' : 'Marked as unpaid', 'success');
      loadDashboard(selectedTermId!);
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to update payment', 'error');
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  // ── Register students ──────────────────────────────────────────────────────
  const openRegisterModal = async () => {
    if (!selectedTermId) return;
    setIsRegisterOpen(true);
    setSelectedIds(new Set());
    setUnregLoading(true);
    try {
      const res = await termRegistrationsAPI.getUnregistered(selectedTermId);
      setUnregistered(res.data || []);
    } catch (err) {
      showMessage('Failed to load unregistered students', 'error');
    } finally {
      setUnregLoading(false);
    }
  };

  const toggleStudent = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(
      selectedIds.size === unregistered.length
        ? new Set()
        : new Set(unregistered.map((s) => s.id))
    );
  };

  const handleRegister = async (ids?: number[]) => {
    const idsToRegister = ids ?? Array.from(selectedIds);
    if (idsToRegister.length === 0) { showMessage('Select at least one student', 'error'); return; }
    setIsRegistering(true);
    try {
      const res = await termRegistrationsAPI.register({
        termId: selectedTermId,
        schoolId: 1,
        studentIds: idsToRegister,
      });
      showMessage(res.data.message, 'success');
      setIsRegisterOpen(false);
      loadDashboard(selectedTermId!);
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to register students', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRegisterAll = () => handleRegister(unregistered.map((s) => s.id));

  // ── Promote ────────────────────────────────────────────────────────────────
  const handlePromoteBulk = async () => {
    if (!promoteTargetId) { showMessage('Select a target term', 'error'); return; }
    setIsPromoting(true);
    try {
      const res = await termRegistrationsAPI.promoteBulk({
        fromTermId: selectedTermId,
        toTermId: promoteTargetId,
        schoolId: 1,
      });
      showMessage(res.data.message, 'success');
      setIsPromoteOpen(false);
      setPromoteTargetId('');
      loadDashboard(selectedTermId!);
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to promote students', 'error');
    } finally {
      setIsPromoting(false);
    }
  };

  // ── Remove registration ────────────────────────────────────────────────────
  const handleRemove = async (regId: number, studentName: string) => {
    if (!window.confirm(`Remove ${studentName} from this term?`)) return;
    try {
      await termRegistrationsAPI.remove(regId);
      showMessage('Student removed from term', 'success');
      loadDashboard(selectedTermId!);
    } catch (err: any) {
      showMessage(err.response?.data?.message || 'Failed to remove', 'error');
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeTerm = terms.find((t) => t.isActive);
  const selectedTerm = terms.find((t) => t.id === selectedTermId);
  const otherTerms = terms.filter((t) => t.id !== selectedTermId);
  const stats = dashboard?.stats;
  const registrations: any[] = dashboard?.registrations || [];

  const filteredRegistrations = registrations.filter((r: any) =>
    `${r.studentName} ${r.studentNumber}`.toLowerCase().includes(tableSearch.toLowerCase())
  );

  const exportRows = filteredRegistrations.map((r: any) => ({
    name: r.studentName ?? '',
    number: r.studentNumber ?? '',
    form: r.form ?? '',
    campus: r.campus ?? '',
    payment: r.hasPaidFees ? 'Paid' : 'Pending',
    status: r.status ?? '',
  }));
  const exportColumns = [
    { header: 'Student Name', value: (r: typeof exportRows[number]) => r.name },
    { header: 'Student No.', value: (r: typeof exportRows[number]) => r.number },
    { header: 'Form', value: (r: typeof exportRows[number]) => r.form },
    { header: 'Campus', value: (r: typeof exportRows[number]) => r.campus },
    { header: 'Payment Status', value: (r: typeof exportRows[number]) => r.payment },
    { header: 'Status', value: (r: typeof exportRows[number]) => r.status },
  ];

  // Analytics
  const campusCounts = {
    AHJ: registrations.filter((r) => r.campus === 'AHJ').length,
    AHA: registrations.filter((r) => r.campus === 'AHA').length,
    AHS: registrations.filter((r) => r.campus === 'AHS').length,
  };
  const maxCampus = Math.max(...Object.values(campusCounts), 1);

  // Donut chart math
  const donutTotal = (stats?.totalRegistered || 0) > 0 ? stats.totalRegistered : 1;
  const RADIUS = 38;
  const CIRC = 2 * Math.PI * RADIUS;
  const paidLen = ((stats?.fullyPaid ?? 0) / donutTotal) * CIRC;
  const pendLen = CIRC - paidLen;
  const paidPct = stats?.totalRegistered > 0 ? Math.round((stats.fullyPaid / stats.totalRegistered) * 100) : 0;

  const fieldStyle = { paddingLeft: '14px', paddingRight: '14px' };
  const labelStyle: React.CSSProperties = {
    fontSize: '12px', fontWeight: '600', color: '#0f172a', display: 'block', marginBottom: '6px',
  };

  return (
    <AdminLayout title="Terms & Registration" subtitle="Manage academic terms and student registration">

      {/* ── Toast ── */}
      {message && (
        <div style={{
          position: 'fixed', top: 80, right: 20, padding: '14px 18px', borderRadius: '10px',
          background: message.type === 'success' ? '#0ea5e9' : '#dc2626',
          color: 'white', fontSize: '13px', fontWeight: '500', zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {message.text}
        </div>
      )}

      {/* ── Active term banner ── */}
      {activeTerm && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px',
          padding: '12px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Zap size={15} style={{ color: '#15803d', flexShrink: 0 }} />
          <span style={{ fontSize: '13px' }}>
            <strong style={{ color: '#15803d' }}>Active Term: </strong>
            <span style={{ color: '#166534' }}>
              {activeTerm.name} ({new Date(activeTerm.startDate).toLocaleDateString()} — {new Date(activeTerm.endDate).toLocaleDateString()})
            </span>
          </span>
        </div>
      )}

      {/* ── Terms grid header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#0f172a' }}>Academic Terms</h2>
          <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
            {terms.length} term{terms.length !== 1 ? 's' : ''} · Click a term to view its registration dashboard
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)} style={{ fontSize: 13 }}>
          <Plus size={14} /> New Term
        </button>
      </div>

      {/* ── Terms grid ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#475569', fontSize: 13 }}>Loading terms...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12, marginBottom: 24 }}>
          {terms.map((term) => (
            <div
              key={term.id}
              style={{
                background: 'white', borderRadius: '10px', padding: '16px 18px',
                border: selectedTermId === term.id
                  ? '2px solid #1a237e'
                  : term.isActive ? '2px solid #16a34a' : '1px solid #e2e8f0',
                boxShadow: selectedTermId === term.id
                  ? '0 0 0 3px rgba(26,35,126,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'border 0.15s, box-shadow 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 2px', color: '#0f172a' }}>{term.name}</h3>
                  <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{term.year} · Term {term.termNumber}</p>
                </div>
                {term.isActive && <span className="pill pill-success" style={{ fontSize: 10 }}>Active</span>}
              </div>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 12px' }}>
                <Calendar size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                {new Date(term.startDate).toLocaleDateString()} — {new Date(term.endDate).toLocaleDateString()}
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setSelectedTermId(selectedTermId === term.id ? null : term.id)}
                  className="btn btn-primary"
                  style={{ flex: 1, fontSize: 11, padding: '6px 10px', background: selectedTermId === term.id ? '#0f172a' : '#1a237e' }}
                >
                  {selectedTermId === term.id ? 'Hide Dashboard' : 'View Dashboard'}
                </button>
                {!term.isActive && (
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 11, padding: '6px 10px' }}
                    onClick={() => handleActivate(term.id)}
                    disabled={activatingId === term.id}
                  >
                    <Zap size={11} />
                    {activatingId === term.id ? '...' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* New term card */}
          <div
            onClick={() => setIsModalOpen(true)}
            style={{
              background: '#f8fafc', borderRadius: '10px', border: '2px dashed #e2e8f0',
              padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', minHeight: 130, gap: 8,
            }}
          >
            <Plus size={22} style={{ color: '#94a3b8' }} />
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Create New Term</span>
          </div>
        </div>
      )}

      {/* ── Dashboard ── */}
      {selectedTermId && (
        <div style={{ marginTop: 8 }}>

          {/* Dashboard toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Term Dashboard — {selectedTerm?.name}
              </h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                {selectedTerm?.year} · Registered students for this term
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {stats && stats.fullyPaid > 0 && (
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 12, opacity: isPromoting ? 0.7 : 1 }}
                  onClick={() => { setPromoteTargetId(''); setIsPromoteOpen(true); }}
                  disabled={isPromoting}
                >
                  <TrendingUp size={13} />
                  Promote All Paid ({stats.fullyPaid})
                </button>
              )}
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={openRegisterModal}>
                <Users size={13} /> Register Students
              </button>
            </div>
          </div>

          {dashboardLoading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#475569', fontSize: 13 }}>
              <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#1a237e', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              Loading dashboard...
            </div>
          ) : dashboard ? (
            <>
              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Total Registered', value: stats.totalRegistered, color: '#1a237e', bg: '#eef2ff' },
                  { label: 'Fully Paid', value: stats.fullyPaid, color: '#15803d', bg: '#f0fdf4' },
                  { label: 'Pending Payment', value: stats.pendingPayment, color: '#dc2626', bg: '#fff1f2' },
                  { label: 'Active', value: stats.active, color: '#0369a1', bg: '#f0f9ff' },
                ].map((s) => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: '10px', padding: '14px 16px' }}>
                    <p style={{ fontSize: '10px', color: s.color, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 5px' }}>
                      {s.label}
                    </p>
                    <p style={{ fontSize: '28px', fontWeight: '700', color: s.color, margin: 0, fontFamily: 'ui-monospace, monospace' }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Table card */}
              <div className="table-card">
                {/* Table toolbar: search + exports */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* Search */}
                  <div className="field-wrap" style={{ flex: 1, maxWidth: 320 }}>
                    <span className="field-icon field-icon-left"><Search size={14} /></span>
                    <input
                      type="text"
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      placeholder="Search name or student number"
                      className="text-field with-right"
                    />
                    {tableSearch && (
                      <button className="field-icon field-icon-right" onClick={() => setTableSearch('')}>
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>
                    {filteredRegistrations.length} of {registrations.length}
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-secondary export-btn"
                      style={{ fontSize: 12 }}
                      onClick={() => exportTableToPdf({ title: `${selectedTerm?.name} Registration`, filename: 'term-registration.pdf', columns: exportColumns, rows: exportRows })}
                      disabled={!filteredRegistrations.length}
                    >
                      <FileDown size={13} /> PDF
                    </button>
                    <button
                      className="btn btn-secondary export-btn"
                      style={{ fontSize: 12 }}
                      onClick={() => exportTableToExcel({ sheetName: 'Registration', filename: 'term-registration.xlsx', columns: exportColumns, rows: exportRows })}
                      disabled={!filteredRegistrations.length}
                    >
                      <FileSpreadsheet size={13} /> Excel
                    </button>
                    <button
                      className="btn btn-secondary export-btn"
                      style={{ fontSize: 12 }}
                      onClick={() => exportTableToWord({ title: `${selectedTerm?.name} Registration`, filename: 'term-registration.docx', columns: exportColumns, rows: exportRows })}
                      disabled={!filteredRegistrations.length}
                    >
                      <FileText size={13} /> Word
                    </button>
                  </div>
                </div>

                {registrations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px', color: '#475569' }}>
                    <Users size={30} style={{ margin: '0 auto 12px', color: '#94a3b8', display: 'block' }} />
                    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600 }}>No students registered</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Click "Register Students" to add enrolled students to this term.</p>
                  </div>
                ) : filteredRegistrations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontSize: 13 }}>
                    No students match "{tableSearch}"
                  </div>
                ) : (
                  <>
                    <div className="data-table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Student No.</th>
                            <th>Form</th>
                            <th>Campus</th>
                            <th>Payment</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRegistrations.map((r: any) => (
                            <tr key={r.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div className="mini-avatar" style={{ width: 30, height: 30, fontSize: 11, flexShrink: 0 }}>
                                    {r.studentName?.split(' ').slice(0, 2).map((n: string) => n[0]).join('')}
                                  </div>
                                  <strong style={{ fontSize: 13 }}>{r.studentName}</strong>
                                </div>
                              </td>
                              <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{r.studentNumber}</td>
                              <td>
                                <span className="pill" style={{ background: '#eef2ff', color: '#4338ca' }}>{r.form}</span>
                              </td>
                              <td style={{ fontSize: 12, color: '#64748b' }}>{r.campus || '—'}</td>
                              <td>
                                <span className={`pill ${r.hasPaidFees ? 'pill-success' : 'pill-danger'}`}>
                                  {r.hasPaidFees ? 'Paid' : 'Pending'}
                                </span>
                              </td>
                              <td>
                                <span className="pill" style={{
                                  background: r.status === 'Active' ? '#f0fdf4' : '#f1f5f9',
                                  color: r.status === 'Active' ? '#15803d' : '#475569',
                                }}>
                                  {r.status}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                                  {/* Payment toggle */}
                                  {r.hasPaidFees ? (
                                    <button
                                      onClick={() => handlePaymentStatus(r.id, 'Unpaid')}
                                      disabled={updatingPaymentId === r.id}
                                      className="btn"
                                      style={{ padding: '4px 8px', fontSize: 11, background: '#fff1f2', color: '#dc2626', border: '1px solid #fecaca', opacity: updatingPaymentId === r.id ? 0.6 : 1 }}
                                    >
                                      ❌ Unpaid
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handlePaymentStatus(r.id, 'Paid')}
                                      disabled={updatingPaymentId === r.id}
                                      className="btn"
                                      style={{ padding: '4px 8px', fontSize: 11, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', opacity: updatingPaymentId === r.id ? 0.6 : 1 }}
                                    >
                                      ✅ Paid
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleRemove(r.id, r.studentName)}
                                    className="btn"
                                    style={{ padding: '4px 8px', fontSize: 11, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="table-footer">
                      {filteredRegistrations.length}{tableSearch ? ` of ${registrations.length}` : ''} student{filteredRegistrations.length !== 1 ? 's' : ''} registered for {selectedTerm?.name}
                    </div>
                  </>
                )}
              </div>

              {/* ── Analytics ── */}
              {registrations.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>

                  {/* Chart 1: Payment overview donut */}
                  <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px 24px' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px' }}>
                      Payment Overview
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                      <svg width="100" height="100" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
                        {/* Background ring */}
                        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth="16" />
                        {/* Pending arc (red) */}
                        {pendLen > 0 && (
                          <circle
                            cx="50" cy="50" r={RADIUS} fill="none"
                            stroke="#fca5a5" strokeWidth="16"
                            strokeDasharray={`${pendLen} ${paidLen}`}
                            strokeDashoffset={-paidLen}
                            transform="rotate(-90 50 50)"
                          />
                        )}
                        {/* Paid arc (green) */}
                        {paidLen > 0 && (
                          <circle
                            cx="50" cy="50" r={RADIUS} fill="none"
                            stroke="#86efac" strokeWidth="16"
                            strokeDasharray={`${paidLen} ${pendLen}`}
                            transform="rotate(-90 50 50)"
                          />
                        )}
                        <text x="50" y="46" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0f172a">{paidPct}%</text>
                        <text x="50" y="60" textAnchor="middle" fontSize="8" fill="#64748b">Paid</text>
                      </svg>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#86efac', flexShrink: 0 }} />
                          <div>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>Fully Paid</p>
                            <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{stats.fullyPaid} students</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#fca5a5', flexShrink: 0 }} />
                          <div>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>Pending</p>
                            <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{stats.pendingPayment} students</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chart 2: Campus breakdown bar */}
                  <div style={{ background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px 24px' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px' }}>
                      Campus Breakdown
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { code: 'AHJ', label: 'Advent Hope Junior', color: '#818cf8' },
                        { code: 'AHA', label: 'Advent Hope Academy', color: '#38bdf8' },
                        { code: 'AHS', label: 'Advent Hope Senior', color: '#34d399' },
                      ].map(({ code, label, color }) => {
                        const count = campusCounts[code as keyof typeof campusCounts];
                        const pct = maxCampus > 0 ? (count / maxCampus) * 100 : 0;
                        return (
                          <div key={code}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{code}</span>
                              <span style={{ fontSize: 11, color: '#64748b' }}>{count} · {label}</span>
                            </div>
                            <div style={{ height: 10, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${pct}%`, background: color,
                                borderRadius: 6, transition: 'width 0.5s ease',
                                minWidth: count > 0 ? 6 : 0,
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '14px 0 0', textAlign: 'right' }}>
                      Total: {stats.totalRegistered} students
                    </p>
                  </div>

                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ── Warning note ── */}
      <div style={{
        marginTop: 20, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a',
        borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '12px', color: '#92400e',
      }}>
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        Only one term can be active at a time. Activating a term will automatically deactivate any currently active term.
        Fee packages and invoices are linked to specific terms.
      </div>

      {/* ── Create Term Modal ── */}
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

      {/* ── Register Students Modal ── */}
      {isRegisterOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setIsRegisterOpen(false)}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '560px', maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}>

            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Register Students</h2>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                  {selectedTerm?.name} · Select students to add to this term
                </p>
              </div>
              <button onClick={() => setIsRegisterOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
              {unregLoading ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#475569', fontSize: 13 }}>Loading students...</div>
              ) : unregistered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontSize: 13 }}>
                  All active students are already registered for this term.
                </div>
              ) : (
                <>
                  <div
                    onClick={toggleAll}
                    style={{
                      padding: '10px 12px', borderRadius: '8px', background: '#f8fafc',
                      border: '1px solid #e2e8f0', marginBottom: 10, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: 3, border: '2px solid',
                      borderColor: selectedIds.size === unregistered.length ? '#1a237e' : '#cbd5e1',
                      background: selectedIds.size === unregistered.length ? '#1a237e' : 'white',
                      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selectedIds.size === unregistered.length && (
                        <span style={{ color: 'white', fontSize: 9, fontWeight: 800, lineHeight: 1 }}>✓</span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                      Select All ({unregistered.length})
                    </span>
                    {selectedIds.size > 0 && (
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#1a237e', fontWeight: 600 }}>
                        {selectedIds.size} selected
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {unregistered.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => toggleStudent(s.id)}
                        style={{
                          padding: '9px 12px', borderRadius: '8px', cursor: 'pointer',
                          border: `1px solid ${selectedIds.has(s.id) ? '#1a237e' : '#e2e8f0'}`,
                          background: selectedIds.has(s.id) ? '#eef2ff' : 'white',
                          display: 'flex', alignItems: 'center', gap: 10,
                          transition: 'all 0.1s',
                        }}
                      >
                        <div style={{
                          width: 15, height: 15, borderRadius: 3, border: '2px solid',
                          borderColor: selectedIds.has(s.id) ? '#1a237e' : '#cbd5e1',
                          background: selectedIds.has(s.id) ? '#1a237e' : 'white',
                          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {selectedIds.has(s.id) && (
                            <span style={{ color: 'white', fontSize: 9, fontWeight: 800, lineHeight: 1 }}>✓</span>
                          )}
                        </div>
                        <div className="mini-avatar" style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>
                          {s.firstName?.[0]}{s.surname?.[0]}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ fontSize: 12, display: 'block', color: '#0f172a' }}>
                            {s.firstName} {s.surname}
                          </strong>
                          <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
                            {s.studentNumber}
                          </span>
                        </div>
                        <span className="pill" style={{ background: '#eef2ff', color: '#4338ca', fontSize: 10 }}>
                          {s.form}
                        </span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{s.gender}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {!unregLoading && unregistered.length > 0 && (
              <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => setIsRegisterOpen(false)} disabled={isRegistering}>
                  Cancel
                </button>
                {/* Change 5: Select All & Register */}
                <button
                  className="btn btn-secondary"
                  onClick={handleRegisterAll}
                  disabled={isRegistering}
                  style={{ opacity: isRegistering ? 0.6 : 1 }}
                >
                  {isRegistering ? 'Registering...' : `Select All & Register (${unregistered.length})`}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleRegister()}
                  disabled={isRegistering || selectedIds.size === 0}
                  style={{ opacity: isRegistering || selectedIds.size === 0 ? 0.6 : 1 }}
                >
                  {isRegistering ? 'Registering...' : `Register ${selectedIds.size > 0 ? selectedIds.size + ' ' : ''}Selected`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Promote Modal ── */}
      {isPromoteOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setIsPromoteOpen(false)}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Promote All Paid Students</h2>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                  {stats?.fullyPaid} paid student{stats?.fullyPaid !== 1 ? 's' : ''} from {selectedTerm?.name}
                </p>
              </div>
              <button onClick={() => setIsPromoteOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#92400e' }}>
                <strong>Note:</strong> Only students with <em>Paid</em> status will be promoted. Each promoted student will be registered in the target term with Pending payment status.
              </div>
              <div>
                <label style={labelStyle}>Promote to Term *</label>
                {otherTerms.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>No other terms exist. Create a target term first.</p>
                ) : (
                  <select
                    value={promoteTargetId}
                    onChange={(e) => setPromoteTargetId(Number(e.target.value) || '')}
                    className="text-field"
                    style={{ paddingLeft: 14, paddingRight: 14, appearance: 'auto', cursor: 'pointer' }}
                  >
                    <option value="">— Select target term —</option>
                    {otherTerms.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.year})</option>
                    ))}
                  </select>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                <button className="btn btn-secondary" onClick={() => setIsPromoteOpen(false)} disabled={isPromoting}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handlePromoteBulk}
                  disabled={isPromoting || !promoteTargetId || otherTerms.length === 0}
                  style={{ opacity: isPromoting || !promoteTargetId ? 0.6 : 1 }}
                >
                  {isPromoting ? 'Promoting...' : `Promote ${stats?.fullyPaid} Student${stats?.fullyPaid !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </AdminLayout>
  );
}
