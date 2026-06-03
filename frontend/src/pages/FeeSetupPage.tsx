import { useState, useEffect } from 'react';
import { feesAPI, studentsAPI, termRegistrationsAPI } from '../services/api';
import {
  Building2, Users, CreditCard, Plus, Trash2, Download, Zap,
  Search, X, CheckCircle, AlertTriangle, ChevronDown, ChevronRight, Printer,
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = 'structure' | 'charge' | 'payment';
type ChargeStep = 'filter' | 'review' | 'done';
interface StructItem { catId: number; amount: string; }

// ── Constants ──────────────────────────────────────────────────────────────────
const CAMPUSES = [
  { code: 'AHJ', name: 'Advent Hope Junior', desc: 'Primary School' },
  { code: 'AHA', name: 'Advent Hope Academy', desc: 'Secondary — O Level' },
  { code: 'AHS', name: 'Advent Hope Senior', desc: 'A Level' },
];

const DEFAULT_LINES: Record<string, { name: string; amount: number }[]> = {
  'AHJ-Day': [
    { name: 'Tuition Fee', amount: 400 },
    { name: 'Administration Fee', amount: 50 },
    { name: 'School Development Fee', amount: 50 },
  ],
  'AHJ-Boarding': [
    { name: 'Tuition & Boarding', amount: 1200 },
    { name: 'Administration Fee', amount: 50 },
    { name: 'Lab Fee', amount: 50 },
  ],
  'AHA-Day': [
    { name: 'Tuition Fee', amount: 450 },
    { name: 'Administration Fee', amount: 50 },
    { name: 'Lab Fee', amount: 30 },
    { name: 'School Development Fee', amount: 50 },
  ],
  'AHA-Boarding': [
    { name: 'Tuition & Boarding', amount: 1150 },
    { name: 'Administration Fee', amount: 50 },
    { name: 'Lab Fee', amount: 30 },
  ],
  'AHS-Day': [
    { name: 'Tuition Fee', amount: 500 },
    { name: 'Administration Fee', amount: 50 },
    { name: 'Lab Fee', amount: 50 },
    { name: 'School Development Fee', amount: 50 },
  ],
  'AHS-Boarding': [
    { name: 'Tuition & Boarding', amount: 1200 },
    { name: 'Administration Fee', amount: 50 },
    { name: 'Lab Fee', amount: 50 },
  ],
};

const todayISO = () => new Date().toISOString().split('T')[0];

export default function FeeSetupPage() {
  // ── Shared ─────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('structure');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [terms, setTerms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [activeTerm, setActiveTerm] = useState<any>(null);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // ── Tab 1: Fee Structure ────────────────────────────────────────────────────
  const [structs, setStructs] = useState<Record<string, StructItem[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['AHJ-Day', 'AHA-Day', 'AHS-Day']));
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [unlockedKeys, setUnlockedKeys] = useState<Set<string>>(new Set());
  const [unlockDialogKey, setUnlockDialogKey] = useState<string | null>(null);
  const [unlockInput, setUnlockInput] = useState('');
  const [termInvoiceCount, setTermInvoiceCount] = useState(0);

  // ── Tab 2: Email ────────────────────────────────────────────────────────────
  const [emailingSending, setEmailingSending] = useState(false);

  // ── Tab 2: Charge Students ──────────────────────────────────────────────────
  const [chargeStep, setChargeStep] = useState<ChargeStep>('filter');
  const [chargeTermId, setChargeTermId] = useState<number | ''>('');
  const [chargeCampus, setChargeCampus] = useState('All');
  const [chargeType, setChargeType] = useState('All');
  const [chargeStudents, setChargeStudents] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Tab 3: Record Payment ───────────────────────────────────────────────────
  const [paySearch, setPaySearch] = useState('');
  const [payStudent, setPayStudent] = useState<any>(null);
  const [payInvoices, setPayInvoices] = useState<any[]>([]);
  const [payLoading, setPayLoading] = useState(false);
  const [selectedInvId, setSelectedInvId] = useState<number | null>(null);
  const [payForm, setPayForm] = useState({
    amount: '', method: 'Cash', reference: '', date: todayISO(),
  });
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [paySuccess, setPaySuccess] = useState<any>(null);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [termsRes, catsRes, studRes] = await Promise.all([
        feesAPI.getTerms(1),
        feesAPI.getCategories(1),
        studentsAPI.getAll(1),
      ]);
      const termData: any[] = termsRes.data || [];
      const catData: any[] = catsRes.data || [];
      setTerms(termData);
      setCategories(catData);
      setAllStudents(studRes.data || []);
      const active = termData.find((t) => t.isActive) ?? null;
      setActiveTerm(active);
      if (active) {
        const [pkgRes, invRes] = await Promise.all([
          feesAPI.getPackages(active.id),
          feesAPI.getTermInvoices(1, active.id).catch(() => ({ data: { summary: { totalInvoices: 0 } } })),
        ]);
        setPackages(pkgRes.data || []);
        setTermInvoiceCount((invRes.data as any)?.summary?.totalInvoices ?? 0);
      }
      initStructs(catData);
    } catch (err) {
      console.error(err);
      showMsg('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const initStructs = (cats: any[]) => {
    const find = (name: string) =>
      cats.find((c: any) => c.name.toLowerCase() === name.toLowerCase())?.id ?? 0;
    const resolved: Record<string, StructItem[]> = {};
    for (const [key, lines] of Object.entries(DEFAULT_LINES)) {
      resolved[key] = lines.map((l) => ({ catId: find(l.name), amount: String(l.amount) }));
    }
    setStructs(resolved);
  };

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const getCategoryId = (name: string) => {
    const cat = categories.find((c: any) => c.name.toLowerCase() === name.toLowerCase());
    return cat?.id || 0;
  };

  // ── Tab 1 helpers ──────────────────────────────────────────────────────────
  const structTotal = (key: string) =>
    (structs[key] || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const updateItem = (key: string, idx: number, field: keyof StructItem, val: string | number) => {
    setStructs((prev) => ({
      ...prev,
      [key]: prev[key].map((item, i) => i === idx ? { ...item, [field]: val } : item),
    }));
  };

  const addItem = (key: string) => {
    setStructs((prev) => ({ ...prev, [key]: [...(prev[key] || []), { catId: 0, amount: '' }] }));
  };

  const removeItem = (key: string, idx: number) => {
    setStructs((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));
  };

  const handleSaveStructure = async (key: string) => {
    if (!activeTerm) { showMsg('No active term. Activate a term first.', 'error'); return; }
    const [campus, type] = key.split('-');
    const items = structs[key] || [];
    const valid = items.filter((i) => i.catId > 0 && Number(i.amount) > 0);
    if (valid.length === 0) { showMsg('Add at least one complete line item', 'error'); return; }
    setSavingKey(key);
    const pkgName = `${campus} ${type} Package`;
    const existing = packages.find((p) => p.name === pkgName);
    try {
      if (existing) {
        const payload = {
          name: pkgName,
          studentType: type,
          items: valid.map((i) => ({ categoryId: i.catId, amount: Number(i.amount) })),
        };
        console.log('Saving package:', payload);
        await feesAPI.updatePackage(existing.id, payload);
      } else {
        const payload = {
          termId: activeTerm.id,
          schoolId: 1,
          name: pkgName,
          studentType: type,
          campus,
          items: valid.map((i) => ({ categoryId: i.catId, amount: Number(i.amount) })),
        };
        console.log('Saving package:', payload);
        await feesAPI.createPackage(payload);
      }
      showMsg(`${pkgName} saved`, 'success');
      const res = await feesAPI.getPackages(activeTerm.id);
      setPackages(res.data || []);
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Failed to save', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const handleUnlock = (key: string) => {
    setUnlockDialogKey(key);
    setUnlockInput('');
  };

  const confirmUnlock = () => {
    if (unlockInput.trim().toUpperCase() !== 'CONFIRM') {
      showMsg('You must type CONFIRM to unlock', 'error');
      return;
    }
    setUnlockedKeys((prev) => new Set([...prev, unlockDialogKey!]));
    setUnlockDialogKey(null);
    setUnlockInput('');
  };

  const handleEmailInvoices = async () => {
    setEmailingSending(true);
    try {
      const res = await feesAPI.sendBulkInvoiceEmails({ schoolId: 1, termId: chargeTermId });
      showMsg(res.data.message, 'success');
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Failed to send emails', 'error');
    } finally {
      setEmailingSending(false);
    }
  };

  const downloadFeeStructurePDF = (campusCode: string) => {
    const info = CAMPUSES.find((c) => c.code === campusCode);
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(26, 35, 126);
    doc.text('Advent Hope Schools', 105, 18, { align: 'center' });
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(`${info?.name} — ${info?.desc}`, 105, 27, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(activeTerm ? `${activeTerm.name} Fee Structure` : 'Fee Structure', 105, 34, { align: 'center' });
    doc.line(20, 38, 190, 38);
    let y = 44;
    for (const type of ['Day', 'Boarding']) {
      const key = `${campusCode}-${type}`;
      const items = structs[key] || [];
      if (items.length === 0) continue;
      const rows = items.map((item) => {
        const cat = categories.find((c: any) => c.id === item.catId);
        return [cat?.name || '—', `$${Number(item.amount).toLocaleString()}`];
      });
      const total = structTotal(key);
      autoTable(doc, {
        startY: y,
        head: [[`${type} Scholar Fees`, 'Amount']],
        body: [...rows, [{ content: 'TOTAL', styles: { fontStyle: 'bold' } }, { content: `$${total.toLocaleString()}`, styles: { fontStyle: 'bold' } }]],
        theme: 'striped',
        headStyles: { fillColor: [26, 35, 126] },
        styles: { fontSize: 10 },
        columnStyles: { 1: { halign: 'right', cellWidth: 40 } },
      });
      y = (doc as any).lastAutoTable.finalY + 12;
    }
    doc.save(`${campusCode.toLowerCase()}-fees.pdf`);
  };

  // ── Tab 2 helpers ──────────────────────────────────────────────────────────
  const getPkgTotal = (pkg: any) => {
    if (pkg?.totalAmount > 0) return pkg.totalAmount;
    return (pkg?.items || []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
  };

  const getStudentPkg = (reg: any) => {
    const type = chargeType === 'All' ? 'Day' : chargeType;
    return packages.find((p) => p.name === `${reg.campus} ${type} Package`);
  };

  const handleLoadStudents = async () => {
    if (!chargeTermId) { showMsg('Select a term first', 'error'); return; }
    setLoadingStudents(true);
    try {
      const res = await termRegistrationsAPI.getDashboard(Number(chargeTermId));
      let regs: any[] = res.data?.registrations || [];
      if (chargeCampus !== 'All') regs = regs.filter((r: any) => r.campus === chargeCampus);
      setChargeStudents(regs);
      setSelectedIds(new Set(regs.map((r: any) => r.id)));
      setChargeStep('review');
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Failed to load students', 'error');
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleAll = () => {
    setSelectedIds(selectedIds.size === chargeStudents.length
      ? new Set()
      : new Set(chargeStudents.map((r) => r.id)));
  };

  const chargeTotal = chargeStudents
    .filter((r) => selectedIds.has(r.id))
    .reduce((s, r) => s + getPkgTotal(getStudentPkg(r)), 0);

  const handleGenerateInvoices = async () => {
    setGenerating(true);
    setShowConfirm(false);
    try {
      const res = await feesAPI.generateInvoices({ schoolId: 1, termId: chargeTermId });
      setGenResult(res.data);
      setChargeStep('done');
      showMsg('Invoices generated successfully', 'success');
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Failed to generate invoices', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // ── Tab 3 helpers ──────────────────────────────────────────────────────────
  const paySearchResults = paySearch.trim().length >= 2
    ? allStudents.filter((s: any) =>
        `${s.firstName} ${s.surname} ${s.studentNumber}`.toLowerCase().includes(paySearch.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleSelectPayStudent = async (student: any) => {
    setPayStudent(student);
    setPaySearch('');
    setPaySuccess(null);
    setPayLoading(true);
    try {
      const res = await feesAPI.getStudentInvoices(student.id);
      const invs: any[] = res.data || [];
      setPayInvoices(invs);
      const first = invs.find((i: any) => i.status !== 'Paid') ?? invs[0] ?? null;
      setSelectedInvId(first?.id ?? null);
    } catch (err) {
      showMsg('Failed to load invoices', 'error');
    } finally {
      setPayLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvId) { showMsg('Select an invoice', 'error'); return; }
    if (!payForm.amount || Number(payForm.amount) <= 0) { showMsg('Enter a valid amount', 'error'); return; }
    setPaySubmitting(true);
    try {
      await feesAPI.postPayment({
        invoiceId: selectedInvId,
        amount: Number(payForm.amount),
        paymentMethod: payForm.method,
        referenceNumber: payForm.reference,
        paymentDate: payForm.date,
      });
      setPaySuccess({ student: payStudent, form: { ...payForm } });
      showMsg('Payment recorded successfully', 'success');
      const res = await feesAPI.getStudentInvoices(payStudent.id);
      setPayInvoices(res.data || []);
      setPayForm((p) => ({ ...p, amount: '', reference: '' }));
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Failed to record payment', 'error');
    } finally {
      setPaySubmitting(false);
    }
  };

  const printReceipt = () => {
    if (!paySuccess) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(26, 35, 126);
    doc.text('Advent Hope Schools', 105, 18, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('OFFICIAL PAYMENT RECEIPT', 105, 28, { align: 'center' });
    doc.line(20, 33, 190, 33);
    autoTable(doc, {
      startY: 38,
      body: [
        ['Student Name', `${paySuccess.student.firstName} ${paySuccess.student.surname}`],
        ['Student Number', paySuccess.student.studentNumber],
        ['Form / Class', paySuccess.student.form],
        ['Amount Paid', `$${Number(paySuccess.form.amount).toLocaleString()}`],
        ['Payment Method', paySuccess.form.method],
        ['Reference Number', paySuccess.form.reference || '—'],
        ['Payment Date', paySuccess.form.date],
      ],
      theme: 'plain',
      styles: { fontSize: 11, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    });
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Thank you for your payment. Please retain this receipt for your records.', 105, finalY, { align: 'center' });
    doc.save(`receipt-${paySuccess.student.studentNumber}.pdf`);
  };

  // ── Derived / balances ─────────────────────────────────────────────────────
  const totalCharged = payInvoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const totalPaid = payInvoices.reduce((s, i) => s + Number(i.amountPaid || 0), 0);
  const outstanding = totalCharged - totalPaid;

  // ── Styles ──────────────────────────────────────────────────────────────────
  const fld = { paddingLeft: '12px', paddingRight: '12px' };
  const lbl: React.CSSProperties = { fontSize: '12px', fontWeight: '600', color: '#0f172a', display: 'block', marginBottom: '5px' };
  const secHead: React.CSSProperties = { fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' };

  const TABS = [
    { id: 'structure' as Tab, label: 'Fee Structure', Icon: Building2 },
    { id: 'charge' as Tab, label: 'Charge Students', Icon: Users },
    { id: 'payment' as Tab, label: 'Record Payment', Icon: CreditCard },
  ];

  return (
    <AdminLayout title="Fee Management" subtitle="Structure · Billing · Payments">

      {/* ── Toast ── */}
      {message && (
        <div style={{
          position: 'fixed', top: 80, right: 20, padding: '14px 18px', borderRadius: '10px',
          background: message.type === 'success' ? '#0ea5e9' : '#dc2626',
          color: 'white', fontSize: '13px', fontWeight: '500', zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxWidth: 400,
        }}>
          {message.text}
        </div>
      )}

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: 4, background: 'white', borderRadius: '10px', padding: '5px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 20, width: 'fit-content' }}>
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
              borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
              background: tab === id ? '#1a237e' : 'transparent',
              color: tab === id ? 'white' : '#475569',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>Loading...</div>
      ) : (
        <>
          {/* ════════════════ TAB 1: FEE STRUCTURE ════════════════ */}
          {tab === 'structure' && (
            <div>
              {!activeTerm && (
                <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', marginBottom: 16, display: 'flex', gap: 8, fontSize: 13, color: '#92400e' }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  No active term. Activate a term in Terms &amp; Registration before saving structures.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {CAMPUSES.map((campus) => (
                  <div key={campus.code} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    {/* Campus header */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '8px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Building2 size={18} style={{ color: '#1a237e' }} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#0f172a' }}>{campus.code} — {campus.name}</h3>
                          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{campus.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadFeeStructurePDF(campus.code)}
                        className="btn btn-secondary"
                        style={{ fontSize: 12, gap: 6 }}
                      >
                        <Download size={13} /> Download PDF
                      </button>
                    </div>

                    {/* Day & Boarding sections */}
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {['Day', 'Boarding'].map((type) => {
                        const key = `${campus.code}-${type}`;
                        const items = structs[key] || [];
                        const total = structTotal(key);
                        const isOpen = expanded.has(key);
                        const isSaving = savingKey === key;
                        const savedPkg = packages.find((p: any) => p.name === `${campus.code} ${type} Package`);
                        const isLocked = !!savedPkg?.lockedAt && !unlockedKeys.has(key);
                        return (
                          <div key={type} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                            {/* Section header */}
                            <div
                              onClick={() => toggleExpand(key)}
                              style={{
                                padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: isOpen ? '#f8fafc' : 'white', cursor: 'pointer',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {isOpen ? <ChevronDown size={14} style={{ color: '#475569' }} /> : <ChevronRight size={14} style={{ color: '#475569' }} />}
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{type} Scholar</span>
                                <span className="pill" style={{ background: type === 'Boarding' ? '#fff7ed' : '#eef2ff', color: type === 'Boarding' ? '#ea580c' : '#4338ca', fontSize: 10 }}>{type}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {total > 0 && <strong style={{ fontSize: 13, color: '#15803d' }}>${total.toLocaleString()}</strong>}
                                {savedPkg && (
                                  isLocked
                                    ? <span title="Locked — click Unlock to Edit">🔒</span>
                                    : <span style={{ fontSize: 10, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>SAVED</span>
                                )}
                              </div>
                            </div>

                            {/* Expanded content */}
                            {isOpen && (
                              <div style={{ padding: '14px', borderTop: '1px solid #e2e8f0' }}>

                                {/* Invoice warning */}
                                {savedPkg && termInvoiceCount > 0 && (
                                  <div style={{ marginBottom: 10, padding: '8px 12px', background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 6, display: 'flex', gap: 6, fontSize: 11, color: '#dc2626' }}>
                                    <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
                                    ⚠ Invoices already generated for {termInvoiceCount} students. Editing this structure will NOT update existing invoices.
                                  </div>
                                )}

                                {/* Column headers */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 32px', gap: 8, marginBottom: 6 }}>
                                  <span style={{ ...secHead, margin: 0 }}>Category</span>
                                  <span style={{ ...secHead, margin: 0 }}>Amount ($)</span>
                                  <span />
                                </div>

                                {isLocked ? (
                                  <>
                                    {/* Read-only locked view */}
                                    {items.map((item, idx) => {
                                      const cat = categories.find((c: any) => c.id === item.catId);
                                      return (
                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 32px', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                                          <div style={{ padding: '7px 12px', background: '#f8fafc', borderRadius: 6, fontSize: 12, color: '#0f172a', border: '1px solid #e2e8f0' }}>
                                            {cat?.name || '—'}
                                          </div>
                                          <div style={{ padding: '7px 12px', background: '#f8fafc', borderRadius: 6, fontSize: 12, color: '#0f172a', border: '1px solid #e2e8f0', textAlign: 'right' as const }}>
                                            ${Number(item.amount).toLocaleString()}
                                          </div>
                                          <span />
                                        </div>
                                      );
                                    })}
                                    {total > 0 && (
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 32px', gap: 8, marginTop: 4, paddingTop: 8, borderTop: '2px solid #e2e8f0' }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', paddingLeft: 14 }}>TOTAL</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d', paddingLeft: 12 }}>${total.toLocaleString()}</span>
                                        <span />
                                      </div>
                                    )}
                                    <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' as const }}>
                                      <button type="button" className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => handleUnlock(key)}>
                                        🔓 Unlock to Edit
                                      </button>
                                      {savedPkg?.lockedAt && (
                                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                          Last saved{savedPkg.lockedBy ? ` by ${savedPkg.lockedBy}` : ''} on {new Date(savedPkg.lockedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* Editable view */}
                                    {items.map((item, idx) => (
                                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 32px', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                                        <select
                                          value={item.catId}
                                          onChange={(e) => updateItem(key, idx, 'catId', Number(e.target.value))}
                                          className="text-field"
                                          style={{ ...fld, appearance: 'auto', cursor: 'pointer', fontSize: 12 }}
                                        >
                                          <option value={0}>Select category...</option>
                                          {categories.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                          ))}
                                        </select>
                                        <input
                                          type="number"
                                          value={item.amount}
                                          onChange={(e) => updateItem(key, idx, 'amount', e.target.value)}
                                          placeholder="0"
                                          min="0"
                                          className="text-field"
                                          style={{ ...fld, fontSize: 12 }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => removeItem(key, idx)}
                                          disabled={items.length === 1}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    ))}
                                    {total > 0 && (
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 32px', gap: 8, marginTop: 4, paddingTop: 8, borderTop: '2px solid #e2e8f0' }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', paddingLeft: 14 }}>TOTAL</span>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d', paddingLeft: 12 }}>${total.toLocaleString()}</span>
                                        <span />
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                                      <button type="button" className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => addItem(key)}>
                                        <Plus size={12} /> Add Line Item
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-primary"
                                        style={{ fontSize: 11, opacity: isSaving ? 0.7 : 1 }}
                                        onClick={() => handleSaveStructure(key)}
                                        disabled={isSaving}
                                      >
                                        {isSaving ? 'Saving...' : 'Save Structure'}
                                      </button>
                                      {savedPkg?.lockedAt && (
                                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                          ⚠ Editing — last saved on {new Date(savedPkg.lockedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                          {savedPkg.lockedBy ? ` by ${savedPkg.lockedBy}` : ''}
                                        </span>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════ TAB 2: CHARGE STUDENTS ════════════════ */}
          {tab === 'charge' && (
            <div>
              {/* Step indicator */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                {(['filter', 'review', 'done'] as ChargeStep[]).map((step, idx) => (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: chargeStep === step ? '#1a237e' : ['filter', 'review', 'done'].indexOf(chargeStep) > idx ? '#15803d' : '#e2e8f0',
                      color: ['filter', 'review', 'done'].indexOf(chargeStep) >= idx ? 'white' : '#475569',
                      fontSize: 11, fontWeight: 700,
                    }}>{idx + 1}</div>
                    <span style={{ fontSize: 12, fontWeight: chargeStep === step ? 700 : 400, color: chargeStep === step ? '#0f172a' : '#64748b', marginRight: 6 }}>
                      {step === 'filter' ? 'Filter' : step === 'review' ? 'Review' : 'Done'}
                    </span>
                    {idx < 2 && <div style={{ width: 20, height: 2, background: '#e2e8f0', marginRight: 4 }} />}
                  </div>
                ))}
              </div>

              {/* Step A: Filter */}
              {chargeStep === 'filter' && (
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', maxWidth: 520 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 18px', color: '#0f172a' }}>Select Students to Charge</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={lbl}>Term *</label>
                      <select value={chargeTermId} onChange={(e) => setChargeTermId(Number(e.target.value) || '')}
                        className="text-field" style={{ ...fld, appearance: 'auto', cursor: 'pointer' }}>
                        <option value="">— Select term —</option>
                        {terms.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.name} ({t.year}){t.isActive ? ' ✓ Active' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={lbl}>Campus</label>
                        <select value={chargeCampus} onChange={(e) => setChargeCampus(e.target.value)}
                          className="text-field" style={{ ...fld, appearance: 'auto', cursor: 'pointer' }}>
                          <option value="All">All Campuses</option>
                          {CAMPUSES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Student Type</label>
                        <select value={chargeType} onChange={(e) => setChargeType(e.target.value)}
                          className="text-field" style={{ ...fld, appearance: 'auto', cursor: 'pointer' }}>
                          <option value="All">All Types</option>
                          <option value="Day">Day Scholar</option>
                          <option value="Boarding">Boarding</option>
                        </select>
                      </div>
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: 13, padding: '10px 20px', marginTop: 4, opacity: loadingStudents ? 0.7 : 1 }}
                      onClick={handleLoadStudents}
                      disabled={!chargeTermId || loadingStudents}
                    >
                      {loadingStudents ? 'Loading...' : 'Load Students →'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step B: Review */}
              {chargeStep === 'review' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Review Students</h3>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                        {selectedIds.size} of {chargeStudents.length} selected · Total: <strong style={{ color: '#15803d' }}>${chargeTotal.toLocaleString()}</strong>
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => { setChargeStep('filter'); setChargeStudents([]); }}>
                        ← Back
                      </button>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: 12, opacity: selectedIds.size === 0 ? 0.5 : 1 }}
                        onClick={() => setShowConfirm(true)}
                        disabled={selectedIds.size === 0 || generating}
                      >
                        <Zap size={13} /> Generate Invoices for {selectedIds.size} Students
                      </button>
                    </div>
                  </div>

                  {chargeStudents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: 13 }}>
                      No registered students found for the selected filters.
                    </div>
                  ) : (
                    <div className="table-card">
                      <div className="data-table-wrap">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th style={{ width: 40 }}>
                                <input type="checkbox" checked={selectedIds.size === chargeStudents.length && chargeStudents.length > 0}
                                  onChange={toggleAll} style={{ cursor: 'pointer' }} />
                              </th>
                              <th>Student</th>
                              <th>Student No.</th>
                              <th>Form</th>
                              <th>Campus</th>
                              <th>Fee Package</th>
                              <th>Total ($)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {chargeStudents.map((r: any) => {
                              const pkg = getStudentPkg(r);
                              const total = getPkgTotal(pkg);
                              return (
                                <tr key={r.id} style={{ opacity: selectedIds.has(r.id) ? 1 : 0.45 }}>
                                  <td>
                                    <input type="checkbox" checked={selectedIds.has(r.id)}
                                      onChange={() => setSelectedIds((prev) => { const n = new Set(prev); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })}
                                      style={{ cursor: 'pointer' }} />
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div className="mini-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                                        {r.studentName?.split(' ').slice(0, 2).map((n: string) => n[0]).join('')}
                                      </div>
                                      <strong style={{ fontSize: 12 }}>{r.studentName}</strong>
                                    </div>
                                  </td>
                                  <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{r.studentNumber}</td>
                                  <td><span className="pill" style={{ background: '#eef2ff', color: '#4338ca' }}>{r.form}</span></td>
                                  <td style={{ fontSize: 12, color: '#64748b' }}>{r.campus || '—'}</td>
                                  <td style={{ fontSize: 12 }}>{pkg ? pkg.name : <span style={{ color: '#dc2626' }}>No package</span>}</td>
                                  <td><strong style={{ color: total > 0 ? '#15803d' : '#94a3b8' }}>{total > 0 ? `$${total.toLocaleString()}` : '—'}</strong></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="table-footer">
                        {chargeStudents.length} students loaded
                      </div>
                    </div>
                  )}

                  {/* Confirm dialog */}
                  {showConfirm && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
                      onClick={() => setShowConfirm(false)}>
                      <div style={{ background: 'white', borderRadius: '12px', padding: '28px 32px', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
                        onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 10px' }}>Confirm Invoice Generation</h3>
                        <p style={{ fontSize: 13, color: '#475569', margin: '0 0 20px' }}>
                          This will create invoices for <strong>{selectedIds.size} student{selectedIds.size !== 1 ? 's' : ''}</strong>{chargeTotal > 0 && <> totalling <strong style={{ color: '#15803d' }}>${chargeTotal.toLocaleString()}</strong></>}. Proceed?
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
                          <button
                            className="btn btn-primary"
                            onClick={handleGenerateInvoices}
                            disabled={generating}
                            style={{ opacity: generating ? 0.7 : 1 }}
                          >
                            {generating ? 'Generating...' : 'Yes, Generate'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Step C: Done */}
              {chargeStep === 'done' && (
                <div style={{ textAlign: 'center', padding: '48px 32px' }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>Invoices Generated!</h2>
                  {genResult?.invoicesCreated != null && (
                    <p style={{ fontSize: 15, color: '#475569', margin: '0 0 24px' }}>
                      <strong>{genResult.invoicesCreated}</strong> invoice{genResult.invoicesCreated !== 1 ? 's' : ''} created successfully.
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: 13, padding: '10px 24px' }}
                      onClick={() => { setChargeStep('filter'); setChargeStudents([]); setGenResult(null); }}
                    >
                      Generate Another Batch
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: 13, padding: '10px 24px', opacity: emailingSending ? 0.7 : 1 }}
                      onClick={handleEmailInvoices}
                      disabled={emailingSending}
                    >
                      {emailingSending ? '📧 Sending...' : '📧 Email Invoices to Parents'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════ TAB 3: RECORD PAYMENT ════════════════ */}
          {tab === 'payment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Search */}
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px 24px' }}>
                <label style={{ ...lbl, marginBottom: 10, fontSize: 14 }}>Search Student</label>
                <div style={{ position: 'relative', maxWidth: 420 }}>
                  <div className="field-wrap">
                    <span className="field-icon field-icon-left"><Search size={14} /></span>
                    <input
                      type="text"
                      value={paySearch}
                      onChange={(e) => { setPaySearch(e.target.value); setPaySuccess(null); }}
                      placeholder="Name or student number..."
                      className="text-field with-right"
                    />
                    {paySearch && (
                      <button className="field-icon field-icon-right" onClick={() => setPaySearch('')}><X size={13} /></button>
                    )}
                  </div>
                  {paySearchResults.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
                      border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                      zIndex: 100, marginTop: 4, overflow: 'hidden',
                    }}>
                      {paySearchResults.map((s: any) => (
                        <div
                          key={s.id}
                          onClick={() => handleSelectPayStudent(s)}
                          style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                        >
                          <div className="mini-avatar" style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>
                            {s.firstName?.[0]}{s.surname?.[0]}
                          </div>
                          <div>
                            <strong style={{ fontSize: 13 }}>{s.firstName} {s.surname}</strong>
                            <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontFamily: 'ui-monospace, monospace' }}>{s.studentNumber} · {s.form}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Student profile + payment */}
              {payStudent && (
                <>
                  {/* Mini profile + balance */}
                  <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div className="mini-avatar" style={{ width: 52, height: 52, fontSize: 20, flexShrink: 0 }}>
                          {payStudent.firstName?.[0]}{payStudent.surname?.[0]}
                        </div>
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px' }}>{payStudent.firstName} {payStudent.surname}</h3>
                          <p style={{ fontSize: 12, color: '#64748b', margin: 0, fontFamily: 'ui-monospace, monospace' }}>
                            {payStudent.studentNumber} · {payStudent.form}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {[
                          { label: 'Total Charged', value: `$${totalCharged.toLocaleString()}`, color: '#1a237e', bg: '#eef2ff' },
                          { label: 'Total Paid', value: `$${totalPaid.toLocaleString()}`, color: '#15803d', bg: '#f0fdf4' },
                          { label: 'Outstanding', value: `$${outstanding.toLocaleString()}`, color: outstanding > 0 ? '#dc2626' : '#15803d', bg: outstanding > 0 ? '#fff1f2' : '#f0fdf4' },
                        ].map((s) => (
                          <div key={s.label} style={{ background: s.bg, borderRadius: '8px', padding: '10px 14px', textAlign: 'center' }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>{s.label}</p>
                            <p style={{ fontSize: 18, fontWeight: 700, color: s.color, margin: 0, fontFamily: 'ui-monospace, monospace' }}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {payLoading ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', fontSize: 13 }}>Loading invoices...</div>
                  ) : (
                    <>
                      {/* Invoice history */}
                      {payInvoices.length > 0 && (
                        <div className="table-card">
                          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0' }}>
                            <p style={secHead}>Invoice History</p>
                          </div>
                          <div className="data-table-wrap">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th style={{ width: 32 }}></th>
                                  <th>Invoice No.</th>
                                  <th>Total</th>
                                  <th>Paid</th>
                                  <th>Balance</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {payInvoices.map((inv: any) => (
                                  <tr
                                    key={inv.id}
                                    onClick={() => setSelectedInvId(inv.id)}
                                    style={{ cursor: 'pointer', background: selectedInvId === inv.id ? '#eef2ff' : undefined }}
                                  >
                                    <td>
                                      <input type="radio" checked={selectedInvId === inv.id} onChange={() => setSelectedInvId(inv.id)} style={{ cursor: 'pointer' }} />
                                    </td>
                                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{inv.invoiceNumber}</td>
                                    <td><strong>${Number(inv.totalAmount ?? 0).toLocaleString()}</strong></td>
                                    <td style={{ color: '#15803d' }}>${Number(inv.amountPaid ?? 0).toLocaleString()}</td>
                                    <td style={{ color: Number(inv.balance ?? 0) > 0 ? '#dc2626' : '#15803d' }}>
                                      <strong>${Number(inv.balance ?? 0).toLocaleString()}</strong>
                                    </td>
                                    <td>
                                      <span className={`pill ${inv.status === 'Paid' ? 'pill-success' : inv.status === 'PartiallyPaid' ? 'pill-warning' : 'pill-danger'}`} style={{ fontSize: 10 }}>
                                        {inv.status === 'PartiallyPaid' ? 'Partial' : inv.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Payment form */}
                      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px 24px' }}>
                        <p style={{ ...secHead, marginBottom: 16 }}>Record Payment</p>

                        {paySuccess && (
                          <div style={{ padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                              <CheckCircle size={16} style={{ color: '#15803d' }} />
                              <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>
                                Payment of ${Number(paySuccess.form.amount).toLocaleString()} recorded via {paySuccess.form.method}
                              </span>
                            </div>
                            <button
                              onClick={printReceipt}
                              className="btn btn-secondary"
                              style={{ fontSize: 12 }}
                            >
                              <Printer size={13} /> Print Receipt
                            </button>
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label style={lbl}>Amount Paid ($) *</label>
                            <input
                              type="number"
                              value={payForm.amount}
                              onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
                              placeholder="0.00"
                              min="0"
                              className="text-field"
                              style={fld}
                            />
                          </div>
                          <div>
                            <label style={lbl}>Payment Method</label>
                            <select
                              value={payForm.method}
                              onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))}
                              className="text-field"
                              style={{ ...fld, appearance: 'auto', cursor: 'pointer' }}
                            >
                              {['Cash', 'Bank Transfer', 'EcoCash', 'OneMoney', 'Swipe', 'Other'].map((m) => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={lbl}>Reference Number</label>
                            <input
                              type="text"
                              value={payForm.reference}
                              onChange={(e) => setPayForm((p) => ({ ...p, reference: e.target.value }))}
                              placeholder="Receipt / transaction ref"
                              className="text-field"
                              style={fld}
                            />
                          </div>
                          <div>
                            <label style={lbl}>Payment Date</label>
                            <input
                              type="date"
                              value={payForm.date}
                              onChange={(e) => setPayForm((p) => ({ ...p, date: e.target.value }))}
                              className="text-field"
                              style={fld}
                            />
                          </div>
                        </div>

                        <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
                          {!selectedInvId && payInvoices.length > 0 && (
                            <span style={{ fontSize: 12, color: '#dc2626' }}>
                              <AlertTriangle size={12} style={{ marginRight: 4 }} />
                              Select an invoice above
                            </span>
                          )}
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: 13, padding: '10px 24px', opacity: paySubmitting ? 0.7 : 1 }}
                            onClick={handleRecordPayment}
                            disabled={paySubmitting || !selectedInvId}
                          >
                            {paySubmitting ? 'Recording...' : 'Record Payment'}
                          </button>
                          {paySuccess && (
                            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={printReceipt}>
                              <Printer size={13} /> Print Receipt
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {!payStudent && !paySearch && (
                <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                  <CreditCard size={36} style={{ margin: '0 auto 12px', color: '#94a3b8', display: 'block' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Search for a student to record payment</p>
                  <p style={{ fontSize: 12, margin: 0, color: '#94a3b8' }}>Type a name or student number in the search bar above.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Unlock Confirmation Dialog ── */}
      {unlockDialogKey && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}
          onClick={() => setUnlockDialogKey(null)}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px 32px', maxWidth: 440, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 10px', color: '#0f172a' }}>🔓 Unlock Fee Structure</h3>
            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 6px' }}>
              Changing the fee structure may affect existing invoices. Are you sure?
            </p>
            <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, margin: '0 0 16px' }}>
              Type CONFIRM to proceed.
            </p>
            <input
              type="text"
              value={unlockInput}
              onChange={(e) => setUnlockInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmUnlock()}
              placeholder="Type CONFIRM"
              className="text-field"
              style={{ paddingLeft: 12, paddingRight: 12, marginBottom: 16, width: '100%', boxSizing: 'border-box' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setUnlockDialogKey(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ background: '#dc2626' }}
                onClick={confirmUnlock}
              >
                Unlock &amp; Edit
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </AdminLayout>
  );
}
