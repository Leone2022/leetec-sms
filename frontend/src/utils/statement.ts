import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface StatementRow {
  date: string;
  desc: string;
  charge: number;
  payment: number;
  balance: number;
}

export interface StatementStudent {
  firstName: string;
  surname: string;
  studentNumber: string;
  form: string;
}

function getBankDetails(studentNumber: string) {
  const campus = (studentNumber || '').split('/')[0];
  if (campus === 'AHJ') {
    return { name: 'Advent Hope Junior', branch: 'Msasa', nostro: '413400324548405', zwl: '4134324548080' };
  }
  return { name: 'Advent Hope Academy', branch: 'Msasa', nostro: '413400523382405', zwl: '413400523382200' };
}

export function buildStatementRows(invoices: any[]): StatementRow[] {
  const raw: { date: string; desc: string; charge: number; payment: number }[] = [];

  for (const inv of invoices) {
    for (const item of (inv.items || []))
      raw.push({
        date: inv.issuedDate || inv.createdAt || '',
        desc: item.description || item.category?.name || '—',
        charge: Number(item.amount || 0),
        payment: 0,
      });
    for (const pmt of (inv.payments || []))
      raw.push({
        date: pmt.paymentDate || pmt.postedAt || '',
        desc: `Payment — ${pmt.paymentMethod || 'Cash'}${pmt.receiptNumber ? ` (${pmt.receiptNumber})` : ''}`,
        charge: 0,
        payment: Number(pmt.amount || 0),
      });
  }

  raw.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let bal = 0;
  return raw.map(r => {
    bal += r.charge - r.payment;
    return { ...r, balance: bal };
  });
}

export function generateStatementPdf(student: StatementStudent, rows: StatementRow[]) {
  if (rows.length === 0) return;

  const doc = new jsPDF();
  const today = new Date().toLocaleDateString('en-GB');
  const studentName = `${student.firstName} ${student.surname}`;
  const bank = getBankDetails(student.studentNumber);
  const finalBal = rows[rows.length - 1].balance;

  const totalCharged = rows.reduce((s, r) => s + r.charge, 0);
  const totalPaid = rows.reduce((s, r) => s + r.payment, 0);

  // Navy banner
  doc.setFillColor(26, 35, 126);
  doc.rect(0, 0, 210, 42, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text('Advent Hope Academy', 14, 17);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('64 Jason Moyo Ave, Harare  |  Tel: +263 773 102 003  |  adventhope01@gmail.com', 14, 26);
  doc.text(`Bank: ZB Bank, ${bank.branch}  |  NOSTRO: ${bank.nostro}`, 14, 34);
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('ACCOUNT STATEMENT', 196, 22, { align: 'right' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${today}`, 196, 32, { align: 'right' });

  doc.setTextColor(0); doc.setFont('helvetica', 'normal');

  // Student info header
  autoTable(doc, {
    startY: 50,
    head: [['Student Name', 'Student Number', 'Form']],
    body: [[studentName, student.studentNumber, student.form || '—']],
    theme: 'plain',
    headStyles: { fillColor: [26, 35, 126], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 4 },
  });

  // Statement table
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    head: [['Date', 'Description', 'Charge', 'Payment', 'Balance']],
    body: rows.map(r => [
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
  doc.text(`Bank: ZB Bank  |  Branch: ${bank.branch}  |  Name: ${bank.name}`, 14, footY + 15);
  doc.text(`NOSTRO: ${bank.nostro}  |  ZWL: ${bank.zwl}`, 14, footY + 22);
  doc.setFontSize(8); doc.setTextColor(150);
  doc.text('This is a computer generated statement.', 105, footY + 30, { align: 'center' });

  doc.save(`Statement_${student.studentNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
}
