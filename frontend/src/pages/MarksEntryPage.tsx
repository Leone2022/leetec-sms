import { useState, useEffect } from 'react';
import { marksAPI, subjectsAPI, feesAPI, termRegistrationsAPI, reportsAPI } from '../services/api';
import { ClipboardList, Save, FileDown } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { generateReportCard } from '../utils/reportCard';

const CAMPUSES = ['AHJ', 'AHA', 'AHS'];

const FORM_OPTIONS: Record<string, string[]> = {
  AHJ: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'],
  AHA: ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'],
  AHS: ['Lower 6', 'Upper 6'],
};

const ASSESSMENT_TYPES = ['Mid-term Test', 'End of Term Exam'];

interface MarkRow {
  markId: number | null;
  studentId: number;
  studentName: string;
  studentNumber: string;
  paper1Score: string;
  paper2Score: string;
  score: string;
  comments: string;
}

export default function MarksEntryPage() {
  const [terms, setTerms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [termId, setTermId] = useState<number | ''>('');
  const [campus, setCampus] = useState('AHJ');
  const [form, setForm] = useState(FORM_OPTIONS['AHJ'][0]);
  const [subjectId, setSubjectId] = useState<number | ''>('');
  const [assessmentType, setAssessmentType] = useState(ASSESSMENT_TYPES[0]);
  const [rows, setRows] = useState<MarkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [reportStudents, setReportStudents] = useState<{ studentId: number; studentName: string; studentNumber: string }[]>([]);
  const [reportStudentId, setReportStudentId] = useState<number | ''>('');
  const [generatingReport, setGeneratingReport] = useState(false);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
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
    subjectsAPI.getAll(1, campus).then(res => {
      setSubjects(res.data || []);
      setSubjectId('');
    }).catch(() => showMsg('Failed to load subjects', 'error'));
  }, [campus]);

  useEffect(() => {
    setForm(FORM_OPTIONS[campus][0]);
  }, [campus]);

  const isPaperBased = campus === 'AHJ';

  useEffect(() => {
    if (!termId || !campus || !form) {
      setReportStudents([]);
      setReportStudentId('');
      return;
    }
    termRegistrationsAPI.getDashboard(termId as number).then(res => {
      const regs: any[] = res.data?.registrations || res.data || [];
      const list = regs
        .filter(r => r.campus === campus && r.form === form)
        .map(r => ({ studentId: r.studentId, studentName: r.studentName, studentNumber: r.studentNumber }));
      setReportStudents(list);
      setReportStudentId('');
    }).catch(() => setReportStudents([]));
  }, [campus, termId, form]);

  const handleGenerateReportCard = async () => {
    if (!reportStudentId || !termId) return;
    setGeneratingReport(true);
    try {
      const res = await reportsAPI.getReportCard(reportStudentId as number, termId as number);
      await generateReportCard(res.data);
    } catch {
      showMsg('Failed to generate report card', 'error');
    } finally {
      setGeneratingReport(false);
    }
  };

  useEffect(() => {
    if (!termId || !campus || !form || !subjectId || !assessmentType) {
      setRows([]);
      return;
    }
    loadEntrySheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termId, campus, form, subjectId, assessmentType]);

  const loadEntrySheet = async () => {
    setLoading(true);
    try {
      const res = await marksAPI.getEntrySheet({
        termId: termId as number,
        campus,
        form,
        subjectId: subjectId as number,
        assessmentType,
      });
      const data: any[] = res.data || [];
      setRows(data.map(d => ({
        markId: d.markId,
        studentId: d.studentId,
        studentName: d.studentName,
        studentNumber: d.studentNumber,
        paper1Score: d.paper1Score != null ? String(d.paper1Score) : '',
        paper2Score: d.paper2Score != null ? String(d.paper2Score) : '',
        score: d.score != null ? String(d.score) : '',
        comments: d.comments ?? '',
      })));
    } catch {
      showMsg('Failed to load entry sheet', 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (studentId: number, field: keyof MarkRow, value: string) => {
    setRows(prev => prev.map(r => r.studentId === studentId ? { ...r, [field]: value } : r));
  };

  const clamp = (value: string, max: number) => {
    if (value === '') return '';
    if (!/^\d*\.?\d*$/.test(value)) return value;
    const n = Number(value);
    if (isNaN(n)) return value;
    if (n > max) return String(max);
    if (n < 0) return '0';
    return value;
  };

  const total = (row: MarkRow) => {
    const p1 = Number(row.paper1Score) || 0;
    const p2 = Number(row.paper2Score) || 0;
    if (row.paper1Score === '' && row.paper2Score === '') return '';
    return String(p1 + p2);
  };

  const handleSaveAll = async () => {
    if (!termId || !subjectId) return;
    setSaving(true);
    try {
      const entries = rows.map(r => ({
        studentId: r.studentId,
        paper1Score: isPaperBased && r.paper1Score !== '' ? Number(r.paper1Score) : null,
        paper2Score: isPaperBased && r.paper2Score !== '' ? Number(r.paper2Score) : null,
        score: !isPaperBased && r.score !== '' ? Number(r.score) : null,
        comments: r.comments || null,
      }));

      const res = await marksAPI.bulkSave({
        schoolId: 1,
        termId,
        subjectId,
        assessmentType,
        entries,
      });

      showMsg(res.data?.message || `Marks saved for ${rows.length} students`, 'success');
      loadEntrySheet();
    } catch {
      showMsg('Failed to save marks', 'error');
    } finally {
      setSaving(false);
    }
  };

  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };
  const fld: React.CSSProperties = { width: '100%', boxSizing: 'border-box' };
  const scoreInput: React.CSSProperties = { width: 70, textAlign: 'center', padding: '0 6px', color: '#0f172a' };

  const canShowTable = termId && campus && form && subjectId && assessmentType;

  return (
    <AdminLayout title="Marks Entry" subtitle="Enter and manage student assessment marks">
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Filter bar */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            <div>
              <label style={lbl}>Term</label>
              <select className="text-field" style={{ ...fld, appearance: 'auto', cursor: 'pointer' }}
                value={termId} onChange={e => setTermId(Number(e.target.value))}>
                <option value="">Select term</option>
                {terms.map(t => (
                  <option key={t.id} value={t.id}>{t.name} {t.year}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Campus</label>
              <select className="text-field" style={{ ...fld, appearance: 'auto', cursor: 'pointer' }}
                value={campus} onChange={e => setCampus(e.target.value)}>
                {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Form / Grade</label>
              <select className="text-field" style={{ ...fld, appearance: 'auto', cursor: 'pointer' }}
                value={form} onChange={e => setForm(e.target.value)}>
                {FORM_OPTIONS[campus].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Subject</label>
              <select className="text-field" style={{ ...fld, appearance: 'auto', cursor: 'pointer' }}
                value={subjectId} onChange={e => setSubjectId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Select subject</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Assessment Type</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {ASSESSMENT_TYPES.map(a => (
                  <button key={a} type="button" onClick={() => setAssessmentType(a)}
                    style={{
                      flex: 1, padding: '8px 6px', borderRadius: '8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: assessmentType === a ? '#1a237e' : '#f1f5f9',
                      color: assessmentType === a ? 'white' : '#475569',
                    }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, maxWidth: 320 }}>
              <label style={lbl}>Report Card — Select Student</label>
              <select className="text-field" style={{ ...fld, appearance: 'auto', cursor: 'pointer' }}
                value={reportStudentId} onChange={e => setReportStudentId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Select student</option>
                {reportStudents.map(s => (
                  <option key={s.studentId} value={s.studentId}>{s.studentName} ({s.studentNumber})</option>
                ))}
              </select>
            </div>
            <button className="btn btn-secondary" style={{ fontSize: 12 }}
              onClick={handleGenerateReportCard} disabled={!reportStudentId || generatingReport}>
              <FileDown size={13} /> {generatingReport ? 'Generating...' : 'Generate Report Card'}
            </button>
          </div>
        </div>

        {/* Entry sheet */}
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0f172a' }}>Entry Sheet</h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                {rows.length} student{rows.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <ClipboardList size={18} style={{ color: '#94a3b8' }} />
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleSaveAll} disabled={saving || rows.length === 0}>
                <Save size={13} /> {saving ? 'Saving...' : 'Save All'}
              </button>
            </div>
          </div>

          {!canShowTable ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              Select Term, Campus, Form, Subject and Assessment Type to load the entry sheet.
            </div>
          ) : loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#475569', fontSize: 13 }}>Loading...</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              No students registered for {form} ({campus}) in this term.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Student No</th>
                    {isPaperBased ? (
                      <>
                        <th style={{ textAlign: 'center' }}>Paper 1</th>
                        <th style={{ textAlign: 'center' }}>Paper 2</th>
                        <th style={{ textAlign: 'center' }}>Total</th>
                      </>
                    ) : (
                      <th style={{ textAlign: 'center' }}>Score (%)</th>
                    )}
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.studentId}>
                      <td style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{row.studentName}</td>
                      <td style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: '#1a237e' }}>{row.studentNumber}</td>
                      {isPaperBased ? (
                        <>
                          <td style={{ textAlign: 'center' }}>
                            <input className="text-field" style={scoreInput} type="number" min={0} max={50}
                              value={row.paper1Score}
                              onChange={e => updateRow(row.studentId, 'paper1Score', clamp(e.target.value, 50))} />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input className="text-field" style={scoreInput} type="number" min={0} max={50}
                              value={row.paper2Score}
                              onChange={e => updateRow(row.studentId, 'paper2Score', clamp(e.target.value, 50))} />
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#1a237e' }}>{total(row)}</td>
                        </>
                      ) : (
                        <td style={{ textAlign: 'center' }}>
                          <input className="text-field" style={scoreInput} type="number" min={0} max={100}
                            value={row.score ?? ''}
                            onChange={e => updateRow(row.studentId, 'score', clamp(e.target.value, 100))} />
                        </td>
                      )}
                      <td>
                        <input className="text-field" style={fld}
                          value={row.comments}
                          onChange={e => updateRow(row.studentId, 'comments', e.target.value)}
                          placeholder="Optional comments" />
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
