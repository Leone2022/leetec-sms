import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { marksAPI, feesAPI } from '../services/api';
import { teacherAssignmentsAPI } from '../services/api';
import {
  GraduationCap, LogOut, BookOpen, User, Menu, X,
  ClipboardList, Save, ChevronLeft,
} from 'lucide-react';

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

type View = 'classes' | 'profile';

export default function TeacherDashboardPage() {
  const navigate = useNavigate();

  const teacherInfo = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('teacher_info') || 'null'); }
    catch { return null; }
  }, []);

  useEffect(() => {
    if (!teacherInfo || !localStorage.getItem('teacher_token')) {
      navigate('/teacher-login');
    }
  }, [navigate, teacherInfo]);

  useEffect(() => { document.title = 'LeeTec SMS — Teacher Portal'; }, []);

  const [view, setView] = useState<View>('classes');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

  // Marks entry state
  const [terms, setTerms] = useState<any[]>([]);
  const [termId, setTermId] = useState<number | ''>('');
  const [assessmentType, setAssessmentType] = useState(ASSESSMENT_TYPES[0]);
  const [rows, setRows] = useState<MarkRow[]>([]);
  const [entryLoading, setEntryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  useEffect(() => {
    if (!teacherInfo?.id) return;
    teacherAssignmentsAPI.getMySubjects(teacherInfo.id)
      .then(res => setAssignments(res.data || []))
      .catch(() => showMsg('Failed to load assignments', 'error'));
  }, [teacherInfo?.id]);

  useEffect(() => {
    feesAPI.getTerms(1).then(res => {
      const data: any[] = res.data || [];
      setTerms(data);
      const active = data.find(t => t.isActive) ?? data[0];
      if (active) setTermId(active.id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedAssignment || !termId) { setRows([]); return; }
    loadEntrySheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignment, termId, assessmentType]);

  const loadEntrySheet = async () => {
    if (!selectedAssignment || !termId || !teacherInfo?.id) return;
    setEntryLoading(true);
    try {
      const res = await marksAPI.getEntrySheet({
        termId: termId as number,
        campus: selectedAssignment.campus,
        form: selectedAssignment.form,
        subjectId: selectedAssignment.subjectId,
        assessmentType,
        teacherId: teacherInfo.id,
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
    } catch (err: any) {
      if (err?.response?.status === 403) showMsg('You are not assigned to this class', 'error');
      else showMsg('Failed to load entry sheet', 'error');
      setRows([]);
    } finally {
      setEntryLoading(false);
    }
  };

  const updateRow = (studentId: number, field: keyof MarkRow, value: string) =>
    setRows(prev => prev.map(r => r.studentId === studentId ? { ...r, [field]: value } : r));

  const clamp = (value: string, max: number) => {
    if (value === '') return '';
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
    if (!termId || !selectedAssignment || !teacherInfo?.id) return;
    setSaving(true);
    const isPaperBased = selectedAssignment.campus === 'AHJ';
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
        subjectId: selectedAssignment.subjectId,
        assessmentType,
        campus: selectedAssignment.campus,
        form: selectedAssignment.form,
        teacherId: teacherInfo.id,
        entries,
      });
      showMsg(res.data?.message || `Marks saved for ${rows.length} students`, 'success');
      await loadEntrySheet();
    } catch (err: any) {
      if (err?.response?.status === 403) showMsg('Assignment verification failed', 'error');
      else showMsg('Failed to save marks', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('teacher_token');
    localStorage.removeItem('teacher_info');
    navigate('/teacher-login');
  };

  const firstName = teacherInfo?.firstName ?? '';
  const surname = teacherInfo?.surname ?? '';
  const initials = `${firstName[0] ?? ''}${surname[0] ?? ''}`.toUpperCase();

  // Group assignments by campus+form for display
  const groupedAssignments = assignments.reduce<Record<string, any[]>>((acc, a) => {
    const key = `${a.campus} — ${a.form}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };
  const scoreInput: React.CSSProperties = { width: 70, textAlign: 'center', padding: '0 6px', color: '#0f172a' };
  const fld: React.CSSProperties = { width: '100%', boxSizing: 'border-box' };

  const isPaperBased = selectedAssignment?.campus === 'AHJ';

  // ── Sidebar ──────────────────────────────────────────────────
  const Sidebar = (
    <aside style={{ width: 240, background: '#1a237e', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={16} color="white" />
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 13, margin: 0 }}>LeeTec SMS</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0 }}>Teacher Portal</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white' }}>
            {initials}
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 600, fontSize: 13, margin: 0 }}>{firstName} {surname}</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '2px 0 0' }}>{teacherInfo?.email}</p>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px 8px' }}>Menu</p>
        {([
          { id: 'classes' as View, label: 'My Classes', Icon: BookOpen },
          { id: 'profile' as View, label: 'My Profile', Icon: User },
        ] as const).map(({ id, label, Icon }) => (
          <button key={id} onClick={() => { setView(id); setSidebarOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', background: view === id ? 'rgba(255,255,255,0.15)' : 'transparent', color: view === id ? 'white' : 'rgba(255,255,255,0.65)', fontWeight: view === id ? 600 : 400, fontSize: 13 }}>
            <Icon size={15} />{label}
          </button>
        ))}
      </nav>

      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500 }}>
          <LogOut size={14} />Sign Out
        </button>
      </div>
    </aside>
  );

  // ── My Classes view ──────────────────────────────────────────
  const ClassesView = selectedAssignment ? (
    // Marks entry sheet for selected assignment
    <div style={{ padding: '24px 28px', maxWidth: 900 }}>
      <button onClick={() => { setSelectedAssignment(null); setRows([]); }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#1a237e', fontWeight: 600, fontSize: 13, padding: '0 0 16px' }}>
        <ChevronLeft size={15} /> Back to My Classes
      </button>

      <div style={{ background: '#1a237e', borderRadius: 12, padding: '16px 20px', marginBottom: 18, color: 'white' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>{selectedAssignment.subjectName}</h2>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{selectedAssignment.campus} · {selectedAssignment.form} · {selectedAssignment.subjectCode}</p>
      </div>

      {/* Controls */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>Term</label>
            <select className="text-field" style={{ width: '100%', appearance: 'auto' }}
              value={termId} onChange={e => setTermId(Number(e.target.value))}>
              <option value="">Select term</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.year}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Assessment Type</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {ASSESSMENT_TYPES.map(a => (
                <button key={a} type="button" onClick={() => setAssessmentType(a)}
                  style={{ flex: 1, padding: '8px 6px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: assessmentType === a ? '#1a237e' : '#f1f5f9', color: assessmentType === a ? 'white' : '#475569' }}>
                  {a === 'Mid-term Test' ? 'Mid-term' : 'End of Term'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Entry sheet */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Entry Sheet</h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{rows.length} student{rows.length !== 1 ? 's' : ''}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ClipboardList size={17} style={{ color: '#94a3b8' }} />
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleSaveAll} disabled={saving || rows.length === 0}>
              <Save size={13} /> {saving ? 'Saving...' : 'Save All'}
            </button>
          </div>
        </div>

        {!termId ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Select a term above to load the entry sheet.</div>
        ) : entryLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 13 }}>Loading...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>No students registered for {selectedAssignment.form} ({selectedAssignment.campus}) in this term.</div>
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
                          value={row.score}
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
  ) : (
    // Assignment cards grid
    <div style={{ padding: '24px 28px', maxWidth: 860 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>My Classes</h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Select a class to enter marks</p>
      </div>

      {assignments.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 12, padding: '60px 40px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
          <BookOpen size={32} style={{ color: '#94a3b8', marginBottom: 12 }} />
          <h3 style={{ fontWeight: 700, fontSize: 15, margin: '0 0 8px', color: '#0f172a' }}>No Classes Assigned</h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Contact your administrator to get classes assigned.</p>
        </div>
      ) : (
        Object.entries(groupedAssignments).map(([group, groupAssignments]) => (
          <div key={group} style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>{group}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {groupAssignments.map((a: any) => (
                <div key={a.assignmentId} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{a.subjectName}</h3>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{a.subjectCode}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}>{a.campus}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>{a.form}</span>
                  </div>
                  <button
                    onClick={() => { setSelectedAssignment(a); setRows([]); }}
                    className="btn btn-primary"
                    style={{ fontSize: 12, width: '100%', justifyContent: 'center' }}
                  >
                    <ClipboardList size={13} /> Enter Marks
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ── Profile view ─────────────────────────────────────────────
  const ProfileView = (
    <div style={{ padding: '24px 28px', maxWidth: 600 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 20px' }}>My Profile</h1>
      <div style={{ background: '#1a237e', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, color: 'white' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>{initials}</div>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>{firstName} {surname}</h2>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{teacherInfo?.email} · Teacher</p>
        </div>
      </div>
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Account Details</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
          {([
            ['First Name', firstName],
            ['Surname', surname],
            ['Email', teacherInfo?.email],
            ['Phone Number', teacherInfo?.phoneNumber || null],
            ['Role', 'Teacher'],
            ['School', 'Advent Hope Academy'],
          ] as [string, string | null][]).filter(([, v]) => v !== null).map(([label, value]) => (
            <div key={label}>
              <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>{label}</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>{value || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
      {message && (
        <div style={{ position: 'fixed', top: 16, right: 20, padding: '14px 18px', borderRadius: 10, background: message.type === 'success' ? '#0ea5e9' : '#dc2626', color: 'white', fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {message.text}
        </div>
      )}

      {sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 40 }} onClick={() => setSidebarOpen(false)} />}

      {/* Mobile sidebar */}
      <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.25s ease', display: 'flex' }}>
        {Sidebar}
      </div>

      {/* Desktop sidebar */}
      <div style={{ display: 'none' }} className="portal-sidebar-desktop">{Sidebar}</div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Mobile topbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: '#1a237e', flexShrink: 0 }} className="portal-topbar">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', padding: 4 }}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>Teacher Portal</span>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>{initials}</div>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {view === 'classes' && ClassesView}
          {view === 'profile' && ProfileView}
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .portal-sidebar-desktop { display: flex !important; }
          .portal-topbar { display: none !important; }
        }
      `}</style>
    </div>
  );
}
