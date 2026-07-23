import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { marksAPI, feesAPI, authAPI, versesAPI, announcementsAPI, homeworkAPI } from '../services/api';
import { teacherAssignmentsAPI } from '../services/api';
import {
  GraduationCap, LogOut, BookOpen, User, Menu, X,
  ClipboardList, ChevronLeft, Save, Send, AlertTriangle,
  CheckCircle, Users, Clock, Bell, Phone, Mail, LayoutDashboard,
  FileText, Plus, Trash2, ArrowRight,
} from 'lucide-react';
import VerseCard, { type VerseData } from '../components/VerseCard';

interface MarkRow {
  studentId: number;
  studentName: string;
  studentNumber: string;
  midtermScore: string;
  endOfTermScore: string;
  comments: string;
  status: string;
  sendBackComment: string | null;
  amendmentRequestedAt: string | null;
}

interface TeacherNotification {
  type: 'sendback' | 'approved';
  subjectName: string;
  campus: string;
  form: string;
  comment?: string | null;
}

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  Draft: { label: 'Draft', bg: '#f1f5f9', color: '#475569' },
  Submitted: { label: 'Submitted', bg: '#fff7ed', color: '#c2410c' },
  Approved: { label: 'Approved', bg: '#f0fdf4', color: '#15803d' },
};

const calculateGrade = (total: number) => {
  if (total >= 90) return 'A*';
  if (total >= 80) return 'A';
  if (total >= 70) return 'B';
  if (total >= 60) return 'C';
  if (total >= 50) return 'D';
  if (total >= 40) return 'E';
  return 'U';
};

