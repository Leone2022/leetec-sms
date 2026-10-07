import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface RegisterStudent {
  no: number;
  id: number;
  studentNumber: string;
  surname: string;
  firstName: string;
  gender: string;
  dateOfBirth: string;
  studentType: string;
  curriculum: string;
  guardian: string;
  guardianRelation: string;
  guardianPhone: string;
  registeredForTerm: boolean;
  subjects: string[];
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

const fileBase = (r: ClassRegister) => `${r.campus}_${r.form}_${r.termName}`.replace(/\s+/g, '_');
const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

function header(doc: jsPDF, r: ClassRegister, title: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text(SCHOOL_NAMES[r.campus] ?? 'ADVENT HOPE SCHOOLS', w / 2, 34, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`${title}: ${r.campus} ${r.form}`, w / 2, 52, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`${r.termName}  ·  ${r.total} learners (${r.boys} boys, ${r.girls} girls)  ·  Printed ${today()}`, w / 2, 66, { align: 'center' });
  doc.setTextColor(0);
}

// Class list with guardian contacts, one line per learner.
export function downloadRegisterPdf(r: ClassRegister) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  header(doc, r, 'CLASS REGISTER');
  autoTable(doc, {
    startY: 80,
    head: [['No.', 'Student No.', 'Surname', 'First name', 'Sex', 'Date of birth', 'Day/Boarder', 'Parent / Guardian', 'Phone']],
    body: r.students.map((s) => [s.no, s.studentNumber, s.surname, s.firstName, s.gender, s.dateOfBirth, s.studentType, s.guardian || '—', s.guardianPhone || '—']),
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 4, lineColor: [190, 190, 190], lineWidth: 0.4 },
    columnStyles: { 0: { cellWidth: 28, halign: 'center' }, 4: { halign: 'center' } },
  });
  doc.save(`Class_Register_${fileBase(r)}.pdf`);
}

// Blank attendance sheet: learner names with empty day columns to tick by hand.
export function downloadAttendanceSheetPdf(r: ClassRegister, days = 15) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  header(doc, r, 'ATTENDANCE REGISTER');
  autoTable(doc, {
    startY: 80,
    head: [['No.', 'Learner', ...Array.from({ length: days }, () => '__/__'), 'Days present']],
    body: r.students.map((s) => [s.no, `${s.surname}, ${s.firstName}`, ...Array.from({ length: days }, () => ''), '']),
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' },
    styles: { fontSize: 8, cellPadding: 4, minCellHeight: 16, lineColor: [150, 150, 150], lineWidth: 0.4 },
    columnStyles: { 0: { cellWidth: 26, halign: 'center' }, 1: { cellWidth: 150 } },
  });
  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
  doc.setFontSize(9);
  doc.text('Key:  /  present     O  absent     L  late     E  excused', 40, y);
  doc.text('Class teacher: ______________________     Signature: ______________', 40, y + 18);
  doc.save(`Attendance_Sheet_${fileBase(r)}.pdf`);
}

const sheetRows = (r: ClassRegister) => [
  ['No.', 'Student No.', 'Surname', 'First name', 'Sex', 'Date of birth', 'Day/Boarder', 'Curriculum', 'Parent / Guardian', 'Relation', 'Phone', `Registered for ${r.termName}`, 'Subjects'],
  ...r.students.map((s) => [s.no, s.studentNumber, s.surname, s.firstName, s.gender, s.dateOfBirth, s.studentType, s.curriculum,
    s.guardian, s.guardianRelation, s.guardianPhone, s.registeredForTerm ? 'Yes' : 'No', s.subjects.join(', ')]),
];

function addSheet(wb: XLSX.WorkBook, r: ClassRegister) {
  const ws = XLSX.utils.aoa_to_sheet(sheetRows(r));
  ws['!cols'] = [6, 16, 16, 16, 6, 13, 12, 18, 26, 10, 16, 12, 60].map((wch) => ({ wch }));
  // Sheet names: max 31 chars, no special characters.
  XLSX.utils.book_append_sheet(wb, ws, `${r.campus} ${r.form}`.replace(/[\\/?*[\]:]/g, '-').slice(0, 31));
}

export function downloadRegisterExcel(r: ClassRegister) {
  const wb = XLSX.utils.book_new();
  addSheet(wb, r);
  XLSX.writeFile(wb, `Class_Register_${fileBase(r)}.xlsx`);
}

// Every class in one workbook, one sheet per class.
export function downloadAllRegistersExcel(registers: ClassRegister[], termName: string) {
  const wb = XLSX.utils.book_new();
  registers.forEach((r) => addSheet(wb, r));
  XLSX.writeFile(wb, `Class_Registers_${termName.replace(/\s+/g, '_')}.xlsx`);
}
