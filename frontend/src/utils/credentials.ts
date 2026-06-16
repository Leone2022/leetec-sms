import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { exportTableToExcel } from './exportTable';

export interface CredentialRow {
  studentId: number;
  studentNumber: string;
  firstName: string;
  surname: string;
  form: string;
  campus: string;
  portalEmail: string | null;
  portalStatus: string;
  hasPortalAccount: boolean;
}

function sorted(rows: CredentialRow[]): CredentialRow[] {
  return [...rows].sort(
    (a, b) => a.form.localeCompare(b.form) || a.surname.localeCompare(b.surname)
  );
}

function filename(termLabel: string, ext: string): string {
  return `StudentCredentials_${termLabel.replace(/\s+/g, '')}.${ext}`;
}

export function exportCredentialsToPdf(rows: CredentialRow[], termLabel: string): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const portalUrl = `${window.location.origin}/student-login`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ADVENT HOPE — STUDENT PORTAL ACCESS CREDENTIALS', pageW / 2, 36, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(termLabel, pageW / 2, 52, { align: 'center' });

  autoTable(doc, {
    startY: 68,
    head: [['Student No', 'Full Name', 'Form', 'Portal Email', 'Status']],
    body: sorted(rows).map(r => [
      r.studentNumber,
      `${r.firstName} ${r.surname}`,
      r.form,
      r.portalEmail ?? '—',
      r.portalStatus,
    ]),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [26, 35, 126], textColor: 255, halign: 'left' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 150 },
      2: { cellWidth: 80 },
      3: { cellWidth: 150 },
      4: { cellWidth: 65 },
    },
    margin: { left: 36, right: 36 },
    didDrawPage: () => {
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text(
        `Portal URL: ${portalUrl}  —  Contact admin to reset password`,
        36,
        pageH - 18,
      );
      doc.setTextColor(0);
    },
  });

  doc.save(filename(termLabel, 'pdf'));
}

export function exportCredentialsToExcel(rows: CredentialRow[], termLabel: string): void {
  exportTableToExcel({
    sheetName: 'Portal Credentials',
    filename: filename(termLabel, 'xlsx'),
    columns: [
      { header: 'Student No', value: r => r.studentNumber },
      { header: 'Full Name', value: r => `${r.firstName} ${r.surname}` },
      { header: 'Form', value: r => r.form },
      { header: 'Portal Email', value: r => r.portalEmail ?? '' },
      { header: 'Status', value: r => r.portalStatus },
    ],
    rows: sorted(rows),
  });
}
