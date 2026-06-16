import { useState, useEffect } from 'react';
import { feesAPI, bulkReportsAPI, reportsAPI } from '../services/api';
import { generateReportCard } from '../utils/reportCard';
import AdminLayout from '../components/AdminLayout';
import { FileDown, Send, CheckSquare, Square } from 'lucide-react';

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
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  useEffect(() => {
    feesAPI.getTerms(1).then(res => {
      const data: any[] = res.data || [];
      setTerms(data);
      const active = data.find(t => t.isActive) ?? data[0];
      if (active) setTermId(active.id);
    }).catch(() => showMsg('Failed to load terms', 'error'));
  }, []);

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

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
    </AdminLayout>
  );
}
