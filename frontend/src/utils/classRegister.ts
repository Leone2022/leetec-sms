import jsPDF from 'jspdf';
import autoTable, { type CellHookData } from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface RegisterStudent {
  no: number;
  id: number;
  studentNumber: string;
  surname: string;
  firstName: string;
  gender: string;
  registeredForTerm: boolean;
}

export interface ClassRegister {
  termId: number;
  termName: string;
  campus: string;
  form: string;
  total: number;
  boys: number;
  girls: number;
  students: RegisterStudent[];
}

const SCHOOL_NAMES: Record<string, string> = {
  AHJ: 'ADVENT HOPE JUNIOR SCHOOL',
  AHA: 'ADVENT HOPE ACADEMY',
  AHS: 'ADVENT HOPE ACADEMY (SIXTH FORM)',
};
const NAVY: [number, number, number] = [26, 35, 126];
const WEEKS = 5;
const DAYS = ['M', 'T', 'W', 'T', 'F'];
const BLANK_ROWS = 3; // spare lines for learners who join after printing
const MARGIN = 28;

const fileBase = (r: ClassRegister) => `${r.campus}_${r.form}_${r.termName}`.replace(/\s+/g, '_');

// One class register on the current page(s): names down the left, a square tick box for
// every school day of five weeks across, and a Total column. Long classes continue on a
// new page with the headings repeated.
function drawRegister(doc: jsPDF, r: ClassRegister) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text(SCHOOL_NAMES[r.campus] ?? 'ADVENT HOPE SCHOOLS', pageWidth / 2, 30, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`CLASS REGISTER: ${r.campus} ${r.form}`, pageWidth / 2, 46, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.text(`${r.termName}  ·  ${r.total} learners (${r.boys} boys, ${r.girls} girls)`, MARGIN, 64);
  doc.text('Month: ____________________     Class teacher: ______________________________', pageWidth - MARGIN, 64, { align: 'right' });
  doc.setTextColor(0);

  const boxCount = WEEKS * DAYS.length;
  const noWidth = 24;
  const nameWidth = 170;
  const totalWidth = 36;
  const boxWidth = (pageWidth - 2 * MARGIN - noWidth - nameWidth - totalWidth) / boxCount;
  const firstBox = 2;
  const isBox = (col: number) => col >= firstBox && col < firstBox + boxCount;
  const isWeekStart = (col: number) => isBox(col) && (col - firstBox) % DAYS.length === 0;

  const columnStyles: Record<number, { cellWidth: number; halign?: 'center' | 'left' }> = {
    0: { cellWidth: noWidth, halign: 'center' },
    1: { cellWidth: nameWidth },
    [firstBox + boxCount]: { cellWidth: totalWidth, halign: 'center' },
  };
  for (let i = 0; i < boxCount; i++) columnStyles[firstBox + i] = { cellWidth: boxWidth, halign: 'center' };

  const body = [
    ...r.students.map((s) => [String(s.no), `${s.surname}, ${s.firstName}`, ...Array(boxCount).fill(''), '']),
    ...Array.from({ length: BLANK_ROWS }, (_, i) => [String(r.students.length + i + 1), '', ...Array(boxCount).fill(''), '']),
  ];

  autoTable(doc, {
    startY: 72,
    margin: { left: MARGIN, right: MARGIN, top: 40, bottom: 44 },
    head: [
      [
        { content: 'No.', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Learner', rowSpan: 2, styles: { valign: 'middle' } },
        ...Array.from({ length: WEEKS }, (_, w) => ({ content: `Week ${w + 1}   __/__`, colSpan: DAYS.length, styles: { halign: 'center' as const } })),
        { content: 'Total', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
      ],
      Array.from({ length: WEEKS }, () => DAYS).flat().map((d) => ({ content: d, styles: { halign: 'center' as const } })),
    ],
    body,
    theme: 'grid',
    showHead: 'everyPage',
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7.5, cellPadding: 3, lineColor: [255, 255, 255], lineWidth: 0.4 },
    styles: { fontSize: 8.5, cellPadding: 3, minCellHeight: 17, valign: 'middle', lineColor: [170, 170, 170], lineWidth: 0.4, overflow: 'ellipsize' },
    alternateRowStyles: { fillColor: [247, 248, 252] },
    columnStyles,
    didDrawCell: (data: CellHookData) => {
      if (data.section !== 'body') return;
      const { cell, column } = data;
      if (isBox(column.index)) {
        // The tick box itself: a square centred in the cell.
        const size = Math.min(cell.width, cell.height) - 6;
        doc.setDrawColor(90);
        doc.setLineWidth(0.6);
        doc.rect(cell.x + (cell.width - size) / 2, cell.y + (cell.height - size) / 2, size, size);
      }
      if (isWeekStart(column.index)) {
        // Heavier line between weeks so rows are easy to follow across the page.
        doc.setDrawColor(...NAVY);
        doc.setLineWidth(1.2);
        doc.line(cell.x, cell.y, cell.x, cell.y + cell.height);
      }
    },
    didDrawPage: () => {
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(80);
      doc.text('Key:   /  present     O  absent     L  late     E  excused', MARGIN, pageHeight - 24);
      doc.text('Signature: ______________________', pageWidth - MARGIN, pageHeight - 24, { align: 'right' });
      doc.setTextColor(0);
    },
  });
}

const newDoc = () => new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

// Printable tick-box register for one class.
export function downloadRegisterPdf(r: ClassRegister) {
  const doc = newDoc();
  drawRegister(doc, r);
  doc.save(`Class_Register_${fileBase(r)}.pdf`);
}

// Every class in one PDF, each class starting on a new page.
export function downloadAllRegistersPdf(registers: ClassRegister[], termName: string) {
  const doc = newDoc();
  registers.forEach((r, i) => {
    if (i > 0) doc.addPage();
    drawRegister(doc, r);
  });
  doc.save(`Class_Registers_${termName.replace(/\s+/g, '_')}.pdf`);
}

// Plain class list for anyone who prefers to keep the register in Excel.
export function downloadRegisterExcel(r: ClassRegister) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['No.', 'Surname', 'First name', 'Sex', 'Student No.'],
    ...r.students.map((s) => [s.no, s.surname, s.firstName, s.gender, s.studentNumber]),
  ]);
  ws['!cols'] = [6, 18, 18, 6, 16].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, ws, `${r.campus} ${r.form}`.replace(/[\\/?*[\]:]/g, '-').slice(0, 31));
  XLSX.writeFile(wb, `Class_List_${fileBase(r)}.xlsx`);
}
