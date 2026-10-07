import { useEffect, useState } from 'react';
import { X, FileDown, ClipboardList } from 'lucide-react';
import { classRegisterAPI } from '../services/api';
import { type ClassRegister, downloadRegisterPdf, downloadAttendanceSheetPdf } from '../utils/classRegister';

interface Props { termId: number; campus: string; form: string; onClose: () => void }

// Teacher portal: the register for one of the teacher's own classes.
export default function TeacherClassRegisterModal({ termId, campus, form, onClose }: Props) {
  const [register, setRegister] = useState<ClassRegister | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('teacher_token') || '';
    classRegisterAPI.forTeacher(termId, campus, form, token)
      .then((res) => setRegister(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load the class register'));
  }, [termId, campus, form]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Class Register: {campus} {form}</h2>
            {register && <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>{register.total} learners · {register.boys} boys · {register.girls} girls · {register.termName}</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {register && (
              <>
                <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => downloadRegisterPdf(register)}><FileDown size={13} /> Register PDF</button>
                <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => downloadAttendanceSheetPdf(register)}><ClipboardList size={13} /> Attendance sheet</button>
              </>
            )}
            <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={18} /></button>
          </div>
        </div>
        <div style={{ overflowY: 'auto', padding: '8px 0' }}>
          {error ? <p style={{ color: '#b91c1c', fontSize: 13, padding: '0 22px' }}>{error}</p>
            : !register ? <p style={{ color: '#475569', fontSize: 13, padding: '0 22px' }}>Loading...</p>
            : (
              <table className="data-table">
                <thead><tr><th>No.</th><th>Learner</th><th>Student No.</th><th>Sex</th><th>Parent / Guardian</th><th>Phone</th></tr></thead>
                <tbody>
                  {register.students.map((s) => (
                    <tr key={s.id}>
                      <td>{s.no}</td>
                      <td><strong style={{ fontSize: 13 }}>{s.surname}, {s.firstName}</strong></td>
                      <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{s.studentNumber}</td>
                      <td>{s.gender}</td>
                      <td style={{ fontSize: 12 }}>{s.guardian || '—'}</td>
                      <td style={{ fontSize: 12 }}>{s.guardianPhone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>
    </div>
  );
}
