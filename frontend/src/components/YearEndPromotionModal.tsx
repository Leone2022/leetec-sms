import { Fragment, useEffect, useMemo, useState } from 'react';
import { X, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { rolloverAPI } from '../services/api';

interface Option { key: string; label: string; toCampus: string | null; toForm: string | null; toStatus: string }
interface Row { studentId: number; name: string; studentNumber: string; campus: string; form: string; curriculum: string; defaultKey: string; options: Option[] }
interface Preview { students: Row[]; warnings: string[]; suggestedNumberYear: number }
interface Result { message: string; skipped: { studentId: number; reason: string }[]; numberChanges: { name: string; oldNumber: string; newNumber: string }[] }

interface Props {
  onClose: () => void;
  onDone: (message: string) => void;
}

const bucket = (key: string) =>
  key === 'promote' ? 'Promote' : key.startsWith('move:') ? 'Move campus' : key === 'graduate' ? 'Graduate'
    : key === 'repeat' ? 'Repeat' : 'Leaving';

// Year-end promotion: every current student, grouped by class, with the suggested next
// class pre-selected. The admin can change a whole class or one student before applying.
export default function YearEndPromotionModal({ onClose, onDone }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [numberYear, setNumberYear] = useState<number>(new Date().getFullYear());
  const [acknowledged, setAcknowledged] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    rolloverAPI.promotionPreview()
      .then((res) => {
        const p: Preview = res.data;
        setPreview(p);
        setNumberYear(p.suggestedNumberYear);
        setChoices(Object.fromEntries(p.students.map((s) => [s.studentId, s.defaultKey])));
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load the promotion preview'));
  }, []);

  const classes = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const s of preview?.students ?? []) {
      const k = `${s.campus} ${s.form}`;
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return Array.from(map.entries());
  }, [preview]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const key of Object.values(choices)) t[bucket(key)] = (t[bucket(key)] ?? 0) + 1;
    return t;
  }, [choices]);

  const setClass = (rows: Row[], key: string) =>
    setChoices((prev) => ({ ...prev, ...Object.fromEntries(rows.map((r) => [r.studentId, key])) }));

  const apply = async () => {
    if (!preview) return;
    const n = preview.students.length;
    if (!window.confirm(`Apply year-end promotion to ${n} students?\n\n${Object.entries(totals).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nThis changes each student's class now. Take a database backup first.`)) return;
    setApplying(true);
    setError('');
    try {
      const res = await rolloverAPI.promote({
        schoolId: 1,
        numberYear,
        expectedCount: n,
        acknowledgeIncompleteTerm: acknowledged,
        decisions: preview.students.map((s) => ({ studentId: s.studentId, fromCampus: s.campus, fromForm: s.form, optionKey: choices[s.studentId] })),
      });
      setResult(res.data);
      onDone(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Promotion failed; nothing was changed.');
    } finally {
      setApplying(false);
    }
  };

  const needsAck = (preview?.warnings.length ?? 0) > 0;
  const thisYear = new Date().getFullYear();

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
      onClick={() => !applying && onClose()}>
      <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: 820, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Year-End Promotion</h2>
            <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
              Run once a year, after the last term's report cards are published and before registering students for the new year.
            </p>
          </div>
          <button onClick={onClose} disabled={applying} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '16px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>{error}</div>}

          {result ? (
            <>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>{result.message}</div>
              {result.numberChanges.length > 0 && (
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 6px' }}>New student numbers (campus change)</p>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#475569' }}>
                    {result.numberChanges.map((c) => <li key={c.newNumber}>{c.name}: {c.oldNumber} → {c.newNumber}</li>)}
                  </ul>
                </div>
              )}
              {result.skipped.length > 0 && (
                <p style={{ fontSize: 12, color: '#b45309', margin: 0 }}>{result.skipped.length} student(s) skipped because they changed since the preview.</p>
              )}
              <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>
                Next: create the new term, then use its <strong>Term setup checklist</strong> to register students, copy subjects and generate invoices.
                Students who moved campus need their new subjects added by hand.
              </p>
            </>
          ) : !preview ? (
            !error && <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>Loading current students...</p>
          ) : (
            <>
              {needsAck && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#92400e' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 700, marginBottom: 4 }}><AlertTriangle size={14} /> The current term is not finished</div>
                  <ul style={{ margin: '0 0 6px', paddingLeft: 18 }}>{preview.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
                  Promoting now moves students to their new class on teacher sheets and report cards for the current term.
                  <label style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} /> I understand, promote anyway
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: '#475569' }}>
                <label>
                  Year for new student numbers (campus moves):{' '}
                  <select value={numberYear} onChange={(e) => setNumberYear(Number(e.target.value))} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                    <option value={thisYear}>{thisYear}</option>
                    <option value={thisYear + 1}>{thisYear + 1}</option>
                  </select>
                </label>
                <span>{Object.entries(totals).map(([k, v]) => `${k}: ${v}`).join(' · ')}</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr><th style={{ width: 28 }}></th><th>Class now</th><th>Students</th><th>Action for the whole class</th></tr></thead>
                  <tbody>
                    {classes.map(([cls, rows]) => {
                      const keys = new Set(rows.map((r) => choices[r.studentId]));
                      const classKey = keys.size === 1 ? [...keys][0] : '';
                      const open = expanded[cls];
                      return (
                        <Fragment key={cls}>
                          <tr>
                            <td>
                              <button type="button" onClick={() => setExpanded((p) => ({ ...p, [cls]: !open }))} aria-label={open ? 'Hide students' : 'Show students'}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 0 }}>
                                {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                              </button>
                            </td>
                            <td><strong>{cls}</strong></td>
                            <td>{rows.length}</td>
                            <td>
                              <select value={classKey} onChange={(e) => e.target.value && setClass(rows, e.target.value)}
                                style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #cbd5e1', minWidth: 220 }}>
                                {classKey === '' && <option value="">Mixed (individual choices)</option>}
                                {rows[0].options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                              </select>
                            </td>
                          </tr>
                          {open && rows.map((r) => (
                            <tr key={`${cls}-${r.studentId}`} style={{ background: '#f8fafc' }}>
                              <td></td>
                              <td style={{ fontSize: 12 }}>{r.name}</td>
                              <td style={{ fontSize: 12, fontFamily: 'ui-monospace, monospace' }}>{r.studentNumber}</td>
                              <td>
                                <select value={choices[r.studentId]} onChange={(e) => setChoices((p) => ({ ...p, [r.studentId]: e.target.value }))}
                                  style={{ padding: '3px 6px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12, minWidth: 220 }}>
                                  {r.options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '14px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={applying}>{result ? 'Close' : 'Cancel'}</button>
          {!result && (
            <button className="btn btn-primary" onClick={apply}
              disabled={applying || !preview || preview.students.length === 0 || (needsAck && !acknowledged)}>
              {applying ? 'Applying...' : `Apply to ${preview?.students.length ?? 0} students`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
