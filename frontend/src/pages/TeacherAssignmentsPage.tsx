import { useState, useEffect } from 'react';
import { teacherAssignmentsAPI, subjectsAPI } from '../services/api';
import { usersAPI } from '../services/api';
import AdminLayout from '../components/AdminLayout';
import { Users, Plus, X, Trash2 } from 'lucide-react';

const CAMPUSES = ['AHJ', 'AHA', 'AHS'];

const FORM_OPTIONS: Record<string, string[]> = {
  AHJ: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'],
  AHA: ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'],
  AHS: ['Lower 6', 'Upper 6'],
};

interface Assignment {
  id: number;
  teacherId: number;
  teacherName: string;
  teacherEmail: string;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  campus: string;
  form: string;
}

interface Teacher {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
}

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal form
  const [modalTeacherId, setModalTeacherId] = useState<number | ''>('');
  const [modalCampus, setModalCampus] = useState('AHJ');
  const [modalForm, setModalForm] = useState(FORM_OPTIONS['AHJ'][0]);
  const [modalSubjectId, setModalSubjectId] = useState<number | ''>('');
  const [modalSubjects, setModalSubjects] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [assignRes, teacherRes] = await Promise.all([
        teacherAssignmentsAPI.getAll(1),
        usersAPI.getAll(1, 'Teacher'),
      ]);
      setAssignments(assignRes.data || []);
      setTeachers(teacherRes.data || []);
    } catch {
      showMsg('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    subjectsAPI.getAll(1, modalCampus).then(res => {
      setModalSubjects(res.data || []);
      setModalSubjectId('');
    }).catch(() => setModalSubjects([]));
  }, [modalCampus]);

  useEffect(() => {
    setModalForm(FORM_OPTIONS[modalCampus][0]);
  }, [modalCampus]);

  const handleRemove = async (id: number) => {
    try {
      await teacherAssignmentsAPI.delete(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
      showMsg('Assignment removed', 'success');
    } catch {
      showMsg('Failed to remove assignment', 'error');
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTeacherId || !modalSubjectId) return;
    setSubmitting(true);
    try {
      await teacherAssignmentsAPI.create({
        schoolId: 1,
        teacherId: modalTeacherId as number,
        subjectId: modalSubjectId as number,
        campus: modalCampus,
        form: modalForm,
      });
      showMsg('Subject assigned successfully', 'success');
      setShowModal(false);
      setModalTeacherId('');
      setModalSubjectId('');
      await loadData();
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Assignment failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    setModalTeacherId('');
    setModalCampus('AHJ');
    setModalForm(FORM_OPTIONS['AHJ'][0]);
    setModalSubjectId('');
    setShowModal(true);
  };

  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };

  // Group assignments by teacher
  const assignmentsByTeacher = teachers.reduce<Record<number, Assignment[]>>((acc, t) => {
    acc[t.id] = assignments.filter(a => a.teacherId === t.id);
    return acc;
  }, {});

  return (
    <AdminLayout title="Staff Assignments" subtitle="Manage which teachers are assigned to which subjects and classes">
      {message && (
        <div style={{ position: 'fixed', top: 80, right: 20, padding: '14px 18px', borderRadius: 10, background: message.type === 'success' ? '#0ea5e9' : '#dc2626', color: 'white', fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {message.text}
        </div>
      )}

      {/* Assign modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '28px 28px', width: 480, maxWidth: '95vw', boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Assign Subject to Teacher</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssign}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={lbl}>Teacher</label>
                  <select className="text-field" style={{ width: '100%', appearance: 'auto' }}
                    value={modalTeacherId} onChange={e => setModalTeacherId(e.target.value ? Number(e.target.value) : '')} required>
                    <option value="">Select teacher</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.firstName} {t.lastName} — {t.email}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Campus</label>
                    <select className="text-field" style={{ width: '100%', appearance: 'auto' }}
                      value={modalCampus} onChange={e => setModalCampus(e.target.value)}>
                      {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Form / Grade</label>
                    <select className="text-field" style={{ width: '100%', appearance: 'auto' }}
                      value={modalForm} onChange={e => setModalForm(e.target.value)}>
                      {FORM_OPTIONS[modalCampus].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Subject</label>
                  <select className="text-field" style={{ width: '100%', appearance: 'auto' }}
                    value={modalSubjectId} onChange={e => setModalSubjectId(e.target.value ? Number(e.target.value) : '')} required>
                    <option value="">Select subject</option>
                    {modalSubjects.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }} disabled={submitting}>
                  {submitting ? 'Assigning...' : 'Assign Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={openModal}>
            <Plus size={14} /> Assign Subject
          </button>
        </div>

        {loading ? (
          <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading...</div>
        ) : teachers.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: '50px 40px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <Users size={32} style={{ color: '#94a3b8', marginBottom: 12 }} />
            <h3 style={{ fontWeight: 700, fontSize: 15, margin: '0 0 8px' }}>No Teachers Found</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Create user accounts with the "Teacher" role first, then assign them subjects here.
            </p>
          </div>
        ) : (
          teachers.map(teacher => {
            const teacherAssignments = assignmentsByTeacher[teacher.id] || [];
            return (
              <div key={teacher.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#1a237e' }}>
                      {teacher.firstName[0]}{teacher.lastName[0]}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: '#0f172a' }}>{teacher.firstName} {teacher.lastName}</p>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '1px 0 0' }}>{teacher.email}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: teacherAssignments.length > 0 ? '#eef2ff' : '#f1f5f9', color: teacherAssignments.length > 0 ? '#1a237e' : '#94a3b8', fontWeight: 600 }}>
                    {teacherAssignments.length} class{teacherAssignments.length !== 1 ? 'es' : ''}
                  </span>
                </div>

                {teacherAssignments.length === 0 ? (
                  <div style={{ padding: '16px 20px', color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
                    No subjects assigned yet.
                  </div>
                ) : (
                  <div style={{ padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {teacherAssignments.map(a => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{a.subjectName}</span>
                        <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 8, background: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}>{a.campus}</span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>{a.form}</span>
                        <button
                          onClick={() => handleRemove(a.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0 2px', display: 'flex', lineHeight: 1 }}
                          title="Remove assignment"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </AdminLayout>
  );
}
