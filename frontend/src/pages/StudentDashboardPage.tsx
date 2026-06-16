import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { portalAPI, feesAPI, studentsAPI, announcementsAPI, reportsAPI } from '../services/api';
import { generateReportCard, type ReportCardData } from '../utils/reportCard';
import { generateStatementPdf, buildStatementRows } from '../utils/statement';
import {
  LogOut, GraduationCap, LayoutDashboard, DollarSign,
  FileText, Bell, User, Menu, X, FileDown,
} from 'lucide-react';

type View = 'dashboard' | 'reportCard' | 'fees' | 'announcements' | 'profile';

const NAV: { id: View; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'reportCard', label: 'Report Card', Icon: FileText },
  { id: 'fees', label: 'Financial Statement', Icon: DollarSign },
  { id: 'announcements', label: 'Announcements', Icon: Bell },
  { id: 'profile', label: 'My Profile', Icon: User },
];

const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '—' : String(v));
const fmtAmt = (v: any) => `$${Number(v ?? 0).toLocaleString()}`;

export default function StudentDashboardPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [fullProfile, setFullProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Report card tab state
  const [terms, setTerms] = useState<any[]>([]);
  const [reportTermId, setReportTermId] = useState<number | ''>('');
  const [reportCard, setReportCard] = useState<ReportCardData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportNotFound, setReportNotFound] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);

  const studentInfo = JSON.parse(localStorage.getItem('student_info') || '{}');
  const studentId: number | undefined = studentInfo?.id ?? studentInfo?.studentId;
  const studentCampus = studentInfo?.campus || (studentInfo?.studentNumber || '').split('/')[0];

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    feesAPI.getTerms(1).then(res => {
      const data: any[] = res.data || [];
      setTerms(data);
      const active = data.find(t => t.isActive) ?? data[0];
      if (active) setReportTermId(active.id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!reportTermId || !studentId) { setReportCard(null); return; }
    loadReportCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportTermId, studentId]);

  useEffect(() => {
    if (view !== 'announcements') return;
    setAnnouncementsLoading(true);
    announcementsAPI.getAll(1, studentCampus || undefined)
      .then(res => setAnnouncements(res.data || []))
      .catch(() => {})
      .finally(() => setAnnouncementsLoading(false));
  }, [view]);

  const loadData = async () => {
    try {
      const dashRes = await portalAPI.getDashboard(studentId ?? 1);
      setDashboard(dashRes.data);
      if (studentId) {
        await Promise.allSettled([
          feesAPI.getStudentInvoices(studentId).then(r => setAllInvoices(r.data || [])),
          studentsAPI.getById(studentId).then(r => setFullProfile(r.data)),
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadReportCard = async () => {
    if (!studentId || !reportTermId) return;
    setReportLoading(true);
    setReportCard(null);
    setReportNotFound(false);
    try {
      const res = await reportsAPI.getStudentView(studentId, reportTermId as number);
      setReportCard(res.data as ReportCardData);
    } catch (err: any) {
      if (err?.response?.status === 404) setReportNotFound(true);
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportCard) return;
    setDownloadingPdf(true);
    try {
      await generateReportCard(reportCard);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_info');
    navigate('/student-login');
  };

  const handleNav = (v: View) => { setView(v); setSidebarOpen(false); };

  const student = dashboard?.student ?? studentInfo;
  const invoice = dashboard?.latestInvoice;
  const firstName = student?.firstName ?? '';
  const surname = student?.surname ?? '';
  const initials = `${firstName[0] ?? ''}${surname[0] ?? ''}`.toUpperCase();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const statusPill = (status: string) =>
    status === 'Paid' ? 'pill-success' : status === 'PartiallyPaid' ? 'pill-warning' : 'pill-danger';

  const selectedReportTerm = terms.find(t => t.id === reportTermId);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <GraduationCap size={36} style={{ color: '#1a237e', margin: '0 auto 12px' }} />
          <p style={{ color: '#475569', fontSize: '14px' }}>Loading your portal...</p>
        </div>
      </div>
    );
  }

  // ── Sidebar ──────────────────────────────────────────────────
  const Sidebar = (
    <aside style={{ width: 260, background: '#1a237e', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={16} color="white" />
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 13, margin: 0 }}>LeeTec SMS</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0 }}>Student Portal</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'white', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ color: 'white', fontWeight: 600, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {firstName} {surname}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: '2px 0 0', fontFamily: 'ui-monospace, monospace' }}>
              {student?.studentNumber ?? '—'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{student?.form}</span>
              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: student?.status === 'Active' ? '#22c55e' : '#ef4444', color: 'white', fontWeight: 600 }}>
                {student?.status ?? 'Active'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px 8px' }}>Menu</p>
        {NAV.map(({ id, label, Icon }) => {
          const active = view === id;
          return (
            <button key={id} onClick={() => handleNav(id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', background: active ? 'rgba(255,255,255,0.15)' : 'transparent', color: active ? 'white' : 'rgba(255,255,255,0.65)', fontWeight: active ? 600 : 400, fontSize: 13 }}>
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500 }}>
          <LogOut size={14} />Sign Out
        </button>
      </div>
    </aside>
  );

  // ── Dashboard view ────────────────────────────────────────────
  const DashboardView = (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', margin: 0 }}>{greeting}, {firstName}!</h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>Here's a summary of your account.</p>
      </div>
      {invoice && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Balance Due', value: fmtAmt(invoice.balance), color: Number(invoice.balance) > 0 ? '#dc2626' : '#15803d', bg: Number(invoice.balance) > 0 ? '#fef2f2' : '#f0fdf4' },
            { label: 'Amount Paid', value: fmtAmt(invoice.amountPaid), color: '#15803d', bg: '#f0fdf4' },
            { label: 'Total Invoiced', value: fmtAmt(invoice.totalAmount), color: '#1a237e', bg: '#eef2ff' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: 'white', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <DollarSign size={15} color={color} />
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0 }}>{value}</p>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{label}</p>
            </div>
          ))}
        </div>
      )}
      {invoice ? (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>Latest Invoice</h3>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0', fontFamily: 'ui-monospace, monospace' }}>{invoice.invoiceNumber}</p>
            </div>
            <span className={`pill ${statusPill(invoice.status)}`}>{invoice.status === 'PartiallyPaid' ? 'Partially Paid' : invoice.status}</span>
          </div>
          {invoice.items?.length > 0 && (
            <div style={{ padding: '0 20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 0 8px', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>Description</th>
                    <th style={{ textAlign: 'right', padding: '10px 0 8px', color: '#64748b', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item: any, i: number) => (
                    <tr key={item.id ?? i}>
                      <td style={{ padding: '8px 0', borderBottom: '1px solid #f8fafc' }}>{item.description ?? item.category?.name ?? `Item ${i + 1}`}</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid #f8fafc' }}>{fmtAmt(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
            {[['Total Amount', fmtAmt(invoice.totalAmount), false], ['Amount Paid', fmtAmt(invoice.amountPaid), false], ['Balance Due', fmtAmt(invoice.balance), true]].map(([label, value, bold]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>{label as string}</span>
                <strong style={{ color: (bold && Number(invoice.balance) > 0) ? '#dc2626' : bold ? '#15803d' : '#0f172a' }}>{value as string}</strong>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>No invoice found for the current term.</div>
      )}
    </div>
  );

  // ── Report Card view ──────────────────────────────────────────
  const ReportCardView = (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>Report Card</h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: '3px 0 0' }}>View your academic results by term</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, background: 'white', cursor: 'pointer' }}
            value={reportTermId}
            onChange={e => setReportTermId(Number(e.target.value))}
          >
            <option value="">Select term</option>
            {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.year}</option>)}
          </select>
          {reportCard && (
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#1a237e', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              <FileDown size={14} />
              {downloadingPdf ? 'Generating...' : 'Download PDF'}
            </button>
          )}
        </div>
      </div>

      {!reportTermId ? (
        <div style={{ background: 'white', borderRadius: 12, padding: '50px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
          Select a term above to view your report card.
        </div>
      ) : reportLoading ? (
        <div style={{ background: 'white', borderRadius: 12, padding: '50px', textAlign: 'center', color: '#475569', fontSize: 13 }}>Loading report card...</div>
      ) : reportNotFound || !reportCard ? (
        <div style={{ background: 'white', borderRadius: 12, padding: '50px', textAlign: 'center' }}>
          <FileText size={36} style={{ color: '#94a3b8', marginBottom: 12 }} />
          <h3 style={{ fontWeight: 700, fontSize: 15, margin: '0 0 8px', color: '#0f172a' }}>Not Yet Published</h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Your {selectedReportTerm ? `${selectedReportTerm.name} ${selectedReportTerm.year}` : 'selected term'} report card is being processed. Please check back soon.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Header card */}
          <div style={{ background: '#1a237e', borderRadius: 12, padding: '20px 24px', color: 'white' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              {reportCard.student.campus === 'AHJ' ? 'ADVENT HOPE JUNIOR SCHOOL' : 'ADVENT HOPE ACADEMY'}
            </p>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>
              {reportCard.student.firstName} {reportCard.student.surname}
            </h2>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, opacity: 0.85 }}>
              <span><strong>Form:</strong> {reportCard.student.form || '—'}</span>
              <span><strong>Term:</strong> {reportCard.term.name} {reportCard.term.year}</span>
              <span><strong>Student No:</strong> {reportCard.student.studentNumber}</span>
              <span><strong>Curriculum:</strong> {reportCard.gradingCurriculum}</span>
            </div>
          </div>

          {/* Subject results */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Subject Results</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#1a237e' }}>
                    {['Subject', 'Paper 1', 'Paper 2', 'Total', 'CM', 'Band / Grade', 'Comments'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Subject' ? 'left' : 'center', color: 'white', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportCard.subjects.map((s, i) => {
                    const block = s.noTerminalExam ? s.midterm : s.endTerm;
                    const comments = (s.noTerminalExam ? s.midterm?.comments : s.endTerm?.comments) || '—';
                    const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
                    return (
                      <tr key={s.subjectId} style={{ background: rowBg }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>
                          {s.name}
                          {s.noTerminalExam && <span style={{ fontSize: 10, color: '#64748b', fontWeight: 400, marginLeft: 6 }}>(No Terminal Exam)</span>}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>{fmt(block?.paper1)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>{fmt(block?.paper2)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>{fmt(block?.total)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#1a237e' }}>{fmt(s.cm)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span style={{ padding: '2px 10px', borderRadius: 12, background: '#eef2ff', color: '#1a237e', fontWeight: 700, fontSize: 12 }}>
                            {s.grade || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 12 }}>{comments}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grade reference */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                {reportCard.gradingCurriculum} — Grading Reference
              </h3>
            </div>
            <div style={{ padding: '0 18px 12px' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 12, marginTop: 12 }}>
                <thead>
                  <tr style={{ background: '#1a237e' }}>
                    {['Score Range', 'Performance Band'].map(h => (
                      <th key={h} style={{ padding: '7px 24px', color: 'white', fontWeight: 600, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportCard.gradingCurriculum === 'Cambridge Checkpoint' ? (
                    [['0', 'Unclassified'], ['1–10', 'Basic'], ['11–20', 'Aspiring'], ['21–30', 'Good'], ['31–40', 'High'], ['41–50', 'Outstanding']].map(([range, band], i) => (
                      <tr key={range} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '6px 24px', textAlign: 'center', color: '#475569' }}>{range}</td>
                        <td style={{ padding: '6px 24px', textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>{band}</td>
                      </tr>
                    ))
                  ) : (
                    [['75–100', 'A'], ['60–74', 'B'], ['50–59', 'C'], ['45–49', 'D'], ['35–44', 'E'], ['0–34', 'U']].map(([range, grade], i) => (
                      <tr key={range} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '6px 24px', textAlign: 'center', color: '#475569' }}>{range}%</td>
                        <td style={{ padding: '6px 24px', textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>{grade}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: 0 }}>
            This is a computer generated report card. Download the PDF for the official formatted version.
          </p>
        </div>
      )}
    </div>
  );

  // ── Financial Statement view ──────────────────────────────────
  const totalCharged = allInvoices.reduce((s, inv) => s + Number(inv.totalAmount ?? 0), 0);
  const totalPaid = allInvoices.reduce((s, inv) => s + Number(inv.amountPaid ?? 0), 0);
  const totalOutstanding = allInvoices.reduce((s, inv) => s + Number(inv.balance ?? 0), 0);
  const statementRows = buildStatementRows(allInvoices);

  const handleDownloadStatement = () => {
    const s = fullProfile || student;
    if (!s) return;
    generateStatementPdf(
      { firstName: s.firstName || '', surname: s.surname || '', studentNumber: s.studentNumber || '', form: s.form || '' },
      buildStatementRows(allInvoices)
    );
  };

  const FeesView = (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>Financial Statement</h1>
        {allInvoices.length > 0 && (
          <button onClick={handleDownloadStatement} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#1a237e', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <FileDown size={14} /> Download Statement PDF
          </button>
        )}
      </div>

      {/* Summary totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total Charged', value: fmtAmt(totalCharged), color: '#1a237e', bg: '#eef2ff' },
          { label: 'Total Paid', value: fmtAmt(totalPaid), color: '#15803d', bg: '#f0fdf4' },
          { label: 'Outstanding', value: fmtAmt(totalOutstanding), color: totalOutstanding > 0 ? '#dc2626' : '#15803d', bg: totalOutstanding > 0 ? '#fef2f2' : '#f0fdf4' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <DollarSign size={14} color={color} />
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color, margin: 0 }}>{value}</p>
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{label}</p>
          </div>
        ))}
      </div>

      {statementRows.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 12, padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>No invoices found.</div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#1a237e' }}>
                {['Date', 'Description', 'Charge', 'Payment', 'Running Balance'].map((h) => (
                  <th key={h} style={{ padding: '11px 12px', textAlign: h === 'Description' ? 'left' : 'right', color: 'white', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statementRows.map((row, index) => {
                const isPayment = Number(row.payment) > 0;
                const isCharge = Number(row.charge) > 0;
                return (
                  <tr key={`${row.date}-${row.desc}-${index}`} style={{ background: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '10px 12px', color: '#475569', whiteSpace: 'nowrap', textAlign: 'right' }}>{row.date ? new Date(row.date).toLocaleDateString('en-GB') : '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#0f172a' }}>{row.desc}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: isCharge ? '#dc2626' : '#94a3b8', fontWeight: isCharge ? 700 : 400 }}>{isCharge ? fmtAmt(row.charge) : '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: isPayment ? '#15803d' : '#94a3b8', fontWeight: isPayment ? 700 : 400 }}>{isPayment ? fmtAmt(row.payment) : '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: Number(row.balance) > 0 ? '#dc2626' : '#15803d' }}>{fmtAmt(row.balance)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const getAnnouncementBadge = (campus: string) => {
    if (campus === 'AHJ') return { bg: '#dbeafe', color: '#1d4ed8' };
    if (campus === 'AHA') return { bg: '#dcfce7', color: '#15803d' };
    if (campus === 'AHS') return { bg: '#fef9c3', color: '#854d0e' };
    return { bg: '#f1f5f9', color: '#475569' };
  };

  const AnnouncementsView = (
    <div style={{ padding: '28px 32px', maxWidth: 860 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 20px' }}>Announcements</h1>
      {announcementsLoading ? (
        <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 12, padding: '60px 40px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ width: 56, height: 56, background: '#eef2ff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Bell size={24} color="#1a237e" />
          </div>
          <h3 style={{ fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>No Announcements</h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>No announcements at this time.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {announcements.map((a: any) => {
            const badge = getAnnouncementBadge(a.targetCampus);
            return (
              <div key={a.id} style={{ background: 'white', borderRadius: 12, padding: '18px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{a.title}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 600, background: badge.bg, color: badge.color }}>
                    {a.targetCampus === 'All' ? 'All Campuses' : a.targetCampus}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: '#475569', margin: '0 0 8px', lineHeight: 1.6 }}>{a.content}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
                  {new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const p = fullProfile || student;

  const ProfileField = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <p style={{ color: '#64748b', margin: 0, marginBottom: 3, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</p>
      <p style={{ fontWeight: 600, color: '#0f172a', margin: 0, fontSize: 13 }}>{value || '—'}</p>
    </div>
  );

  const ProfileSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</p>
      </div>
      <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px 24px' }}>
        {children}
      </div>
    </div>
  );

  const guardians: any[] = p?.guardians ?? [];
  const contacts: any[] = p?.emergencyContacts ?? [];
  const family: any = p?.family ?? null;

  const ProfileView = (
    <div style={{ padding: '28px 32px', maxWidth: 860 }}>
      <div style={{ background: '#1a237e', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: 'white', flexShrink: 0 }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: 'white', fontWeight: 700, fontSize: 20, margin: '0 0 4px' }}>{firstName} {surname}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'ui-monospace, monospace' }}>{p?.studentNumber}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>·</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{p?.form}</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: p?.status === 'Active' ? '#22c55e' : '#ef4444', color: 'white' }}>{p?.status ?? 'Active'}</span>
          </div>
        </div>
      </div>
      <ProfileSection title="Personal Details">
        <ProfileField label="First Name" value={p?.firstName} />
        <ProfileField label="Surname" value={p?.surname} />
        <ProfileField label="Gender" value={p?.gender} />
        <ProfileField label="Date of Birth" value={p?.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : null} />
        <ProfileField label="Birth Certificate No." value={p?.birthCertificateNo} />
        <ProfileField label="Race" value={p?.race} />
        <ProfileField label="Denomination" value={p?.denomination} />
        <ProfileField label="Email" value={p?.email} />
      </ProfileSection>
      <ProfileSection title="School Information">
        <ProfileField label="Form" value={p?.form} />
        <ProfileField label="Date of Entry" value={p?.dateOfEntry ? new Date(p.dateOfEntry).toLocaleDateString() : null} />
        <ProfileField label="Previous School" value={p?.previousSchool} />
        <ProfileField label="Student Number" value={p?.studentNumber} />
        <ProfileField label="Status" value={p?.status} />
        {p?.otherInformation && <ProfileField label="Other Information" value={p.otherInformation} />}
      </ProfileSection>
      <ProfileSection title="Medical Information">
        <ProfileField label="Medical Aid Society" value={p?.medicalAidSociety} />
        <ProfileField label="Medical Aid No." value={p?.medicalAidNo} />
        <ProfileField label="Family Doctor" value={p?.familyDoctorName} />
        <ProfileField label="Doctor Phone" value={p?.familyDoctorPhone} />
        <ProfileField label="Allergies" value={p?.allergies} />
      </ProfileSection>
      {family && (
        <ProfileSection title="Family Details">
          <ProfileField label="Home Address" value={family.homeAddress} />
          <ProfileField label="Home Telephone" value={family.homeTelephone} />
          <ProfileField label="Home Language" value={family.homeLanguage} />
          <ProfileField label="Religion" value={family.religion} />
          <ProfileField label="Marital Status" value={family.maritalStatus} />
        </ProfileSection>
      )}
      {guardians.length > 0 && guardians.map((g: any, i: number) => (
        <div key={i} style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{g.guardianType ?? (i === 0 ? 'Father / Guardian' : 'Mother / Guardian')}</p>
          </div>
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '18px 24px' }}>
            <ProfileField label="Full Name" value={`${g.title ?? ''} ${g.firstName ?? ''} ${g.surname ?? ''}`.trim()} />
            <ProfileField label="Phone" value={g.phone} />
            <ProfileField label="Email" value={g.email} />
            <ProfileField label="Occupation" value={g.occupation} />
            <ProfileField label="Address" value={g.address} />
          </div>
        </div>
      ))}
      {contacts.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Emergency Contacts</p>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {contacts.map((c: any, i: number) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 24px', paddingBottom: i < contacts.length - 1 ? 16 : 0, borderBottom: i < contacts.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <ProfileField label={`Contact ${i + 1} — Name`} value={c.name} />
                <ProfileField label="Phone" value={c.phone} />
                <ProfileField label="Relationship" value={c.relationship} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── Shell ─────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
      {sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 40 }} onClick={() => setSidebarOpen(false)} />}

      <div style={{ display: 'none' }} className="portal-sidebar-desktop">{Sidebar}</div>

      <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.25s ease', display: 'flex' }}>
        {Sidebar}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: '#1a237e', flexShrink: 0 }} className="portal-topbar">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', padding: 4, display: 'flex' }}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GraduationCap size={15} color="white" />
            <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>LeeTec SMS</span>
          </div>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>{initials}</div>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {view === 'dashboard' && DashboardView}
          {view === 'reportCard' && ReportCardView}
          {view === 'fees' && FeesView}
          {view === 'announcements' && AnnouncementsView}
          {view === 'profile' && ProfileView}
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .portal-sidebar-desktop { display: flex !important; }
          .portal-topbar { display: none !important; }
          div[style*="position: fixed"][style*="left: 0"] { display: none !important; }
        }
      `}</style>
    </div>
  );
}
