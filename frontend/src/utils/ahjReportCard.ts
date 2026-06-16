import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AhjScoreBlock {
  paper1: number | null;
  paper2: number | null;
  total: number | null;
}

interface AhjSubjectResult {
  subjectId: number;
  name: string;
  noTerminalExam: boolean;
  midterm: AhjScoreBlock;
  endTerm: AhjScoreBlock | null;
  cm: number | null;
  band: string;
  comments: string;
}

export interface AhjReportCardData {
  student: {
    firstName: string;
    surname: string;
    studentNumber: string;
    form: string;
    curriculum: string;
  };
  term: {
    name: string;
    year: number;
    nextTermStartDate: string | null;
  };
  subjects: AhjSubjectResult[];
  attendance: string | null;
}

const PERFORMANCE_BANDS: [string, string][] = [
  ['0', 'Unclassified'],
  ['1–10', 'Basic'],
  ['11–20', 'Aspiring'],
  ['21–30', 'Good'],
  ['31–40', 'High'],
  ['41–50', 'Outstanding'],
];

const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '—' : String(v));

export function generateAHJReportCard(reportData: AhjReportCardData) {
  const { student, term, subjects, attendance } = reportData;
  const doc = new jsPDF();
  const studentName = `${student.firstName} ${student.surname}`;
  const termLabel = `${term.name} ${term.year}`.trim();
  const nextTerm = term.nextTermStartDate
    ? new Date(term.nextTermStartDate).toLocaleDateString('en-GB')
    : '—';

  // Navy banner
  doc.setFillColor(26, 35, 126);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('ADVENT HOPE JUNIOR SCHOOL', 14, 16);
  doc.setFontSize(12); doc.setFont('helvetica', 'normal');
  doc.text("LEARNER'S REPORT", 14, 25);

  doc.setTextColor(0); doc.setFont('helvetica', 'normal');

  // Student info block
  autoTable(doc, {
    startY: 40,
    head: [['Learner Name', 'Stage', 'Term', 'Attendance', 'Next Term Begins on']],
    body: [[
      studentName,
      student.form || '—',
      termLabel || '—',
      attendance || '—',
      nextTerm,
    ]],
    theme: 'plain',
    headStyles: { fillColor: [26, 35, 126], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 4 },
  });

  // Mid-term Test Results
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Mid-term Test Results', 14, (doc as any).lastAutoTable.finalY + 10);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 14,
    head: [['Subject', 'Paper 1', 'Paper 2', 'Total', 'Comments']],
    body: subjects.map(s => [
      s.name,
      fmt(s.midterm.paper1),
      fmt(s.midterm.paper2),
      fmt(s.midterm.total),
      s.comments || '—',
    ]),
    theme: 'striped',
    headStyles: { fillColor: [26, 35, 126], textColor: 255 },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
  });

  // End of Term Exam Results
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('End of Term Exam Results', 14, (doc as any).lastAutoTable.finalY + 10);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 14,
    head: [['Subject', 'Paper 1', 'Paper 2', 'Total', 'CM', 'Band', 'Comments']],
    body: subjects.map(s => {
      if (s.noTerminalExam) {
        return [s.name, '—', '—', '—', fmt(s.cm), s.band || '—', 'No Terminal Examination'];
      }
      return [
        s.name,
        fmt(s.endTerm?.paper1),
        fmt(s.endTerm?.paper2),
        fmt(s.endTerm?.total),
        fmt(s.cm),
        s.band || '—',
        s.comments || '—',
      ];
    }),
    theme: 'striped',
    headStyles: { fillColor: [26, 35, 126], textColor: 255 },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' } },
  });

  // Cambridge Checkpoint Performance Bands reference table
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Cambridge Checkpoint Performance Bands', 14, (doc as any).lastAutoTable.finalY + 10);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 14,
    head: [['SCORE RANGE', 'PERFORMANCE BAND']],
    body: PERFORMANCE_BANDS,
    theme: 'plain',
    headStyles: { fillColor: [26, 35, 126], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { halign: 'center' }, 1: { halign: 'center' } },
    margin: { left: 14, right: 120 },
  });

  // Footer
  const footY = (doc as any).lastAutoTable.finalY + 14;
  doc.setFontSize(8); doc.setTextColor(150);
  doc.text('This is a computer generated report.', 105, footY, { align: 'center' });

  const fileName = `ReportCard_${student.studentNumber}_${termLabel}`.replace(/\s+/g, '_');
  doc.save(`${fileName}.pdf`);
}
