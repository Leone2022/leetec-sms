import { useState, useEffect } from 'react';
import { feesAPI, bulkReportsAPI, reportsAPI, adminAPI, marksAPI } from '../services/api';
import { generateReportCard } from '../utils/reportCard';
import { exportCredentialsToPdf, exportCredentialsToExcel, type CredentialRow } from '../utils/credentials';
import AdminLayout from '../components/AdminLayout';
import { FileDown, Send, CheckSquare, Square } from 'lucide-react';

const calculateGrade = (total: number) => {
  if (total >= 90) return 'A*';
  if (total >= 80) return 'A';
  if (total >= 70) return 'B';
  if (total >= 60) return 'C';
  if (total >= 50) return 'D';
  if (total >= 40) return 'E';
  return 'U';
};

const PUBLISH_FORM_OPTIONS = [
  'All',
  'Nursery', 'ECD A', 'ECD B', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7',
  'Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6',
  'Lower 6', 'Upper 6',
];

interface CompletionRow {
  studentId: number;
  studentName: string;
  studentNumber: string;
  form: string;
  campus: string;
  curriculum: string;
  totalSubjects: number;
  enteredSubjects: number;
  fullyEntered: boolean;
  status: 'Ready' | 'Partial' | 'Not Started';
}

export default function BulkReportsPage() {
  const [terms, setTerms] = useState<any[]>([]);
  const [termId, setTermId] = useState<number | ''>('');
  const [campusFilter, setCampusFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [rows, setRows] = useState<CompletionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [exportingCreds, setExportingCreds] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Publish Report Cards section
  const [publishTermId, setPublishTermId] = useState<number | ''>('');
  const [publishCampus, setPublishCampus] = useState('All');
  const [publishForm, setPublishForm] = useState('All');
  const [publishingReportCards, setPublishingReportCards] = useState(false);

  // Tabs
  const [tab, setTab] = useState<'completion' | 'approvals'>('completion');

  // Approve Marks tab
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [actioningKey, setActioningKey] = useState<string | null>(null);

  // View Marks modal
  const [viewingGroup, setViewingGroup] = useState<any>(null);
  const [viewMarksRows, setViewMarksRows] = useState<any[]>([]);
  const [viewMarksLoading, setViewMarksLoading] = useState(false);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const loadPendingApprovals = async () => {
    setLoadingApprovals(true);
    try {
      const res = await marksAPI.getPendingApproval(1);
      setPendingApprovals(res.data || []);
    } catch {
      showMsg('Failed to load pending approvals', 'error');
    } finally {
      setLoadingApprovals(false);
    }
  };

  useEffect(() => {
    if (tab === 'approvals') loadPendingApprovals();
  }, [tab]);

  const approvalKey = (g: any) => `${g.subjectId}-${g.termId}-${g.campus}-${g.form}`;

  const handleApproveAll = async (g: any) => {
    const key = approvalKey(g);
    setActioningKey(key);
    try {
      const res = await marksAPI.approveMarks({
        subjectId: g.subjectId, termId: g.termId, campus: g.campus, form: g.form, approvedBy: 'Admin',
      });
      showMsg(`Approved ${res.data?.approved ?? 0} marks for ${g.subjectName} — ${g.form}`, 'success');
      setViewingGroup(null);
      await loadPendingApprovals();
    } catch {
      showMsg('Failed to approve marks', 'error');
    } finally {
      setActioningKey(null);
    }
  };

  const handleSendBack = async (g: any) => {
    const comment = window.prompt(`Send ${g.subjectName} — ${g.form} marks back to Draft. Optional comment for the teacher:`);
    if (comment === null) return;
    const key = approvalKey(g);
    setActioningKey(key);
    try {
      const res = await marksAPI.sendBackMarks({
        subjectId: g.subjectId, termId: g.termId, campus: g.campus, form: g.form, comment: comment || undefined,
      });
      showMsg(`Sent ${res.data?.sentBack ?? 0} marks back to Draft`, 'success');
      setViewingGroup(null);
      await loadPendingApprovals();
    } catch {
      showMsg('Failed to send marks back', 'error');
    } finally {
      setActioningKey(null);
    }
  };

  const openViewMarks = async (g: any) => {
    setViewingGroup(g);
    setViewMarksLoading(true);
    try {
      const [midRes, endRes] = await Promise.all([
        marksAPI.getEntrySheet({ termId: g.termId, campus: g.campus, form: g.form, subjectId: g.subjectId, assessmentType: 'Mid-term Test' }),
        marksAPI.getEntrySheet({ termId: g.termId, campus: g.campus, form: g.form, subjectId: g.subjectId, assessmentType: 'End of Term Exam' }),
      ]);
      const midData: any[] = midRes.data || [];
      const endData: any[] = endRes.data || [];
      const endByStudent = new Map(endData.map((d: any) => [d.studentId, d]));
      setViewMarksRows(midData.map((d: any) => {
        const endD = endByStudent.get(d.studentId);
        const paper1 = d.score;
        const paper2 = endD?.score;
        const total = paper1 != null && paper2 != null
          ? Math.round((Number(paper1) + Number(paper2)) / 2)
          : paper1 != null ? Number(paper1) : paper2 != null ? Number(paper2) : null;
        return {
          studentId: d.studentId,
          studentName: d.studentName,
          studentNumber: d.studentNumber,
          paper1, paper2, total,
          grade: total != null ? calculateGrade(total) : '',
          comments: d.comments || endD?.comments || '',
        };
      }));
    } catch {
      showMsg('Failed to load marks', 'error');
    } finally {
      setViewMarksLoading(false);
    }
  };

  useEffect(() => {
    feesAPI.getTerms(1).then(res => {
      const data: any[] = res.data || [];
      setTerms(data);
      const active = data.find(t => t.isActive) ?? data[0];
      if (active) { setTermId(active.id); setPublishTermId(active.id); }
    }).catch(() => showMsg('Failed to load terms', 'error'));
  }, []);

  const handlePublishReportCards = async () => {
    if (!publishTermId) return;
    setPublishingReportCards(true);
    try {
      const res = await marksAPI.publishReportCards({
        termId: publishTermId,
        schoolId: 1,
        campus: publishCampus,
        form: publishForm,
      });
      const count = res.data?.published ?? 0;
      showMsg(`${count} report card${count !== 1 ? 's' : ''} published successfully`, 'success');
    } catch {
      showMsg('Failed to publish report cards', 'error');
    } finally {
      setPublishingReportCards(false);
    }
  };

  useEffect(() => {
    if (!termId) { setRows([]); return; }
    loadStatus();
    setSelected(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termId]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await bulkReportsAPI.getCompletionStatus(termId as number);
      setRows(res.data || []);
    } catch {
      showMsg('Failed to load completion status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = rows.filter(r => {
    if (campusFilter !== 'All' && r.campus !== campusFilter) return false;
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    return true;
  });

  const selectAllReady = () => {
    const readyIds = filtered.filter(r => r.status === 'Ready').map(r => r.studentId);
    setSelected(new Set(readyIds));
  };

  const toggleRow = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const allIds = filtered.map(r => r.studentId);
    const allSelected = allIds.every(id => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(allIds));
  };

  const handleGenerateSelected = async () => {
    if (!termId || selected.size === 0) return;
    const ids = [...selected];
    setGenerating(true);
    let done = 0;
    for (const studentId of ids) {
      const row = rows.find(r => r.studentId === studentId);
      setProgress(`Generating report card ${done + 1} of ${ids.length} — ${row?.studentName ?? '...'}`);
      try {
        const res = await reportsAPI.getReportCard(studentId, termId as number);
        await generateReportCard(res.data);
        done++;
      } catch {
        // skip failed student and continue
      }
      if (done < ids.length) await new Promise(r => setTimeout(r, 800));
    }
    setProgress(null);
    setGenerating(false);
    showMsg(`Done — ${done} report card${done !== 1 ? 's' : ''} generated`, 'success');
  };

  const getTermLabel = () => {
    const term = terms.find(t => t.id === termId);
    return term ? `${term.name} ${term.year}` : String(termId);
  };

  const handleExportCredentialsPdf = async () => {
    if (!termId) return;
    setExportingCreds(true);
    try {
      const res = await adminAPI.getStudentCredentials(termId as number);
      exportCredentialsToPdf(res.data as CredentialRow[], getTermLabel());
    } catch {
      showMsg('Failed to export credentials', 'error');
    } finally {
      setExportingCreds(false);
    }
  };

  const handleExportCredentialsExcel = async () => {
    if (!termId) return;
    setExportingCreds(true);
    try {
      const res = await adminAPI.getStudentCredentials(termId as number);
      exportCredentialsToExcel(res.data as CredentialRow[], getTermLabel());
    } catch {
      showMsg('Failed to export credentials', 'error');
    } finally {
      setExportingCreds(false);
    }
  };

  const handleSendToPortal = async () => {
    if (!termId || selected.size === 0) return;
    const ids = [...selected];
    setPublishing(true);
    setProgress(`Publishing ${ids.length} report${ids.length !== 1 ? 's' : ''} to portal...`);
    try {
      const res = await bulkReportsAPI.publishReports(1, termId as number, ids);
      const { published, errors } = res.data as { published: number; errors: string[] };
      if (errors.length > 0) {
        showMsg(`Published ${published}, but ${errors.length} error(s): ${errors[0]}`, 'error');
      } else {
        showMsg(`Done — ${published} report card${published !== 1 ? 's' : ''} published to portal`, 'success');
      }
    } catch {
      showMsg('Failed to publish reports', 'error');
    } finally {
      setProgress(null);
      setPublishing(false);
    }
  };

  const statusBadge = (status: CompletionRow['status']) => {
    if (status === 'Ready') return { bg: '#dcfce7', color: '#166534', label: 'Ready' };
    if (status === 'Partial') return { bg: '#fef9c3', color: '#854d0e', label: 'Partial' };
    return { bg: '#f1f5f9', color: '#64748b', label: 'Not Started' };
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(r => selected.has(r.studentId));
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };

  return (
    <AdminLayout title="Bulk Reports" subtitle="Generate and publish report cards for all students">
      {message && (
        <div style={{
          position: 'fixed', top: 80, right: 20, padding: '14px 18px', borderRadius: 10,
          background: message.type === 'success' ? '#0ea5e9' : '#dc2626',
          color: 'white', fontSize: 13, fontWeight: 500, zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxWidth: 400,
        }}>
          {message.text}
        </div>
      )}

      {(generating || publishing) && progress && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,23,42,0.5)', zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px 40px', textAlign: 'center', maxWidth: 400 }}>
            <div style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTopColor: '#1a237e', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontWeight: 600, color: '#0f172a', fontSize: 14, margin: 0 }}>{progress}</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, background: 'white', borderRadius: 10, padding: 5, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 16, width: 'fit-content' }}>
        {([
          { id: 'completion' as const, label: 'Report Cards' },
          { id: 'approvals' as const, label: '📋 Approve Marks' },
        ]).map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px',
            borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: tab === id ? '#1a237e' : 'transparent',
            color: tab === id ? 'white' : '#475569',
          }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'approvals' && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0f172a' }}>Pending Approvals</h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
              {pendingApprovals.length} submission{pendingApprovals.length !== 1 ? 's' : ''} awaiting review
            </p>
          </div>

          {loadingApprovals ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 13 }}>Loading...</div>
          ) : pendingApprovals.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>No marks are currently pending approval.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Form</th>
                    <th>Campus</th>
                    <th>Teacher</th>
                    <th style={{ textAlign: 'center' }}>No. of Students</th>
                    <th>Submitted Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovals.map((g: any) => {
                    const key = approvalKey(g);
                    const busy = actioningKey === key;
                    return (
                      <tr key={key}>
                        <td style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{g.subjectName}</td>
                        <td>{g.form}</td>
                        <td>{g.campus}</td>
                        <td>{g.teacher || '—'}</td>
                        <td style={{ textAlign: 'center' }}>{g.studentCount}</td>
                        <td style={{ fontSize: 12, color: '#64748b' }}>
                          {g.submittedDate ? new Date(g.submittedDate).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary" style={{ fontSize: 11, padding: '6px 10px' }}
                              onClick={() => openViewMarks(g)} disabled={busy}>
                              👁 View Marks
                            </button>
                            <button className="btn btn-primary" style={{ fontSize: 11, padding: '6px 10px' }}
                              onClick={() => handleApproveAll(g)} disabled={busy}>
                              ✅ Approve All
                            </button>
                            <button className="btn btn-secondary" style={{ fontSize: 11, padding: '6px 10px' }}
                              onClick={() => handleSendBack(g)} disabled={busy}>
                              ↩ Send Back
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
      )}

      {tab === 'completion' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Publish Report Cards */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 18px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: '#0f172a' }}>Publish Report Cards</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: 12, alignItems: 'end', maxWidth: 800 }}>
            <div>
              <label style={lbl}>Term</label>
              <select className="text-field" style={{ width: '100%', appearance: 'auto' }}
                value={publishTermId} onChange={e => setPublishTermId(Number(e.target.value))}>
                <option value="">Select term</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.year}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Campus</label>
              <select className="text-field" style={{ width: '100%', appearance: 'auto' }}
                value={publishCampus} onChange={e => setPublishCampus(e.target.value)}>
                {['All', 'AHJ', 'AHA', 'AHS'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Form</label>
              <select className="text-field" style={{ width: '100%', appearance: 'auto' }}
                value={publishForm} onChange={e => setPublishForm(e.target.value)}>
                {PUBLISH_FORM_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <button
              style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: '#1a237e', color: 'white', fontSize: 13, fontWeight: 700, cursor: publishingReportCards || !publishTermId ? 'not-allowed' : 'pointer', opacity: publishingReportCards || !publishTermId ? 0.6 : 1, whiteSpace: 'nowrap' }}
              onClick={handlePublishReportCards}
              disabled={!publishTermId || publishingReportCards}
            >
              📋 {publishingReportCards ? 'Publishing...' : 'Publish Report Cards'}
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 640 }}>
            <div>
              <label style={lbl}>Term</label>
              <select className="text-field" style={{ width: '100%', appearance: 'auto' }}
                value={termId} onChange={e => setTermId(Number(e.target.value))}>
                <option value="">Select term</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.year}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Campus</label>
              <select className="text-field" style={{ width: '100%', appearance: 'auto' }}
                value={campusFilter} onChange={e => setCampusFilter(e.target.value)}>
                {['All', 'AHJ', 'AHA', 'AHS'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Status</label>
              <select className="text-field" style={{ width: '100%', appearance: 'auto' }}
                value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                {['All', 'Ready', 'Partial', 'Not Started'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Bulk actions bar */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={selectAllReady}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}
          >
            <CheckSquare size={14} />
            Select All Ready
          </button>

          <span style={{ fontSize: 12, color: '#64748b' }}>
            {selected.size} student{selected.size !== 1 ? 's' : ''} selected
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12 }}
              onClick={handleGenerateSelected}
              disabled={selected.size === 0 || generating || publishing || !termId}
            >
              <FileDown size={13} />
              Generate Selected ({selected.size})
            </button>
            <button
              className="btn btn-primary"
              style={{ fontSize: 12 }}
              onClick={handleSendToPortal}
              disabled={selected.size === 0 || generating || publishing || !termId}
            >
              <Send size={13} />
              Send to Portal ({selected.size})
            </button>
          </div>
        </div>

        {/* Credentials export bar */}
        {termId && (
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Export Credentials:</span>
            <button
              onClick={handleExportCredentialsPdf}
              disabled={exportingCreds}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, fontWeight: 600, color: '#0f172a', cursor: exportingCreds ? 'not-allowed' : 'pointer', opacity: exportingCreds ? 0.6 : 1 }}
            >
              📄 Print Credentials (PDF)
            </button>
            <button
              onClick={handleExportCredentialsExcel}
              disabled={exportingCreds}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, fontWeight: 600, color: '#0f172a', cursor: exportingCreds ? 'not-allowed' : 'pointer', opacity: exportingCreds ? 0.6 : 1 }}
            >
              📊 Export Credentials (Excel)
            </button>
            {exportingCreds && <span style={{ fontSize: 12, color: '#64748b' }}>Exporting...</span>}
          </div>
        )}

        {/* Student table */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Students {termId ? `— ${filtered.length} shown` : ''}
            </h3>
          </div>

          {!termId ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              Select a term to view completion status.
            </div>
          ) : loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 13 }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              No students match the selected filters.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <button
                        onClick={toggleAll}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#475569' }}
                        aria-label="Toggle all"
                      >
                        {allFilteredSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                      </button>
                    </th>
                    <th>Student Name</th>
                    <th>Student No</th>
                    <th>Campus</th>
                    <th>Form</th>
                    <th style={{ textAlign: 'center' }}>Subjects</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => {
                    const badge = statusBadge(row.status);
                    const isSel = selected.has(row.studentId);
                    return (
                      <tr key={row.studentId} style={{ background: isSel ? '#f0f4ff' : undefined }}>
                        <td>
                          <button
                            onClick={() => toggleRow(row.studentId)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: isSel ? '#1a237e' : '#94a3b8' }}
                            aria-label="Toggle row"
                          >
                            {isSel ? <CheckSquare size={15} /> : <Square size={15} />}
                          </button>
                        </td>
                        <td style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{row.studentName}</td>
                        <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: '#1a237e' }}>{row.studentNumber}</td>
                        <td style={{ fontSize: 12 }}>{row.campus}</td>
                        <td style={{ fontSize: 12 }}>{row.form}</td>
                        <td style={{ textAlign: 'center', fontSize: 12 }}>
                          <span style={{ color: row.fullyEntered ? '#166534' : '#475569', fontWeight: 600 }}>
                            {row.enteredSubjects}/{row.totalSubjects} subjects
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: 11, padding: '5px 10px' }}
                            title="Generate PDF report card"
                            onClick={async () => {
                              if (!termId) return;
                              try {
                                const res = await reportsAPI.getReportCard(row.studentId, termId as number);
                                await generateReportCard(res.data);
                              } catch {
                                showMsg(`Failed to generate report for ${row.studentName}`, 'error');
                              }
                            }}
                          >
                            <FileDown size={12} /> Report Card
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}

      {/* View Marks modal */}
      {viewingGroup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}
          onClick={() => setViewingGroup(null)}>
          <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', width: '100%', maxWidth: 760, maxHeight: '85vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{viewingGroup.subjectName}</h2>
                <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>{viewingGroup.campus} · {viewingGroup.form} · {viewMarksRows.length} student{viewMarksRows.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setViewingGroup(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>✕</button>
            </div>

            <div style={{ padding: '0 0 8px' }}>
              {viewMarksLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 13 }}>Loading...</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Student No.</th>
                        <th style={{ textAlign: 'center' }}>Paper 1</th>
                        <th style={{ textAlign: 'center' }}>Paper 2</th>
                        <th style={{ textAlign: 'center' }}>Total</th>
                        <th style={{ textAlign: 'center' }}>Grade</th>
                        <th>Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewMarksRows.map((r) => (
                        <tr key={r.studentId}>
                          <td style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{r.studentName}</td>
                          <td style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: '#1a237e' }}>{r.studentNumber}</td>
                          <td style={{ textAlign: 'center' }}>{r.paper1 ?? '—'}</td>
                          <td style={{ textAlign: 'center' }}>{r.paper2 ?? '—'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#1a237e' }}>{r.total ?? '—'}</td>
                          <td style={{ textAlign: 'center' }}>
                            {r.grade && (
                              <span style={{ padding: '2px 10px', borderRadius: 12, background: '#eef2ff', color: '#1a237e', fontWeight: 700, fontSize: 12 }}>
                                {r.grade}
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: '#64748b' }}>{r.comments || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 8, position: 'sticky', bottom: 0, background: 'white' }}>
              <button className="btn btn-secondary" onClick={() => setViewingGroup(null)}>Close</button>
              <button className="btn btn-secondary" onClick={() => handleSendBack(viewingGroup)} disabled={actioningKey === approvalKey(viewingGroup)}>
                ↩ Send Back
              </button>
              <button className="btn btn-primary" onClick={() => handleApproveAll(viewingGroup)} disabled={actioningKey === approvalKey(viewingGroup)}>
                ✅ Approve All
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
