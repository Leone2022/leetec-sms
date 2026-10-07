import { useEffect, useState } from 'react';
import { CheckCircle, Circle, Users, BookCopy, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import { rolloverAPI } from '../services/api';

interface TermStatus {
  termName: string;
  currentStudents: number;
  registered: number;
  notRegistered: number;
  registeredWithoutSubjects: number;
  registeredNotInvoiced: number;
}

interface Props {
  termId: number;
  refreshKey: number;
  onRegisterAll: () => void;
  onCopySubjects: () => void;
}

// "Is this term ready?" — the new-term steps in order, each with what is left to do.
export default function TermChecklist({ termId, refreshKey, onRegisterAll, onCopySubjects }: Props) {
  const [status, setStatus] = useState<TermStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    rolloverAPI.termStatus(termId)
      .then((res) => { if (!cancelled) setStatus(res.data); })
      .catch(() => { if (!cancelled) setStatus(null); });
    return () => { cancelled = true; };
  }, [termId, refreshKey]);

  if (!status) return null;

  const steps = [
    {
      done: status.notRegistered === 0,
      title: 'Register current students',
      detail: status.notRegistered === 0
        ? `All ${status.registered} current students are registered.`
        : `${status.notRegistered} of ${status.currentStudents} current students are not registered yet.`,
      action: status.notRegistered > 0 && (
        <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={onRegisterAll}>
          <Users size={13} /> Register all {status.notRegistered}
        </button>
      ),
    },
    {
      done: status.registered > 0 && status.registeredWithoutSubjects === 0,
      title: 'Subjects for the term',
      detail: status.registeredWithoutSubjects === 0
        ? (status.registered > 0 ? 'Every registered student has subjects, so teacher sheets will list them.' : 'Register students first.')
        : `${status.registeredWithoutSubjects} registered student(s) have no subjects; they will be missing from teacher sheets.`,
      action: status.registeredWithoutSubjects > 0 && (
        <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={onCopySubjects}>
          <BookCopy size={13} /> Copy subjects
        </button>
      ),
    },
    {
      done: status.registered > 0 && status.registeredNotInvoiced === 0,
      title: 'Invoices',
      detail: status.registeredNotInvoiced === 0
        ? (status.registered > 0 ? 'Every registered student has an invoice for this term.' : 'Register students first.')
        : `${status.registeredNotInvoiced} registered student(s) have no invoice for this term.`,
      action: status.registeredNotInvoiced > 0 && (
        <Link to="/fees" className="btn btn-secondary" style={{ fontSize: 12 }}>
          <Receipt size={13} /> Go to Fees to generate
        </Link>
      ),
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', margin: '0 0 16px', background: '#f8fafc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <strong style={{ fontSize: 13, color: '#0f172a' }}>Term setup checklist</strong>
        <span style={{ fontSize: 12, color: doneCount === steps.length ? '#15803d' : '#b45309', fontWeight: 600 }}>
          {doneCount} of {steps.length} done
        </span>
      </div>
      {steps.map((s) => (
        <div key={s.title} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid #eef2f7' }}>
          {s.done ? <CheckCircle size={16} color="#15803d" /> : <Circle size={16} color="#b45309" />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{s.title}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{s.detail}</div>
          </div>
          {s.action}
        </div>
      ))}
    </div>
  );
}
