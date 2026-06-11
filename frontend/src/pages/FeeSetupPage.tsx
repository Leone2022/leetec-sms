import { useState, useEffect, useMemo } from 'react';
import { feesAPI, studentsAPI, termRegistrationsAPI } from '../services/api';
import {
  Search, X, Plus, Zap, CreditCard, FileDown,
  FileSpreadsheet, FileText, Printer, AlertTriangle,
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportTableToPdf, exportTableToExcel, exportTableToWord } from '../utils/exportTable';

type Tab = 'charge' | 'payments';
const todayISO = () => new Date().toISOString().split('T')[0];
const CATEGORY_TYPES = ['Core Fees', 'Levies', 'Incidentals'];
const PAY_METHODS = ['Cash', 'Bank Transfer', 'EcoCash', 'OneMoney', 'Swipe', 'Other'];

export default function FeeSetupPage() {
  // ── Shared ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('charge');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTerm, setActiveTerm] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);

  // ── Tab 1 ───────────────────────────────────────────────────────────────────
  const [balances, setBalances] = useState<any[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balanceSearch, setBalanceSearch] = useState('');
  const [feeAmounts, setFeeAmounts] = useState<Record<number, string>>({});

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', type: 'Core Fees', amount: '' });
  const [addingItem, setAddingItem] = useState(false);

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkCatId, setBulkCatId] = useState<number | ''>('');
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkCampus, setBulkCampus] = useState('All');
  const [bulkForm, setBulkForm] = useState('All');
  const [bulkApplying, setBulkApplying] = useState(false);

  const [isIndivOpen, setIsIndivOpen] = useState(false);
  const [indivSearch, setIndivSearch] = useState('');
  const [indivStudent, setIndivStudent] = useState<any>(null);
  const [indivCatId, setIndivCatId] = useState<number | ''>('');
  const [indivDesc, setIndivDesc] = useState('');
  const [indivAmount, setIndivAmount] = useState('');
  const [indivApplying, setIndivApplying] = useState(false);

  // ── Invoice PDF & Email ─────────────────────────────────────────────────────
  const [emailModal, setEmailModal] = useState<{ studentId: number; invoiceId: number | null; studentName: string } | null>(null);
  const [emailAddr, setEmailAddr] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  // ── Tab 2 ───────────────────────────────────────────────────────────────────
  const [paySearch, setPaySearch] = useState('');
  const [payStudent, setPayStudent] = useState<any>(null);
  const [payInvoices, setPayInvoices] = useState<any[]>([]);
  const [payLoading, setPayLoading] = useState(false);
  const [selectedInvId, setSelectedInvId] = useState<number | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'Cash', reference: '', date: todayISO() });
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [paySuccess, setPaySuccess] = useState<any>(null);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [termsRes, catsRes, studRes] = await Promise.all([
        feesAPI.getTerms(1),
        feesAPI.getCategories(1),
        studentsAPI.getAll(1),
      ]);
      const catData: any[] = catsRes.data || [];
      setCategories(catData);
      setAllStudents(studRes.data || []);
      const active = (termsRes.data as any[]).find((t) => t.isActive) ?? null;
      setActiveTerm(active);
      if (active) {
        const regRes = await termRegistrationsAPI.getDashboard(active.id);
        setRegistrations(regRes.data?.registrations || []);
        loadBalances(active.id);
      }
    } catch (err) {
      console.error(err);
      showMsg('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async (termId: number) => {
    setBalancesLoading(true);
    try {
      const res = await feesAPI.getStudentBalances(termId);
      setBalances((res.data as any)?.students || []);
    } catch (err) {
      console.error(err);
    } finally {
      setBalancesLoading(false);
    }
  };

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // ── Fee Items ────────────────────────────────────────────────────────────────
  const handleAddFeeItem = async () => {
    if (!newItem.name.trim()) { showMsg('Name is required', 'error'); return; }
    setAddingItem(true);
    try {
      await feesAPI.createCategory({ schoolId: 1, name: newItem.name.trim(), description: newItem.type });
      showMsg('Fee item added', 'success');
      setIsAddOpen(false);
      setNewItem({ name: '', type: 'Core Fees', amount: '' });
      const res = await feesAPI.getCategories(1);
      setCategories(res.data || []);
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Failed to add item', 'error');
    } finally {
      setAddingItem(false);
    }
  };

  const openBulkWithItem = (cat: any) => {
    setBulkCatId(cat.id);
    setBulkAmount(feeAmounts[cat.id] || '');
    setBulkCampus('All');
    setBulkForm('All');
    setIsBulkOpen(true);
  };

  // ── Bulk Charge ──────────────────────────────────────────────────────────────
  const bulkMatched = useMemo(() => {
    let regs = registrations;
    if (bulkCampus !== 'All') regs = regs.filter((r: any) => r.campus === bulkCampus);
    if (bulkForm !== 'All') regs = regs.filter((r: any) => r.form === bulkForm);
    return regs;
  }, [registrations, bulkCampus, bulkForm]);

  const handleBulkCharge = async () => {
    if (!bulkCatId) { showMsg('Select a fee item', 'error'); return; }
    if (!bulkAmount || Number(bulkAmount) <= 0) { showMsg('Enter a valid amount', 'error'); return; }
    if (bulkMatched.length === 0) { showMsg('No students match the filters', 'error'); return; }
    setBulkApplying(true);
    const cat = categories.find((c: any) => c.id === Number(bulkCatId));
    let success = 0; let failed = 0;
    for (const reg of bulkMatched) {
      try {
        await feesAPI.chargeIndividual({
          studentId: reg.studentId, schoolId: 1,
          description: cat?.name || 'Fee Charge',
          amount: Number(bulkAmount),
          feeCategoryId: Number(bulkCatId),
        });
        success++;
      } catch { failed++; }
    }
    showMsg(success > 0 ? `Charged ${success} students successfully` : `All charges failed`, success > 0 ? 'success' : 'error');
    setIsBulkOpen(false);
    setBulkApplying(false);
    if (activeTerm) loadBalances(activeTerm.id);
  };

  // ── Individual Charge ────────────────────────────────────────────────────────
  const indivResults = indivSearch.trim().length >= 2
    ? allStudents.filter((s: any) =>
        `${s.firstName} ${s.surname} ${s.studentNumber}`.toLowerCase().includes(indivSearch.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleIndividualCharge = async () => {
    if (!indivStudent) { showMsg('Select a student', 'error'); return; }
    const descFinal = indivDesc.trim() || categories.find((c: any) => c.id === Number(indivCatId))?.name || '';
    if (!descFinal) { showMsg('Enter a description', 'error'); return; }
    if (!indivAmount || Number(indivAmount) <= 0) { showMsg('Enter a valid amount', 'error'); return; }
    setIndivApplying(true);
    try {
      await feesAPI.chargeIndividual({
        studentId: indivStudent.id, schoolId: 1, description: descFinal,
        amount: Number(indivAmount),
        feeCategoryId: indivCatId ? Number(indivCatId) : undefined,
      });
      showMsg(`$${Number(indivAmount).toLocaleString()} charged to ${indivStudent.firstName} ${indivStudent.surname}`, 'success');
      setIsIndivOpen(false);
      setIndivStudent(null); setIndivSearch(''); setIndivDesc(''); setIndivAmount(''); setIndivCatId('');
      if (activeTerm) loadBalances(activeTerm.id);
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Failed to apply charge', 'error');
    } finally {
      setIndivApplying(false);
    }
  };

  // ── Jump to payment tab ───────────────────────────────────────────────────────
  const jumpToPayment = async (student: any) => {
    setTab('payments');
    setPayStudent(student);
    setPaySearch(''); setPaySuccess(null);
    setPayLoading(true);
    try {
      const res = await feesAPI.getStudentInvoices(student.id);
      const invs: any[] = res.data || [];
      setPayInvoices(invs);
      const first = invs.find((i: any) => i.status !== 'Paid') ?? invs[0] ?? null;
      setSelectedInvId(first?.id ?? null);
    } catch { showMsg('Failed to load invoices', 'error'); }
    finally { setPayLoading(false); }
  };

  // ── Download Invoice PDF ─────────────────────────────────────────────────────
  const handleDownloadInvoicePDF = async (b: any) => {
    try {
      const res = await feesAPI.getStudentInvoices(b.studentId);
      const invs: any[] = res.data || [];
      if (invs.length === 0) { showMsg('No invoices found for this student', 'error'); return; }
      const inv = invs[0];
      const doc = new jsPDF();

      // Navy banner
      doc.setFillColor(26, 35, 126);
      doc.rect(0, 0, 210, 42, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20); doc.setFont('helvetica', 'bold');
      doc.text('Advent Hope Academy', 14, 17);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text('64 Jason Moyo Ave, Harare  |  Tel: +263 773 102 003  |  adventhope01@gmail.com', 14, 26);
      doc.text('Bank: ZB Bank, Msasa  |  NOSTRO: 413400523382405', 14, 34);
      doc.setFontSize(22); doc.setFont('helvetica', 'bold');
      doc.text('INVOICE', 196, 28, { align: 'right' });

      doc.setTextColor(0); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);

      // Student + Invoice details side by side
      const campus = (b.studentNumber || '').split('/')[0] || b.campus || '—';
      autoTable(doc, {
        startY: 50,
        head: [['Student Details', '']],
        body: [
          ['Student Name', b.studentName || '—'],
          ['Student Number', b.studentNumber || '—'],
          ['Form / Class', b.form || '—'],
          ['Campus', campus],
        ],
        theme: 'plain', styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [26, 35, 126], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42 } },
        margin: { left: 14, right: 112 }, tableWidth: 84,
      });

      autoTable(doc, {
        startY: 50,
        head: [['Invoice Details', '']],
        body: [
          ['Invoice No.', inv.invoiceNumber || '—'],
          ['Invoice Date', inv.issuedDate ? new Date(inv.issuedDate).toLocaleDateString('en-GB') : '—'],
          ['Due Date', inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB') : '—'],
          ['Status', inv.status || '—'],
        ],
        theme: 'plain', styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [26, 35, 126], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 32 } },
        margin: { left: 112, right: 14 }, tableWidth: 84,
      });

      const detailsBottom = (doc as any).lastAutoTable.finalY + 10;

      // Fee breakdown
      const itemRows = (inv.items || []).map((it: any) => [it.description || '—', `$${Number(it.amount).toFixed(2)}`]);
      const balColor: [number, number, number] = Number(inv.balance) > 0 ? [220, 38, 38] : [21, 128, 61];
      autoTable(doc, {
        startY: detailsBottom,
        head: [['Description', 'Amount']],
        body: itemRows,
        foot: [
          [{ content: 'TOTAL FEES', styles: { fontStyle: 'bold' } }, { content: `$${Number(inv.totalAmount).toFixed(2)}`, styles: { fontStyle: 'bold' } }],
          ['Amount Paid', `-$${Number(inv.amountPaid).toFixed(2)}`],
          [{ content: 'BALANCE DUE', styles: { fontStyle: 'bold', textColor: balColor } }, { content: `$${Number(inv.balance).toFixed(2)}`, styles: { fontStyle: 'bold', textColor: balColor } }],
        ],
        theme: 'striped',
        headStyles: { fillColor: [26, 35, 126] },
        footStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 10 },
        columnStyles: { 1: { halign: 'right', cellWidth: 40 } },
        margin: { left: 14, right: 14 },
      });

      const footY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFillColor(248, 250, 252);
      doc.rect(14, footY, 182, 26, 'F');
      doc.setFontSize(9); doc.setTextColor(71, 85, 105);
      doc.text('Banking Details:', 18, footY + 7);
      doc.text('Bank: ZB Bank  |  Branch: Msasa  |  Name: Advent Hope Academy', 18, footY + 14);
      doc.text('NOSTRO: 413400523382405  |  ZWL: 413400523382200', 18, footY + 21);
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text('Thank you for your continued support.  This is a computer generated invoice — LeeTec SMS', 105, footY + 34, { align: 'center' });

      const termLabel = (inv.term?.name || activeTerm?.name || 'Invoice').replace(/\s+/g, '_');
      doc.save(`Invoice_${b.studentNumber || 'Student'}_${termLabel}.pdf`);
    } catch (err) {
      console.error(err);
      showMsg('Failed to generate invoice PDF', 'error');
    }
  };

  // ── Open Email Modal ─────────────────────────────────────────────────────────
  const handleOpenEmailModal = async (b: any) => {
    try {
      const [studentRes, invoicesRes] = await Promise.all([
        studentsAPI.getById(b.studentId),
        feesAPI.getStudentInvoices(b.studentId),
      ]);
      const s = studentRes.data;
      const invs: any[] = invoicesRes.data || [];
      const email: string = s?.family?.email || s?.user?.email || '';
      setEmailAddr(email);
      setEmailModal({ studentId: b.studentId, invoiceId: invs[0]?.id ?? null, studentName: b.studentName });
    } catch (err) {
      showMsg('Failed to load student details', 'error');
    }
  };

  const handleSendInvoiceEmail = async () => {
    if (!emailModal) return;
    if (!emailAddr.trim()) { showMsg('Enter an email address', 'error'); return; }
    setEmailSending(true);
    try {
      const res = await feesAPI.sendSingleInvoiceEmail({
        studentId: emailModal.studentId,
        invoiceId: emailModal.invoiceId,
        email: emailAddr.trim(),
        schoolId: 1,
      });
      showMsg((res.data as any).message || 'Invoice emailed successfully', 'success');
      setEmailModal(null);
      setEmailAddr('');
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Failed to send email', 'error');
    } finally {
      setEmailSending(false);
    }
  };

  // ── Payments tab ──────────────────────────────────────────────────────────────
  const payResults = paySearch.trim().length >= 2
    ? allStudents.filter((s: any) =>
        `${s.firstName} ${s.surname} ${s.studentNumber}`.toLowerCase().includes(paySearch.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleSelectPayStudent = async (student: any) => {
    setPayStudent(student); setPaySearch(''); setPaySuccess(null);
    setPayLoading(true);
    try {
      const res = await feesAPI.getStudentInvoices(student.id);
      const invs: any[] = res.data || [];
      setPayInvoices(invs);
      const first = invs.find((i: any) => i.status !== 'Paid') ?? invs[0] ?? null;
      setSelectedInvId(first?.id ?? null);
    } catch { showMsg('Failed to load invoices', 'error'); }
    finally { setPayLoading(false); }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvId) { showMsg('No invoice found for this student', 'error'); return; }
    if (!payForm.amount || Number(payForm.amount) <= 0) { showMsg('Enter a valid amount', 'error'); return; }
    setPaySubmitting(true);
    try {
      await feesAPI.postPayment({
        invoiceId: selectedInvId, amount: Number(payForm.amount),
        paymentMethod: payForm.method, referenceNumber: payForm.reference, paymentDate: payForm.date,
      });
      setPaySuccess({ student: payStudent, form: { ...payForm } });
      showMsg('Payment recorded successfully', 'success');
      const res = await feesAPI.getStudentInvoices(payStudent.id);
      setPayInvoices(res.data || []);
      setPayForm((p) => ({ ...p, amount: '', reference: '' }));
      if (activeTerm) loadBalances(activeTerm.id);
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Failed to record payment', 'error');
    } finally { setPaySubmitting(false); }
  };

  // ── Statement PDF ─────────────────────────────────────────────────────────────
  const printStatement = () => {
    if (!payStudent || statementRows.length === 0) return;
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('en-GB');
    const studentName = `${payStudent.firstName} ${payStudent.surname}`;
    const studentNum = payStudent.studentNumber || '—';
    const form = payStudent.form || '—';
    const campus = payStudent.campus || (studentNum.split('/')[0]) || '—';
    const finalBal = statementRows[statementRows.length - 1].balance;

    // Navy banner
    doc.setFillColor(26, 35, 126);
    doc.rect(0, 0, 210, 42, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('Advent Hope Academy', 14, 17);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('64 Jason Moyo Ave, Harare  |  Tel: +263 773 102 003  |  adventhope01@gmail.com', 14, 26);
    doc.text('Bank: ZB Bank, Msasa  |  NOSTRO: 413400523382405', 14, 34);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('ACCOUNT STATEMENT', 196, 22, { align: 'right' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${today}`, 196, 32, { align: 'right' });

    doc.setTextColor(0); doc.setFont('helvetica', 'normal');

    // Student info
    autoTable(doc, {
      startY: 50,
      head: [['Student Name', 'Student Number', 'Form', 'Campus']],
      body: [[studentName, studentNum, form, campus]],
      theme: 'plain',
      headStyles: { fillColor: [26, 35, 126], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 },
    });

    // Statement table
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [['Date', 'Description', 'Charge', 'Payment', 'Balance']],
      body: statementRows.map(r => [
        r.date ? new Date(r.date).toLocaleDateString('en-GB') : '—',
        r.desc,
        r.charge > 0 ? `$${r.charge.toLocaleString()}` : '—',
        r.payment > 0 ? `$${r.payment.toLocaleString()}` : '—',
        `$${r.balance.toLocaleString()}`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [26, 35, 126], textColor: 255 },
      styles: { fontSize: 10 },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    });

    // Summary
    const balColor: [number, number, number] = finalBal > 0 ? [220, 38, 38] : [21, 128, 61];
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      body: [
        ['Total Charged', `$${totalCharged.toLocaleString()}`],
        ['Total Paid', `-$${totalPaid.toLocaleString()}`],
        [
          { content: 'Balance Due', styles: { fontStyle: 'bold', textColor: balColor } },
          { content: `$${finalBal.toLocaleString()}`, styles: { fontStyle: 'bold', textColor: balColor } },
        ],
      ],
      theme: 'plain',
      styles: { fontSize: 11, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { halign: 'right' } },
      margin: { left: 120 },
    });

    // Footer
    const footY = (doc as any).lastAutoTable.finalY + 12;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, footY, 196, footY);
    doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    doc.text('Banking Details:', 14, footY + 8);
    doc.text('Bank: ZB Bank  |  Branch: Msasa  |  Name: Advent Hope Academy', 14, footY + 15);
    doc.text('NOSTRO: 413400523382405  |  ZWL: 413400523382200', 14, footY + 22);
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text('This is a computer generated statement.', 105, footY + 30, { align: 'center' });

    doc.save(`Statement_${studentNum}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ── Statement running balance ─────────────────────────────────────────────────
  const statementRows = useMemo(() => {
    const rows: { date: string; desc: string; charge: number; payment: number }[] = [];
    for (const inv of payInvoices) {
      for (const item of (inv.items || []))
        rows.push({ date: inv.issuedDate || inv.createdAt || '', desc: item.description || '—', charge: Number(item.amount || 0), payment: 0 });
      for (const pmt of (inv.payments || []))
        rows.push({ date: pmt.paymentDate || pmt.postedAt || '', desc: `Payment — ${pmt.paymentMethod || 'Cash'}${pmt.receiptNumber ? ` (${pmt.receiptNumber})` : ''}`, charge: 0, payment: Number(pmt.amount || 0) });
    }
    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let bal = 0;
    return rows.map((r) => { bal += r.charge - r.payment; return { ...r, balance: bal }; });
  }, [payInvoices]);

  // ── Receipt PDF ───────────────────────────────────────────────────────────────
  const printReceipt = () => {
    if (!paySuccess) return;
    const newBal = statementRows.length > 0 ? statementRows[statementRows.length - 1].balance : 0;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setTextColor(26, 35, 126);
    doc.text('Advent Hope Schools', 105, 18, { align: 'center' });
    doc.setFontSize(12); doc.setTextColor(0);
    doc.text('OFFICIAL PAYMENT RECEIPT', 105, 28, { align: 'center' });
    doc.line(20, 33, 190, 33);
    autoTable(doc, {
      startY: 38,
      body: [
        ['Student Name', `${paySuccess.student.firstName} ${paySuccess.student.surname}`],
        ['Student Number', paySuccess.student.studentNumber],
        ['Amount Paid', `$${Number(paySuccess.form.amount).toLocaleString()}`],
        ['Payment Method', paySuccess.form.method],
        ['Reference', paySuccess.form.reference || '—'],
        ['Date', paySuccess.form.date],
        ['Balance Remaining', `$${newBal.toLocaleString()}`],
      ],
      theme: 'plain', styles: { fontSize: 11, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
    });
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text('Thank you for your payment. Please retain this receipt for your records.', 105, finalY, { align: 'center' });
    doc.save(`receipt-${paySuccess.student.studentNumber}-${paySuccess.form.date}.pdf`);
  };

  // ── Derived ───────────────────────────────────────────────────────────────────
  const filtered = balances.filter((b: any) =>
    `${b.studentName} ${b.studentNumber}`.toLowerCase().includes(balanceSearch.toLowerCase())
  );
  const totalCharged = payInvoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const totalPaid = payInvoices.reduce((s, i) => s + Number(i.amountPaid || 0), 0);
  const outstanding = totalCharged - totalPaid;
  const availForms = [...new Set(registrations.map((r: any) => r.form).filter(Boolean))].sort() as string[];

  const exportRows = filtered.map((b: any) => ({
    name: b.studentName ?? '', number: b.studentNumber ?? '', campus: b.campus ?? '', form: b.form ?? '',
    charged: `$${Number(b.totalAmount ?? 0).toLocaleString()}`,
    paid: `$${Number(b.amountPaid ?? 0).toLocaleString()}`,
    balance: `$${Number(b.balance ?? 0).toLocaleString()}`,
    status: b.status ?? '',
  }));
  const exportCols = [
    { header: 'Student Name', value: (r: typeof exportRows[number]) => r.name },
    { header: 'Student No.', value: (r: typeof exportRows[number]) => r.number },
    { header: 'Campus', value: (r: typeof exportRows[number]) => r.campus },
    { header: 'Total Charged', value: (r: typeof exportRows[number]) => r.charged },
    { header: 'Total Paid', value: (r: typeof exportRows[number]) => r.paid },
    { header: 'Balance', value: (r: typeof exportRows[number]) => r.balance },
    { header: 'Status', value: (r: typeof exportRows[number]) => r.status },
  ];

  const fld = { paddingLeft: '12px', paddingRight: '12px' };
  const lbl: React.CSSProperties = { fontSize: '12px', fontWeight: '600', color: '#0f172a', display: 'block', marginBottom: '5px' };

  return (
    <AdminLayout title="Fee Management" subtitle="Charge students · Record payments · Print receipts">

      {/* ── Toast ── */}
      {message && (
        <div style={{
          position: 'fixed', top: 80, right: 20, padding: '14px 18px', borderRadius: '10px',
          background: message.type === 'success' ? '#0ea5e9' : '#dc2626',
          color: 'white', fontSize: '13px', fontWeight: '500', zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxWidth: 420,
        }}>
          {message.text}
        </div>
      )}

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: 4, background: 'white', borderRadius: '10px', padding: '5px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 20, width: 'fit-content' }}>
        {([
          { id: 'charge' as Tab, label: 'Charge Students', Icon: Zap },
          { id: 'payments' as Tab, label: 'Payments & Receipts', Icon: CreditCard },
        ]).map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px',
            borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
            background: tab === id ? '#1a237e' : 'transparent',
            color: tab === id ? 'white' : '#475569', transition: 'all 0.15s',
          }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {!activeTerm && !loading && (
        <div style={{ padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', marginBottom: 16, display: 'flex', gap: 8, fontSize: 13, color: '#92400e' }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          No active term. Go to Terms &amp; Registration and activate a term first.
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#475569' }}>Loading...</div>
      ) : (
        <>
          {/* ══════════════ TAB 1: CHARGE STUDENTS ══════════════ */}
          {tab === 'charge' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Fee Items Library */}
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0f172a' }}>Fee Items Library</h3>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{categories.length} items · Set a default amount to pre-fill bulk charges</p>
                  </div>
                  <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setIsAddOpen(true)}>
                    <Plus size={13} /> Add Fee Item
                  </button>
                </div>
                {categories.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                    No fee items yet. Add your first item to get started.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Item Name', 'Category', 'Default Amount ($)', 'Action'].map((h) => (
                          <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat: any) => (
                        <tr key={cat.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 16px', fontWeight: 600, color: '#0f172a' }}>{cat.name}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <span className="pill" style={{
                              background: cat.description === 'Core Fees' ? '#eef2ff' : cat.description === 'Levies' ? '#f0fdf4' : '#fff7ed',
                              color: cat.description === 'Core Fees' ? '#4338ca' : cat.description === 'Levies' ? '#15803d' : '#ea580c',
                              fontSize: 10,
                            }}>
                              {cat.description || 'Core Fees'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <input
                              type="number" value={feeAmounts[cat.id] ?? ''}
                              onChange={(e) => setFeeAmounts((p) => ({ ...p, [cat.id]: e.target.value }))}
                              placeholder="Set default..." min="0"
                              style={{ width: 120, padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, color: '#0f172a' }}
                            />
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <button className="btn btn-primary" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => openBulkWithItem(cat)}>
                              Charge
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Charge Action Buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  className="btn btn-primary" style={{ fontSize: 13, padding: '10px 22px' }}
                  onClick={() => { setBulkCatId(''); setBulkAmount(''); setBulkCampus('All'); setBulkForm('All'); setIsBulkOpen(true); }}
                  disabled={!activeTerm}
                >
                  <Zap size={14} /> Bulk Charge
                </button>
                <button
                  className="btn btn-secondary" style={{ fontSize: 13, padding: '10px 22px' }}
                  onClick={() => { setIndivStudent(null); setIndivSearch(''); setIndivDesc(''); setIndivAmount(''); setIndivCatId(''); setIsIndivOpen(true); }}
                  disabled={!activeTerm}
                >
                  <Plus size={14} /> Individual Charge
                </button>
              </div>

              {/* Student Balances */}
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#0f172a' }}>Student Balances</h3>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                      {activeTerm ? `${activeTerm.name} · ` : ''}{filtered.length} student{filtered.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="field-wrap" style={{ width: 230 }}>
                      <span className="field-icon field-icon-left"><Search size={13} /></span>
                      <input type="text" value={balanceSearch} onChange={(e) => setBalanceSearch(e.target.value)}
                        placeholder="Search student..." className="text-field with-right" style={{ fontSize: 12 }} />
                      {balanceSearch && <button className="field-icon field-icon-right" onClick={() => setBalanceSearch('')}><X size={12} /></button>}
                    </div>
                    <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => exportTableToPdf({ title: `${activeTerm?.name || 'Fee'} Balances`, filename: 'balances.pdf', columns: exportCols, rows: exportRows })} disabled={!filtered.length}>
                      <FileDown size={12} /> PDF
                    </button>
                    <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => exportTableToExcel({ sheetName: 'Balances', filename: 'balances.xlsx', columns: exportCols, rows: exportRows })} disabled={!filtered.length}>
                      <FileSpreadsheet size={12} /> Excel
                    </button>
                    <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => exportTableToWord({ title: `${activeTerm?.name || 'Fee'} Balances`, filename: 'balances.docx', columns: exportCols, rows: exportRows })} disabled={!filtered.length}>
                      <FileText size={12} /> Word
                    </button>
                  </div>
                </div>

                {balancesLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#475569', fontSize: 13 }}>Loading balances...</div>
                ) : !activeTerm ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>Activate a term to see student balances.</div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                    {balanceSearch ? `No students match "${balanceSearch}"` : 'No charges recorded for this term yet.'}
                  </div>
                ) : (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Student No.</th>
                            <th>Campus</th>
                            <th>Total Charged</th>
                            <th>Total Paid</th>
                            <th>Balance</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((b: any) => {
                            const bal = Number(b.balance ?? 0);
                            const student = allStudents.find((s: any) => s.id === b.studentId);
                            return (
                              <tr key={b.id}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div className="mini-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                                      {b.studentName?.split(' ').slice(0, 2).map((n: string) => n[0]).join('')}
                                    </div>
                                    <strong style={{ fontSize: 12 }}>{b.studentName}</strong>
                                  </div>
                                </td>
                                <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{b.studentNumber}</td>
                                <td><span className="pill" style={{ background: '#eef2ff', color: '#4338ca', fontSize: 10 }}>{b.campus || '—'}</span></td>
                                <td style={{ fontSize: 13 }}>${Number(b.totalAmount ?? 0).toLocaleString()}</td>
                                <td style={{ fontSize: 13, color: '#15803d' }}>${Number(b.amountPaid ?? 0).toLocaleString()}</td>
                                <td>
                                  <strong style={{ fontSize: 13, color: bal > 0 ? '#dc2626' : '#15803d' }}>
                                    ${bal.toLocaleString()}
                                  </strong>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    <button className="btn" style={{ fontSize: 11, padding: '4px 10px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}
                                      onClick={() => student && jumpToPayment(student)}>
                                      Post Payment
                                    </button>
                                    <button className="btn" style={{ fontSize: 11, padding: '4px 10px', background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}
                                      onClick={() => student && jumpToPayment(student)}>
                                      Statement
                                    </button>
                                    <button className="btn" style={{ fontSize: 11, padding: '4px 10px', background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa' }}
                                      onClick={() => handleDownloadInvoicePDF(b)}>
                                      📄 Invoice
                                    </button>
                                    <button className="btn" style={{ fontSize: 11, padding: '4px 10px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}
                                      onClick={() => handleOpenEmailModal(b)}>
                                      📧 Email
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#64748b' }}>
                      {filtered.length} student{filtered.length !== 1 ? 's' : ''}
                      {balanceSearch ? ` — filtered by "${balanceSearch}"` : ''}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ══════════════ TAB 2: PAYMENTS & RECEIPTS ══════════════ */}
          {tab === 'payments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Search */}
              <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px 24px' }}>
                <label style={{ ...lbl, fontSize: 14, marginBottom: 12 }}>Search Student</label>
                <div style={{ position: 'relative', maxWidth: 440 }}>
                  <div className="field-wrap">
                    <span className="field-icon field-icon-left"><Search size={15} /></span>
                    <input type="text" value={paySearch} onChange={(e) => setPaySearch(e.target.value)}
                      placeholder="Name or student number..." className="text-field with-right" />
                    {paySearch && <button className="field-icon field-icon-right" onClick={() => setPaySearch('')}><X size={13} /></button>}
                  </div>
                  {payResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, marginTop: 4, overflow: 'hidden' }}>
                      {payResults.map((s: any) => (
                        <div key={s.id} onClick={() => handleSelectPayStudent(s)}
                          style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f1f5f9' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}>
                          <div className="mini-avatar" style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>{s.firstName?.[0]}{s.surname?.[0]}</div>
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

              {/* Student profile + balance summary */}
              {payStudent && (
                <>
                  <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div className="mini-avatar" style={{ width: 48, height: 48, fontSize: 18, flexShrink: 0 }}>
                        {payStudent.firstName?.[0]}{payStudent.surname?.[0]}
                      </div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px' }}>{payStudent.firstName} {payStudent.surname}</h3>
                        <p style={{ fontSize: 12, color: '#64748b', margin: 0, fontFamily: 'ui-monospace, monospace' }}>
                          {payStudent.studentNumber} · {payStudent.form}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {[
                        { label: 'Total Charged', val: `$${totalCharged.toLocaleString()}`, color: '#1a237e', bg: '#eef2ff' },
                        { label: 'Total Paid', val: `$${totalPaid.toLocaleString()}`, color: '#15803d', bg: '#f0fdf4' },
                        { label: 'Outstanding', val: `$${outstanding.toLocaleString()}`, color: outstanding > 0 ? '#dc2626' : '#15803d', bg: outstanding > 0 ? '#fff1f2' : '#f0fdf4' },
                      ].map((s) => (
                        <div key={s.label} style={{ background: s.bg, borderRadius: '8px', padding: '10px 14px', textAlign: 'center', minWidth: 90 }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>{s.label}</p>
                          <p style={{ fontSize: 18, fontWeight: 700, color: s.color, margin: 0, fontFamily: 'ui-monospace, monospace' }}>{s.val}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {payLoading ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#475569', fontSize: 13 }}>Loading...</div>
                  ) : (
                    <>
                      {/* Statement table */}
                      {statementRows.length > 0 && (
                        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                          <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0' }}>
                            <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Transaction Statement</h3>
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Description</th>
                                  <th style={{ textAlign: 'right' }}>Charge</th>
                                  <th style={{ textAlign: 'right' }}>Payment</th>
                                  <th style={{ textAlign: 'right' }}>Balance</th>
                                </tr>
                              </thead>
                              <tbody>
                                {statementRows.map((row, idx) => (
                                  <tr key={idx}>
                                    <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                                      {row.date ? new Date(row.date).toLocaleDateString('en-GB') : '—'}
                                    </td>
                                    <td style={{ fontSize: 12 }}>{row.desc}</td>
                                    <td style={{ textAlign: 'right', fontSize: 12, color: row.charge > 0 ? '#dc2626' : '#94a3b8' }}>
                                      {row.charge > 0 ? `$${row.charge.toLocaleString()}` : '—'}
                                    </td>
                                    <td style={{ textAlign: 'right', fontSize: 12, color: row.payment > 0 ? '#15803d' : '#94a3b8' }}>
                                      {row.payment > 0 ? `$${row.payment.toLocaleString()}` : '—'}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      <strong style={{ fontSize: 12, color: row.balance > 0 ? '#dc2626' : '#15803d' }}>
                                        ${row.balance.toLocaleString()}
                                      </strong>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={printStatement}>
                              <FileDown size={12} /> PDF Statement
                            </button>
                            <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => {
                              const cols = [
                                { header: 'Date', value: (r: any) => r.date },
                                { header: 'Description', value: (r: any) => r.desc },
                                { header: 'Charge', value: (r: any) => r.charge },
                                { header: 'Payment', value: (r: any) => r.payment },
                                { header: 'Balance', value: (r: any) => r.balance },
                              ];
                              const rows = statementRows.map(r => ({
                                date: r.date ? new Date(r.date).toLocaleDateString('en-GB') : '—',
                                desc: r.desc,
                                charge: r.charge > 0 ? `$${r.charge.toLocaleString()}` : '—',
                                payment: r.payment > 0 ? `$${r.payment.toLocaleString()}` : '—',
                                balance: `$${r.balance.toLocaleString()}`,
                              }));
                              exportTableToExcel({ sheetName: 'Statement', filename: `Statement_${payStudent?.studentNumber}_${todayISO()}.xlsx`, columns: cols, rows });
                            }}>
                              <FileSpreadsheet size={12} /> Excel
                            </button>
                            <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => {
                              const cols = [
                                { header: 'Date', value: (r: any) => r.date },
                                { header: 'Description', value: (r: any) => r.desc },
                                { header: 'Charge', value: (r: any) => r.charge },
                                { header: 'Payment', value: (r: any) => r.payment },
                                { header: 'Balance', value: (r: any) => r.balance },
                              ];
                              const rows = statementRows.map(r => ({
                                date: r.date ? new Date(r.date).toLocaleDateString('en-GB') : '—',
                                desc: r.desc,
                                charge: r.charge > 0 ? `$${r.charge.toLocaleString()}` : '—',
                                payment: r.payment > 0 ? `$${r.payment.toLocaleString()}` : '—',
                                balance: `$${r.balance.toLocaleString()}`,
                              }));
                              exportTableToWord({ title: `Account Statement — ${payStudent?.firstName} ${payStudent?.surname}`, filename: `Statement_${payStudent?.studentNumber}_${todayISO()}.docx`, columns: cols, rows });
                            }}>
                              <FileText size={12} /> Word
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Payment form */}
                      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px 24px' }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>Record Payment</h3>

                        {paySuccess && (
                          <div style={{ padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>
                              ✅ Payment of ${Number(paySuccess.form.amount).toLocaleString()} recorded via {paySuccess.form.method}
                            </span>
                            <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={printReceipt}>
                              <Printer size={13} /> Print Receipt
                            </button>
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label style={lbl}>Amount ($) *</label>
                            <input type="number" value={payForm.amount} onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
                              placeholder="0.00" min="0" className="text-field" style={fld} />
                          </div>
                          <div>
                            <label style={lbl}>Payment Method</label>
                            <select value={payForm.method} onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))}
                              className="text-field" style={{ ...fld, appearance: 'auto', cursor: 'pointer' }}>
                              {PAY_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={lbl}>Reference Number</label>
                            <input type="text" value={payForm.reference} onChange={(e) => setPayForm((p) => ({ ...p, reference: e.target.value }))}
                              placeholder="Receipt / transaction ref" className="text-field" style={fld} />
                          </div>
                          <div>
                            <label style={lbl}>Payment Date</label>
                            <input type="date" value={payForm.date} onChange={(e) => setPayForm((p) => ({ ...p, date: e.target.value }))}
                              className="text-field" style={fld} />
                          </div>
                        </div>

                        <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
                          <button className="btn btn-primary" style={{ fontSize: 13, padding: '10px 24px', opacity: paySubmitting ? 0.7 : 1 }}
                            onClick={handleRecordPayment} disabled={paySubmitting}>
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
                <div style={{ textAlign: 'center', padding: '56px', color: '#64748b' }}>
                  <CreditCard size={36} style={{ margin: '0 auto 12px', color: '#94a3b8', display: 'block' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Search for a student to record a payment</p>
                  <p style={{ fontSize: 12, margin: 0, color: '#94a3b8' }}>Type a name or student number in the search bar above.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ════ ADD FEE ITEM MODAL ════ */}
      {isAddOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setIsAddOpen(false)}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Add Fee Item</h2>
              <button onClick={() => setIsAddOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Item Name *</label>
                <input type="text" value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Tuition Fee, Lab Fee" className="text-field" style={fld}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFeeItem()} />
              </div>
              <div>
                <label style={lbl}>Category</label>
                <select value={newItem.type} onChange={(e) => setNewItem((p) => ({ ...p, type: e.target.value }))}
                  className="text-field" style={{ ...fld, appearance: 'auto', cursor: 'pointer' }}>
                  {CATEGORY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                <button className="btn btn-secondary" onClick={() => setIsAddOpen(false)} disabled={addingItem}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddFeeItem} disabled={addingItem} style={{ opacity: addingItem ? 0.7 : 1 }}>
                  {addingItem ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ BULK CHARGE MODAL ════ */}
      {isBulkOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setIsBulkOpen(false)}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Bulk Charge</h2>
                <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>{activeTerm?.name} · Apply to multiple students at once</p>
              </div>
              <button onClick={() => setIsBulkOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Fee Item *</label>
                <select value={bulkCatId} onChange={(e) => { const id = Number(e.target.value); setBulkCatId(id || ''); setBulkAmount(feeAmounts[id] || ''); }}
                  className="text-field" style={{ ...fld, appearance: 'auto', cursor: 'pointer' }}>
                  <option value="">— Select fee item —</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}{feeAmounts[c.id] ? ` — $${feeAmounts[c.id]}` : ''}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Amount ($) *</label>
                <input type="number" value={bulkAmount} onChange={(e) => setBulkAmount(e.target.value)}
                  placeholder="0.00" min="0" className="text-field" style={fld} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Campus Filter</label>
                  <select value={bulkCampus} onChange={(e) => setBulkCampus(e.target.value)}
                    className="text-field" style={{ ...fld, appearance: 'auto', cursor: 'pointer' }}>
                    <option value="All">All Campuses</option>
                    {['AHJ', 'AHA', 'AHS'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Form Filter</label>
                  <select value={bulkForm} onChange={(e) => setBulkForm(e.target.value)}
                    className="text-field" style={{ ...fld, appearance: 'auto', cursor: 'pointer' }}>
                    <option value="All">All Forms</option>
                    {availForms.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              {/* Preview */}
              <div style={{ padding: '12px 14px', background: bulkMatched.length > 0 ? '#eef2ff' : '#f8fafc', borderRadius: '8px', border: `1px solid ${bulkMatched.length > 0 ? '#c7d2fe' : '#e2e8f0'}` }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: bulkMatched.length > 0 ? '#1a237e' : '#64748b' }}>
                  {bulkMatched.length > 0
                    ? `This will charge ${bulkMatched.length} student${bulkMatched.length !== 1 ? 's' : ''} $${Number(bulkAmount || 0).toLocaleString()} each — total $${(bulkMatched.length * Number(bulkAmount || 0)).toLocaleString()}`
                    : 'No students match the selected filters'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                <button className="btn btn-secondary" onClick={() => setIsBulkOpen(false)} disabled={bulkApplying}>Cancel</button>
                <button className="btn btn-primary" onClick={handleBulkCharge}
                  disabled={bulkApplying || bulkMatched.length === 0 || !bulkCatId || !bulkAmount}
                  style={{ opacity: (bulkApplying || bulkMatched.length === 0) ? 0.6 : 1 }}>
                  {bulkApplying ? `Charging ${bulkMatched.length} students...` : `Apply to ${bulkMatched.length} Student${bulkMatched.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ INDIVIDUAL CHARGE MODAL ════ */}
      {isIndivOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setIsIndivOpen(false)}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Individual Charge</h2>
              <button onClick={() => setIsIndivOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Student selector */}
              <div>
                <label style={lbl}>Student *</label>
                {indivStudent ? (
                  <div style={{ padding: '10px 12px', background: '#eef2ff', borderRadius: '8px', border: '1px solid #c7d2fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: 13 }}>{indivStudent.firstName} {indivStudent.surname}</strong>
                      <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontFamily: 'ui-monospace, monospace' }}>{indivStudent.studentNumber}</p>
                    </div>
                    <button onClick={() => { setIndivStudent(null); setIndivSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <div className="field-wrap">
                      <span className="field-icon field-icon-left"><Search size={13} /></span>
                      <input type="text" value={indivSearch} onChange={(e) => setIndivSearch(e.target.value)}
                        placeholder="Type name or number..." className="text-field with-right" />
                      {indivSearch && <button className="field-icon field-icon-right" onClick={() => setIndivSearch('')}><X size={12} /></button>}
                    </div>
                    {indivResults.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100, marginTop: 4, overflow: 'hidden' }}>
                        {indivResults.map((s: any) => (
                          <div key={s.id} onClick={() => { setIndivStudent(s); setIndivSearch(''); }}
                            style={{ padding: '9px 12px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}>
                            <div className="mini-avatar" style={{ width: 26, height: 26, fontSize: 10, flexShrink: 0 }}>{s.firstName?.[0]}{s.surname?.[0]}</div>
                            <div>
                              <strong style={{ fontSize: 12 }}>{s.firstName} {s.surname}</strong>
                              <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontFamily: 'ui-monospace, monospace' }}>{s.studentNumber}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Description / fee item */}
              <div>
                <label style={lbl}>Description / Fee Item</label>
                <select value={indivCatId} onChange={(e) => { const id = Number(e.target.value) || ''; setIndivCatId(id); const cat = categories.find((c: any) => c.id === Number(e.target.value)); if (cat) setIndivDesc(cat.name); }}
                  className="text-field" style={{ ...fld, appearance: 'auto', cursor: 'pointer', marginBottom: 6 }}>
                  <option value="">— Select from library —</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="text" value={indivDesc} onChange={(e) => setIndivDesc(e.target.value)}
                  placeholder="Or type custom description..." className="text-field" style={fld} />
              </div>

              <div>
                <label style={lbl}>Amount ($) *</label>
                <input type="number" value={indivAmount} onChange={(e) => setIndivAmount(e.target.value)}
                  placeholder="0.00" min="0" className="text-field" style={fld} />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                <button className="btn btn-secondary" onClick={() => setIsIndivOpen(false)} disabled={indivApplying}>Cancel</button>
                <button className="btn btn-primary" onClick={handleIndividualCharge}
                  disabled={indivApplying || !indivStudent}
                  style={{ opacity: (indivApplying || !indivStudent) ? 0.6 : 1 }}>
                  {indivApplying ? 'Applying...' : 'Add Charge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ SEND INVOICE EMAIL MODAL ════ */}
      {emailModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
          onClick={() => setEmailModal(null)}>
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', width: '100%', maxWidth: '420px' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Send Invoice</h2>
                <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>{emailModal.studentName}</p>
              </div>
              <button onClick={() => setEmailModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', display: 'block', marginBottom: '5px' }}>
                  Send Invoice to:
                </label>
                <input
                  type="email"
                  value={emailAddr}
                  onChange={(e) => setEmailAddr(e.target.value)}
                  placeholder="parent@example.com"
                  className="text-field"
                  style={{ paddingLeft: 12, paddingRight: 12 }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendInvoiceEmail()}
                  autoFocus
                />
                {!emailAddr && (
                  <p style={{ fontSize: 11, color: '#f59e0b', margin: '4px 0 0' }}>
                    ⚠ No email address found for this student. Enter one manually.
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                <button className="btn btn-secondary" onClick={() => setEmailModal(null)} disabled={emailSending}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleSendInvoiceEmail}
                  disabled={emailSending || !emailAddr.trim()}
                  style={{ opacity: (emailSending || !emailAddr.trim()) ? 0.6 : 1 }}
                >
                  {emailSending ? 'Sending...' : '📧 Send Invoice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </AdminLayout>
  );
}
