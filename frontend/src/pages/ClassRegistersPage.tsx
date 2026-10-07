import { useEffect, useState } from 'react';
import { FileDown, FileSpreadsheet, ClipboardList, Users } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { classRegisterAPI, feesAPI } from '../services/api';
import {
  type ClassRegister, downloadRegisterPdf, downloadAttendanceSheetPdf, downloadRegisterExcel, downloadAllRegistersExcel,
} from '../utils/classRegister';

interface ClassSummary { campus: string; form: string; total: number; boys: number; girls: number; notRegistered: number }
interface Term { id: number; name: string; isActive: boolean }

const CAMPUS_NAMES: Record<string, string> = { AHJ: 'Junior School (AHJ)', AHA: 'Academy (AHA)', AHS: 'Sixth Form (AHS)' };

export default function ClassRegistersPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState<number | ''>('');
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selected, setSelected] = useState<{ campus: string; form: string } | null>(null);
  const [register, setRegister] = useState<ClassRegister | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    feesAPI.getTerms(1).then((res) => {
      const data: Term[] = res.data || [];
      setTerms(data);
      const active = data.find((t) => t.isActive) ?? data[0];
      if (active) setTermId(active.id);
    }).catch(() => setError('Failed to load terms'));
  }, []);

  useEffect(() => {
    if (!termId) return;
    setSelected(null);
    setRegister(null);
    classRegisterAPI.classes(termId)
      .then((res) => setClasses(res.data || []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load classes'));
  }, [termId]);

  useEffect(() => {
    if (!termId || !selected) return;
    setLoading(true);
    classRegisterAPI.get(termId, selected.campus, selected.form)
      .then((res) => setRegister(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load the register'))
      .finally(() => setLoading(false));
  }, [termId, selected]);

  const exportAll = async () => {
    if (!termId) return;
    setExportingAll(true);
    try {
      const registers: ClassRegister[] = [];
      for (const c of classes) registers.push((await classRegisterAPI.get(termId, c.campus, c.form)).data);
      downloadAllRegistersExcel(registers, terms.find((t) => t.id === termId)?.name ?? 'Term');
    } catch {
      setError('Failed to export all classes');
    } finally {
      setExportingAll(false);
    }
  };

  const campuses = Array.from(new Set(classes.map((c) => c.campus)));
  const totals = classes.reduce((a, c) => ({ total: a.total + c.total, boys: a.boys + c.boys, girls: a.girls + c.girls }), { total: 0, boys: 0, girls: 0 });

  return (
    <AdminLayout title="Class Registers" subtitle={`${totals.total} current learners · ${totals.boys} boys · ${totals.girls} girls`}>
      <div className="toolbar" style={{ alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Term</label>
          <select className="text-field" style={{ appearance: 'auto', minWidth: 220 }} value={termId} onChange={(e) => setTermId(Number(e.target.value))}>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.name}{t.isActive ? ' (Active)' : ''}</option>)}
          </select>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-secondary" onClick={exportAll} disabled={exportingAll || classes.length === 0}>
            <FileSpreadsheet size={14} /> {exportingAll ? 'Preparing...' : 'All classes (Excel)'}
          </button>
        </div>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 12 }} onClick={() => setError('')}>{error}</div>}

      {campuses.map((campus) => (
        <section key={campus} style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#475569', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{CAMPUS_NAMES[campus] ?? campus}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
            {classes.filter((c) => c.campus === campus).map((c) => {
              const active = selected?.campus === c.campus && selected?.form === c.form;
              return (
                <button key={`${c.campus}|${c.form}`} type="button" onClick={() => setSelected({ campus: c.campus, form: c.form })}
                  style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 10, cursor: 'pointer', background: 'white',
                    border: active ? '2px solid #1a237e' : '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{c.form}</div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}><Users size={12} style={{ verticalAlign: 'middle' }} /> {c.total} · {c.boys} boys · {c.girls} girls</div>
                  {c.notRegistered > 0 && <div style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>{c.notRegistered} not registered for this term</div>}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {selected && (
        <div className="table-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{selected.campus} {selected.form}</h3>
              {register && <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{register.total} learners · {register.boys} boys · {register.girls} girls · {register.termName}</p>}
            </div>
            {register && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => downloadRegisterPdf(register)}><FileDown size={14} /> Register PDF</button>
                <button className="btn btn-secondary" onClick={() => downloadAttendanceSheetPdf(register)}><ClipboardList size={14} /> Attendance sheet</button>
                <button className="btn btn-secondary" onClick={() => downloadRegisterExcel(register)}><FileSpreadsheet size={14} /> Excel</button>
              </div>
            )}
          </div>
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#475569', fontSize: 13 }}>Loading register...</div>
          ) : register && (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>No.</th><th>Learner</th><th>Student No.</th><th>Sex</th><th>Day/Boarder</th><th>Parent / Guardian</th><th>Phone</th><th>Subjects</th></tr>
                </thead>
                <tbody>
                  {register.students.map((s) => (
                    <tr key={s.id}>
                      <td>{s.no}</td>
                      <td><strong style={{ fontSize: 13 }}>{s.surname}, {s.firstName}</strong>
                        {!s.registeredForTerm && <div style={{ fontSize: 11, color: '#b45309' }}>Not registered for this term</div>}</td>
                      <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{s.studentNumber}</td>
                      <td>{s.gender}</td>
                      <td>{s.studentType}</td>
                      <td style={{ fontSize: 12 }}>{s.guardian || '—'}{s.guardianRelation && <div style={{ color: '#64748b', fontSize: 11 }}>{s.guardianRelation}</div>}</td>
                      <td style={{ fontSize: 12 }}>{s.guardianPhone || '—'}</td>
                      <td style={{ fontSize: 12, color: s.subjects.length ? '#475569' : '#b45309' }}>{s.subjects.length ? `${s.subjects.length} subjects` : 'None this term'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