type View = 'dashboard' | 'classes' | 'notifications' | 'homework' | 'profile';

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

  const [view, setView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

  // Marks entry state
  const [terms, setTerms] = useState<any[]>([]);
  const [termId, setTermId] = useState<number | ''>('');
  const [rows, setRows] = useState<MarkRow[]>([]);
  const [entryLoading, setEntryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentVerse, setCurrentVerse] = useState<VerseData | null>(null);

  // Overview stats + notifications (Dashboard / My Classes views)
  const [teacherStats, setTeacherStats] = useState({ totalStudents: 0, pendingDrafts: 0, approvedCount: 0 });
  const [notifications, setNotifications] = useState<TeacherNotification[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [assignmentStats, setAssignmentStats] = useState<Record<number, { studentCount: number; status: string }>>({});

  // Announcements (Notifications tab)
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Homework (Homework tab)
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [hwTitle, setHwTitle] = useState('');
  const [hwSubjectId, setHwSubjectId] = useState<number | ''>('');
  const [hwDescription, setHwDescription] = useState('');
  const [hwDueDate, setHwDueDate] = useState('');
  const [hwSubmitting, setHwSubmitting] = useState(false);
  const [viewingHomework, setViewingHomework] = useState<any>(null);

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
    versesAPI.getCurrent(1).then((res) => setCurrentVerse(res.data || null)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!teacherInfo?.id || !termId || assignments.length === 0) {
      setTeacherStats({ totalStudents: 0, pendingDrafts: 0, approvedCount: 0 });
      setNotifications([]);
      setAssignmentStats({});
      return;
    }
    let cancelled = false;
    (async () => {
      setStatsLoading(true);
      let totalStudents = 0;
      let pendingDrafts = 0;
      let approvedCount = 0;
      const notifs: TeacherNotification[] = [];
      const perAssignment: Record<number, { studentCount: number; status: string }> = {};
      const statusRank: Record<string, number> = { Draft: 0, Submitted: 1, Approved: 2 };

      for (const a of assignments) {
        try {
          const [midRes, endRes] = await Promise.all([
            marksAPI.getEntrySheet({
              termId: termId as number, campus: a.campus, form: a.form,
              subjectId: a.subjectId, assessmentType: 'Mid-term Test', teacherId: teacherInfo.id,
            }),
            marksAPI.getEntrySheet({
              termId: termId as number, campus: a.campus, form: a.form,
              subjectId: a.subjectId, assessmentType: 'End of Term Exam', teacherId: teacherInfo.id,
            }),
          ]);
          const midData: any[] = midRes.data || [];
          const endData: any[] = endRes.data || [];
          const endByStudent = new Map(endData.map((d: any) => [d.studentId, d]));
          const combined = midData.map((d: any) => {
            const endD = endByStudent.get(d.studentId);
            const midStatus = d.status || 'Draft';
            const endStatus = endD?.status || 'Draft';
            const status = statusRank[midStatus] >= statusRank[endStatus] ? midStatus : endStatus;
            const sendBackComment = d.sendBackComment || endD?.sendBackComment || null;
            return { status, sendBackComment };
          });

          totalStudents += combined.length;
          pendingDrafts += combined.filter(r => r.status === 'Draft').length;
          approvedCount += combined.filter(r => r.status === 'Approved').length;

          const overallStatus = combined.some(r => r.status === 'Draft')
            ? 'Draft'
            : combined.some(r => r.status === 'Submitted')
            ? 'Submitted'
            : combined.length > 0
            ? 'Approved'
            : 'Draft';
          perAssignment[a.assignmentId] = { studentCount: combined.length, status: overallStatus };

          const sendBack = combined.find(r => r.status === 'Draft' && r.sendBackComment);
          if (sendBack) {
            notifs.push({ type: 'sendback', subjectName: a.subjectName, campus: a.campus, form: a.form, comment: sendBack.sendBackComment });
          }
          if (combined.some(r => r.status === 'Approved')) {
            notifs.push({ type: 'approved', subjectName: a.subjectName, campus: a.campus, form: a.form });
          }
        } catch {
          // skip this assignment's contribution on error
        }
      }

      if (!cancelled) {
        setTeacherStats({ totalStudents, pendingDrafts, approvedCount });
        setNotifications(notifs);
        setAssignmentStats(perAssignment);
        setStatsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [assignments, termId, teacherInfo?.id]);

  useEffect(() => {
    announcementsAPI.getAll(1).then((res) => setAnnouncements(res.data || [])).catch(() => {});
  }, []);

  const loadHomework = () => {
    if (!teacherInfo?.id) return;
    setHomeworkLoading(true);
    homeworkAPI.getForTeacher(teacherInfo.id)
      .then((res) => setHomeworkList(res.data || []))
      .catch(() => setHomeworkList([]))
      .finally(() => setHomeworkLoading(false));
  };

  useEffect(() => {
    loadHomework();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherInfo?.id]);

  const openHomeworkModal = () => {
    setHwTitle('');
    setHwSubjectId('');
    setHwDescription('');
    setHwDueDate('');
    setShowHomeworkModal(true);
  };

  const handleCreateHomework = async () => {
    if (!teacherInfo?.id || !termId || !hwTitle.trim() || !hwSubjectId || !hwDueDate) return;
    setHwSubmitting(true);
    try {
      await homeworkAPI.create({
        subjectId: hwSubjectId as number,
        teacherId: teacherInfo.id,
        schoolId: 1,
        termId: termId as number,
        title: hwTitle.trim(),
        description: hwDescription.trim() || undefined,
        dueDate: hwDueDate,
      });
      showMsg('Assignment created', 'success');
      setShowHomeworkModal(false);
      loadHomework();
    } catch (err: any) {
      showMsg(err?.response?.data?.message || 'Failed to create assignment', 'error');
    } finally {
      setHwSubmitting(false);
    }
  };

  const handleDeleteHomework = async (id: number) => {
    if (!window.confirm('Delete this assignment?')) return;
    try {
      await homeworkAPI.delete(id);
      showMsg('Assignment deleted', 'success');
      loadHomework();
    } catch {
      showMsg('Failed to delete assignment', 'error');
    }
  };

  const uniqueSubjects = useMemo(() => {
    const seen = new Set<number>();
    const list: { subjectId: number; subjectName: string }[] = [];
    for (const a of assignments) {
      if (!seen.has(a.subjectId)) {
        seen.add(a.subjectId);
        list.push({ subjectId: a.subjectId, subjectName: a.subjectName });
      }
    }
    return list;
  }, [assignments]);

  const formsForSubject = (subjectId: number) =>
    Array.from(new Set(assignments.filter((a: any) => a.subjectId === subjectId).map((a: any) => a.form))).join(', ') || '—';

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
  }, [selectedAssignment, termId]);

  const loadEntrySheet = async () => {
    if (!selectedAssignment || !termId || !teacherInfo?.id) return;
    setEntryLoading(true);
    try {
      const [midRes, endRes] = await Promise.all([
        marksAPI.getEntrySheet({
          termId: termId as number,
          campus: selectedAssignment.campus,
          form: selectedAssignment.form,
          subjectId: selectedAssignment.subjectId,
          assessmentType: 'Mid-term Test',
          teacherId: teacherInfo.id,
        }),
        marksAPI.getEntrySheet({
          termId: termId as number,
          campus: selectedAssignment.campus,
          form: selectedAssignment.form,
          subjectId: selectedAssignment.subjectId,
          assessmentType: 'End of Term Exam',
          teacherId: teacherInfo.id,
        }),
      ]);
      const midData: any[] = midRes.data || [];
      const endData: any[] = endRes.data || [];
      const endByStudent = new Map(endData.map(d => [d.studentId, d]));
      const statusRank: Record<string, number> = { Draft: 0, Submitted: 1, Approved: 2 };
      setRows(midData.map(d => {
        const endD = endByStudent.get(d.studentId);
        const midStatus = d.status || 'Draft';
        const endStatus = endD?.status || 'Draft';
        const status = statusRank[midStatus] >= statusRank[endStatus] ? midStatus : endStatus;
        return {
          studentId: d.studentId,
          studentName: d.studentName,
          studentNumber: d.studentNumber,
          midtermScore: d.score != null ? String(d.score) : '',
          endOfTermScore: endD?.score != null ? String(endD.score) : '',
          comments: d.comments || endD?.comments || '',
          status,
          sendBackComment: d.sendBackComment || endD?.sendBackComment || null,
          amendmentRequestedAt: d.amendmentRequestedAt || endD?.amendmentRequestedAt || null,
        };
      }));
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
    if (row.midtermScore === '' && row.endOfTermScore === '') return '';
    if (row.midtermScore !== '' && row.endOfTermScore !== '') {
      return String((Number(row.midtermScore) + Number(row.endOfTermScore)) / 2);
    }
    return row.midtermScore !== '' ? row.midtermScore : row.endOfTermScore;
  };

  const grade = (row: MarkRow) => {
    const t = total(row);
    return t === '' ? '' : calculateGrade(Number(t));
  };

  const handleSaveAll = async () => {
    if (!termId || !selectedAssignment || !teacherInfo?.id) return;
    setSaving(true);
    try {
      const marks = rows.map(r => ({
        studentId: r.studentId,
        midtermScore: r.midtermScore !== '' ? Number(r.midtermScore) : null,
        endOfTermScore: r.endOfTermScore !== '' ? Number(r.endOfTermScore) : null,
        comments: r.comments || null,
      }));
      const res = await marksAPI.bulkSave({
        schoolId: 1,
        termId,
        subjectId: selectedAssignment.subjectId,
        assessmentType: 'Combined',
        campus: selectedAssignment.campus,
        form: selectedAssignment.form,
        teacherId: teacherInfo.id,
        marks,
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

  const handleSubmitForReview = async () => {
    if (!termId || !selectedAssignment || !teacherInfo?.id) return;

    const missing = rows.filter(r => r.midtermScore === '' && r.endOfTermScore === '');
    if (missing.length > 0) {
      showMsg(`Cannot submit — the following students have no marks entered: ${missing.map(r => r.studentName).join(', ')}`, 'error');
      return;
    }

    if (!window.confirm('Once submitted, marks cannot be edited without admin approval. Proceed?')) return;
    setSubmitting(true);
    try {
      await marksAPI.submitMarks({
        subjectId: selectedAssignment.subjectId,
        termId: termId as number,
        campus: selectedAssignment.campus,
        form: selectedAssignment.form,
        submittedBy: `${firstName} ${surname}`.trim() || teacherInfo.email,
      });
      showMsg('Marks submitted successfully', 'success');
      await loadEntrySheet();
    } catch (err: any) {
      showMsg(err?.response?.data?.message || 'Failed to submit marks', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('teacher_token');
    localStorage.removeItem('teacher_info');
    navigate('/teacher-login');
  };

  // Change password (My Profile)
  const [cpCurrentPassword, setCpCurrentPassword] = useState('');
  const [cpNewPassword, setCpNewPassword] = useState('');
  const [cpConfirmPassword, setCpConfirmPassword] = useState('');
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState('');

  const handleChangePassword = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setCpError('');
    if (cpNewPassword.length < 8) { setCpError('New password must be at least 8 characters'); return; }
    if (cpNewPassword !== cpConfirmPassword) { setCpError('Passwords do not match'); return; }
    setCpLoading(true);
    try {
      const teacherToken = localStorage.getItem('teacher_token') || undefined;
      await authAPI.changePassword(cpCurrentPassword, cpNewPassword, teacherToken);
      showMsg('Password changed successfully', 'success');
      setCpCurrentPassword(''); setCpNewPassword(''); setCpConfirmPassword('');
    } catch (err: any) {
      setCpError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setCpLoading(false);
    }
  };

  const firstName = teacherInfo?.firstName ?? '';
  const surname = teacherInfo?.surname ?? '';
  const initials = `${firstName[0] ?? ''}${surname[0] ?? ''}`.toUpperCase();

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

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
          { id: 'dashboard' as View, label: 'Dashboard', Icon: LayoutDashboard, badge: 0 },
          { id: 'classes' as View, label: 'My Classes', Icon: BookOpen, badge: 0 },
          { id: 'notifications' as View, label: 'Notifications', Icon: Bell, badge: notifications.length },
          { id: 'homework' as View, label: 'Homework', Icon: FileText, badge: 0 },
          { id: 'profile' as View, label: 'My Profile', Icon: User, badge: 0 },
        ] as const).map(({ id, label, Icon, badge }) => (
          <button key={id} onClick={() => { setView(id); setSidebarOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', background: view === id ? 'rgba(255,255,255,0.15)' : 'transparent', color: view === id ? 'white' : 'rgba(255,255,255,0.65)', fontWeight: view === id ? 600 : 400, fontSize: 13 }}>
            <Icon size={15} />{label}
            {badge > 0 && (
              <span style={{ marginLeft: 'auto', background: '#dc2626', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 7px', lineHeight: '14px' }}>
                {badge}
              </span>
            )}
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

  // ── Dashboard view ───────────────────────────────────────────
  const subjectsAssignedCount = new Set(assignments.map((a: any) => a.subjectId)).size;

  const DashboardView = (
    <div style={{ padding: '24px 28px', maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>{greeting}, {firstName}!</h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Here's an overview of your classes.</p>
      </div>

      {currentVerse && (
        <div style={{ marginBottom: 20 }}>
          <VerseCard verse={currentVerse} greetingName={firstName} fontSize={18} animate />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'My Classes', value: subjectsAssignedCount, icon: BookOpen, color: '#1a237e', bg: '#eef2ff' },
          { label: 'My Students', value: teacherStats.totalStudents, icon: Users, color: '#0891b2', bg: '#ecfeff' },
          { label: 'Pending Submission', value: teacherStats.pendingDrafts, icon: Clock, color: '#c2410c', bg: '#fff7ed' },
          { label: 'Approved', value: teacherStats.approvedCount, icon: CheckCircle, color: '#15803d', bg: '#f0fdf4' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={{ background: 'white', borderRadius: 12, padding: '14px 16px', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Icon size={14} color={color} />
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>{statsLoading ? '—' : value}</p>
            <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{label}</p>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Quick Links</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { id: 'classes' as View, label: 'My Classes', desc: 'Enter and review marks', Icon: BookOpen },
            { id: 'notifications' as View, label: 'Notifications', desc: 'Send-backs, approvals, announcements', Icon: Bell },
            { id: 'homework' as View, label: 'Homework', desc: 'Set and manage assignments', Icon: FileText },
            { id: 'profile' as View, label: 'My Profile', desc: 'Account details', Icon: User },
          ].map(({ id, label, desc, Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              style={{ textAlign: 'left', cursor: 'pointer', background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <Icon size={18} style={{ color: '#1a237e' }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{desc}</p>
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#1a237e' }}>
                Open <ArrowRight size={12} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
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
        <div style={{ maxWidth: 280 }}>
          <label style={lbl}>Term</label>
          <select className="text-field" style={{ width: '100%', appearance: 'auto' }}
            value={termId} onChange={e => setTermId(Number(e.target.value))}>
            <option value="">Select term</option>
            {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.year}</option>)}
          </select>
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
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleSaveAll} disabled={saving || rows.length === 0 || !rows.some(r => r.status === 'Draft')}>
              <Save size={13} /> {saving ? 'Saving...' : 'Save All'}
            </button>
          </div>
        </div>

        {rows.some(r => r.status === 'Draft' && r.sendBackComment) && (
          <div style={{ margin: '14px 18px 0', padding: '12px 16px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 13, fontWeight: 600, display: 'flex', gap: 8 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              Marks sent back by admin: {rows.find(r => r.status === 'Draft' && r.sendBackComment)?.sendBackComment}
              <div style={{ fontWeight: 400, marginTop: 2 }}>Please review and resubmit.</div>
            </div>
          </div>
        )}

        {rows.some(r => r.status === 'Draft' && r.amendmentRequestedAt) && (
          <div style={{ margin: '14px 18px 0', padding: '12px 16px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: 13, fontWeight: 600, display: 'flex', gap: 8 }}>
            <CheckCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              Amendment approved! You can now re-enter the corrected marks.
              <div style={{ fontWeight: 400, marginTop: 2 }}>Remember to save and resubmit for approval.</div>
            </div>
          </div>
        )}

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
                  <th>Student No.</th>
                  <th style={{ textAlign: 'center' }}>Midterm (%)</th>
                  <th style={{ textAlign: 'center' }}>End of Term (%)</th>
                  <th style={{ textAlign: 'center' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Grade</th>
                  <th>Comments</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const locked = row.status !== 'Draft';
                  const badge = STATUS_BADGE[row.status] ?? STATUS_BADGE.Draft;
                  return (
                    <tr key={row.studentId}>
                      <td style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{row.studentName}</td>
                      <td style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace', color: '#1a237e' }}>{row.studentNumber}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input className="text-field" style={scoreInput} type="number" min={0} max={100}
                          value={row.midtermScore} disabled={locked}
                          onChange={e => updateRow(row.studentId, 'midtermScore', clamp(e.target.value, 100))} />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input className="text-field" style={scoreInput} type="number" min={0} max={100}
                          value={row.endOfTermScore} disabled={locked}
                          onChange={e => updateRow(row.studentId, 'endOfTermScore', clamp(e.target.value, 100))} />
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#1a237e' }}>{total(row)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {grade(row) && (
                          <span style={{ padding: '2px 10px', borderRadius: 12, background: '#eef2ff', color: '#1a237e', fontWeight: 700, fontSize: 12 }}>
                            {grade(row)}
                          </span>
                        )}
                      </td>
                      <td>
                        <input className="text-field" style={fld}
                          value={row.comments} disabled={locked}
                          onChange={e => updateRow(row.studentId, 'comments', e.target.value)}
                          placeholder="Optional comments" />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 12, background: badge.bg, color: badge.color, fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>
                          {row.status === 'Approved' && <CheckCircle size={11} />}
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {rows.some(r => r.status === 'Draft') && (
          <div style={{ padding: '14px 18px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleSubmitForReview} disabled={submitting}>
              <Send size={13} /> {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
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
              {groupAssignments.map((a: any) => {
                const stat = assignmentStats[a.assignmentId];
                const cardBadge = STATUS_BADGE[stat?.status ?? 'Draft'] ?? STATUS_BADGE.Draft;
                return (
                  <div key={a.assignmentId} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{a.subjectName}</h3>
                      <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{a.subjectCode}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}>{a.campus}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>{a.form}</span>
                      {a.curriculumType && (
                        (a.curriculumType || '').includes('ZIMSEC') ? (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>ZIMSEC</span>
                        ) : (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}>Cambridge</span>
                        )
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b' }}>
                        <Users size={13} /> {stat ? stat.studentCount : '—'} student{stat?.studentCount === 1 ? '' : 's'}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 12, background: cardBadge.bg, color: cardBadge.color, fontWeight: 700, fontSize: 11 }}>
                        {stat?.status === 'Approved' && <CheckCircle size={11} />}
                        {stat ? cardBadge.label : '—'}
                      </span>
                    </div>
                    <button
                      onClick={() => { setSelectedAssignment(a); setRows([]); }}
                      className="btn btn-primary"
                      style={{ fontSize: 12, width: '100%', justifyContent: 'center' }}
                    >
                      <ClipboardList size={13} /> Enter Marks
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ── Notifications view ───────────────────────────────────────
  const hasNotifications = notifications.length > 0 || announcements.length > 0;

  const NotificationsView = (
    <div style={{ padding: '24px 28px', maxWidth: 800 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 20px' }}>Notifications</h1>

      {!hasNotifications ? (
        <div style={{ background: 'white', borderRadius: 12, padding: '60px 40px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
          <Bell size={32} style={{ color: '#94a3b8', marginBottom: 12 }} />
          <h3 style={{ fontWeight: 700, fontSize: 15, margin: '0 0 8px', color: '#0f172a' }}>No notifications</h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>You're all caught up.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {notifications.length > 0 && (
            <div style={{ background: 'white', borderRadius: 12, padding: '16px 18px', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Marks</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notifications.map((n, i) => (
                  <div
                    key={`${n.type}-${n.subjectName}-${n.campus}-${n.form}-${i}`}
                    style={{
                      display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 8, fontSize: 13,
                      background: n.type === 'sendback' ? '#fef2f2' : '#f0fdf4',
                      border: `1px solid ${n.type === 'sendback' ? '#fecaca' : '#bbf7d0'}`,
                      color: n.type === 'sendback' ? '#991b1b' : '#15803d',
                    }}
                  >
                    {n.type === 'sendback'
                      ? <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                      : <CheckCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />}
                    <div>
                      <strong>{n.subjectName}</strong> ({n.campus} · {n.form}) —{' '}
                      {n.type === 'sendback' ? `sent back by admin: ${n.comment}` : 'marks approved'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {announcements.length > 0 && (
            <div style={{ background: 'white', borderRadius: 12, padding: '16px 18px', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Announcements</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {announcements.map((a: any) => (
                  <div key={a.id} style={{ padding: '10px 12px', borderRadius: 8, background: '#f8fafc', fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong style={{ color: '#0f172a' }}>{a.title}</strong>
                      <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', color: '#475569' }}>{a.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Homework view ────────────────────────────────────────────
  const HomeworkView = (
    <div style={{ padding: '24px 28px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>Homework</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>Set assignments for the subjects you teach</p>
        </div>
        <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={openHomeworkModal} disabled={assignments.length === 0}>
          <Plus size={13} /> Create Assignment
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {homeworkLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 13 }}>Loading...</div>
        ) : homeworkList.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>No assignments created yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Form</th>
                  <th>Due Date</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {homeworkList.map((h: any) => (
                  <tr key={h.id}>
                    <td style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{h.title}</td>
                    <td style={{ fontSize: 13 }}>{h.subjectName}</td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{formsForSubject(h.subjectId)}</td>
                    <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                      {h.dueDate ? new Date(h.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 12, background: '#eef2ff', color: '#1a237e', fontWeight: 700 }}>{h.status}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          onClick={() => setViewingHomework(h)}
                          title="View"
                          style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', background: 'white', color: '#1a237e', border: '1.5px solid #1a237e' }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteHomework(h.id)}
                          title="Delete"
                          style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', background: 'white', color: '#dc2626', border: '1.5px solid #dc2626', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewingHomework && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 480, maxWidth: '95vw', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12 }}>
              <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0, color: '#0f172a' }}>{viewingHomework.title}</h2>
              <button onClick={() => setViewingHomework(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4, flexShrink: 0 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 12, background: '#eef2ff', color: '#1a237e', fontWeight: 600 }}>{viewingHomework.subjectName}</span>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: '#f1f5f9', color: '#475569', fontWeight: 700 }}>{formsForSubject(viewingHomework.subjectId)}</span>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, background: '#eef2ff', color: '#1a237e', fontWeight: 700 }}>{viewingHomework.status}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>Due Date</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 }}>
                  {viewingHomework.dueDate
                    ? new Date(viewingHomework.dueDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                    : '—'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>Description / Instructions</p>
                <p style={{ fontSize: 13, color: '#334155', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {viewingHomework.description || 'No additional instructions provided.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
              <button
                onClick={() => setViewingHomework(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showHomeworkModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 440, maxWidth: '95vw', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Create Assignment</h2>
              <button onClick={() => setShowHomeworkModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Title *</label>
                <input className="text-field" style={fld} type="text" value={hwTitle}
                  onChange={e => setHwTitle(e.target.value)} placeholder="e.g. Chapter 4 Exercises" />
              </div>

              <div>
                <label style={lbl}>Subject *</label>
                <select className="text-field" style={{ ...fld, appearance: 'auto' }}
                  value={hwSubjectId} onChange={e => setHwSubjectId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Select subject</option>
                  {uniqueSubjects.map(s => (
                    <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={lbl}>Description / Instructions</label>
                <textarea className="text-field" style={{ ...fld, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
                  value={hwDescription} onChange={e => setHwDescription(e.target.value)}
                  placeholder="Optional instructions for students" />
              </div>

              <div>
                <label style={lbl}>Due Date *</label>
                <input className="text-field" style={fld} type="date" value={hwDueDate}
                  onChange={e => setHwDueDate(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => setShowHomeworkModal(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateHomework}
                disabled={!hwTitle.trim() || !hwSubjectId || !hwDueDate || hwSubmitting}
                className="btn btn-primary"
                style={{ opacity: (!hwTitle.trim() || !hwSubjectId || !hwDueDate || hwSubmitting) ? 0.6 : 1 }}
              >
                {hwSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
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
            ['First Name', firstName, null],
            ['Surname', surname, null],
            ['Email', teacherInfo?.email, Mail],
            ['Phone Number', teacherInfo?.phoneNumber || null, Phone],
            ['Role', 'Teacher', null],
            ['School', 'Advent Hope Academy', null],
          ] as [string, string | null, React.ComponentType<{ size?: number }> | null][]).filter(([, v]) => v !== null).map(([label, value, Icon]) => (
            <div key={label}>
              <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>{label}</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                {Icon && <Icon size={13} />}
                {value || '—'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', marginTop: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Assigned Subjects</p>
        {assignments.length === 0 ? (
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>No subjects assigned yet.</p>
        ) : (
          <>
            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 14px' }}>
              {new Set(assignments.map((a: any) => a.subjectId)).size} subject{new Set(assignments.map((a: any) => a.subjectId)).size !== 1 ? 's' : ''} across {assignments.length} class{assignments.length !== 1 ? 'es' : ''}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {assignments.map((a: any) => (
                <div key={a.assignmentId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: '#f8fafc', fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{a.subjectName}</span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}>{a.campus}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>{a.form}</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '20px 24px', marginTop: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Change Password</p>
        {cpError && (
          <div style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>{cpError}</div>
        )}
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 340 }}>
          <div>
            <label style={lbl}>Current / Temporary Password</label>
            <input className="text-field" style={fld} type="password" value={cpCurrentPassword}
              onChange={e => setCpCurrentPassword(e.target.value)} required />
          </div>
          <div>
            <label style={lbl}>New Password</label>
            <input className="text-field" style={fld} type="password" value={cpNewPassword}
              onChange={e => setCpNewPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} />
          </div>
          <div>
            <label style={lbl}>Confirm New Password</label>
            <input className="text-field" style={fld} type="password" value={cpConfirmPassword}
              onChange={e => setCpConfirmPassword(e.target.value)} placeholder="Re-enter new password" required minLength={8} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={cpLoading} style={{ alignSelf: 'flex-start' }}>
            {cpLoading ? 'Saving...' : 'Change Password'}
          </button>
        </form>
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
          {view === 'dashboard' && DashboardView}
          {view === 'classes' && ClassesView}
          {view === 'notifications' && NotificationsView}
          {view === 'homework' && HomeworkView}
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
