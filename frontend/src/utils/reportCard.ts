import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GRADE_REFERENCE_TABLES, type CurriculumType } from './grading';

interface ReportCardScoreBlock {
  paper1: number | null;
  paper2: number | null;
  total: number | null;
  comments: string;
}

interface ReportCardSubjectResult {
  subjectId: number;
  name: string;
  noTerminalExam: boolean;
  midterm: ReportCardScoreBlock;
  endTerm: ReportCardScoreBlock | null;
  cm: number | null;
  grade: string;
}

export interface ReportCardData {
  student: {
    firstName: string;
    surname: string;
    studentNumber: string;
    form: string;
    campus: string;
    curriculum: string;
  };
  term: {
    name: string;
    year: number;
    nextTermStartDate: string | null;
  };
  usesPapers: boolean;
  gradingCurriculum: CurriculumType;
  subjects: ReportCardSubjectResult[];
  attendance: string | null;
}

const SCHOOL_NAMES: Record<string, string> = {
  AHJ: 'ADVENT HOPE JUNIOR SCHOOL',
  AHA: 'ADVENT HOPE ACADEMY',
  AHS: 'ADVENT HOPE ACADEMY',
};

const NAVY: [number, number, number] = [26, 35, 126];

const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '—' : String(v));

// ─── Image loading ──────────────────────────────────────────────────────────

// Vite resolves these at build time — only PNGs present in the folder are included.
const logoAssets = import.meta.glob('../assets/logos/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

async function loadLogo(filename: string): Promise<string | null> {
  const entry = Object.entries(logoAssets).find(([path]) => path.endsWith(`/${filename}`));
  if (!entry) {
    console.warn(`[ReportCard] Logo not found (add to src/assets/logos/): ${filename}`);
    return null;
  }
  try {
    const res = await fetch(entry[1]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn(`[ReportCard] Failed to load logo "${filename}":`, e);
    return null;
  }
}

// Draws an image scaled to fit within maxW×maxH (mm), preserving aspect ratio.
// Pass rightEdgeX instead of left x to right-align the image.
function drawLogoLeft(doc: jsPDF, dataUrl: string, x: number, y: number, maxW: number, maxH: number) {
  try {
    const props = doc.getImageProperties(dataUrl);
    const ratio = Math.min(maxW / props.width, maxH / props.height);
    doc.addImage(dataUrl, props.fileType, x, y, props.width * ratio, props.height * ratio);
  } catch (e) {
    console.warn('[ReportCard] Failed to draw logo:', e);
  }
}

function drawLogoRight(doc: jsPDF, dataUrl: string, rightEdgeX: number, y: number, maxW: number, maxH: number) {
  try {
    const props = doc.getImageProperties(dataUrl);
    const ratio = Math.min(maxW / props.width, maxH / props.height);
    const w = props.width * ratio;
    doc.addImage(dataUrl, props.fileType, rightEdgeX - w, y, w, props.height * ratio);
  } catch (e) {
    console.warn('[ReportCard] Failed to draw logo:', e);
  }
}

async function drawWatermark(doc: jsPDF, pageWidth: number, pageHeight: number) {
  const watermark = await loadLogo('watermark.png');
  if (!watermark) return;
  try {
    const props = doc.getImageProperties(watermark);
    const maxSize = 150;
    const ratio = Math.min(maxSize / props.width, maxSize / props.height);
    const w = props.width * ratio;
    const h = props.height * ratio;
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.10 }));
    doc.addImage(watermark, props.fileType, (pageWidth - w) / 2, (pageHeight - h) / 2, w, h);
    doc.restoreGraphicsState();
    console.log('[ReportCard] Watermark rendered at 10% opacity');
  } catch (e) {
    console.warn('[ReportCard] Failed to render watermark:', e);
  }
}

// ─── AHJ report card ────────────────────────────────────────────────────────

async function generateAhjReportCard(reportData: ReportCardData) {
  const { student, term, subjects, attendance } = reportData;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const studentName = `${student.firstName} ${student.surname}`;
  const termLabel = `${term.name} ${term.year}`.trim();
  const nextTerm = term.nextTermStartDate
    ? new Date(term.nextTermStartDate).toLocaleDateString('en-GB')
    : '—';

  // Watermark goes first so all content renders on top of it.
  await drawWatermark(doc, pageWidth, pageHeight);

  // Load logos; log which were found.
  const [ahjCrest, cambridgeLogo] = await Promise.all([
    loadLogo('ahj-crest.png'),
    loadLogo('cambridge-assessment-logo.png'),
  ]);
  console.log(
    `[ReportCard] AHJ crest: ${ahjCrest ? 'found' : 'missing'} | Cambridge logo: ${cambridgeLogo ? 'found' : 'missing'}`,
  );

  // HEADER — two-column logos, centered title below
  const LOGO_Y = 8;
  const LOGO_H = 32;
  if (ahjCrest) drawLogoLeft(doc, ahjCrest, 14, LOGO_Y, 35, LOGO_H);
  if (cambridgeLogo) drawLogoRight(doc, cambridgeLogo, pageWidth - 14, LOGO_Y, 30, LOGO_H);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text('ADVENT HOPE JUNIOR SCHOOL', pageWidth / 2, 22, { align: 'center' });
  doc.setFontSize(12);
  doc.text("LEARNER'S REPORT", pageWidth / 2, 30, { align: 'center' });

  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');

  // PART 4 — Student info grid
  autoTable(doc, {
    startY: 42,
    body: [
      ['Learner Name:', studentName],
      ['Stage:', student.form || '—'],
      ['Term:', termLabel || '—'],
      ['Attendance:', attendance || '—'],
      ['Next Term Begins on:', nextTerm],
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3, lineColor: [180, 180, 180], lineWidth: 0.3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 62, textColor: [60, 60, 60] } },
  });

  // PART 5 — Unified subject grid
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [['Subject', 'Paper 1', 'Paper 2', 'Total', 'CM', 'Band', 'Comments']],
    body: subjects.map(s => {
      const block = s.noTerminalExam ? s.midterm : s.endTerm;
      const comments = (s.noTerminalExam ? s.midterm.comments : s.endTerm?.comments) || '—';
      const label = s.noTerminalExam
        ? `${s.name} (No Terminal Examination)`
        : `${s.name} (Core Subject)`;
      return [
        label,
        fmt(block?.paper1),
        fmt(block?.paper2),
        fmt(block?.total),
        fmt(s.cm),
        s.grade || '—',
        comments,
      ];
    }),
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, lineColor: [180, 180, 180], lineWidth: 0.3 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center', fontStyle: 'bold' },
    },
  });

  // PART 6 — Grading reference table
  const reference = GRADE_REFERENCE_TABLES['Cambridge Checkpoint'];
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('CAMBRIDGE CHECKPOINT PERFORMANCE BANDS', 14, (doc as any).lastAutoTable.finalY + 10);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 14,
    head: [reference.headers],
    body: reference.rows,
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3, lineColor: [180, 180, 180], lineWidth: 0.3 },
    columnStyles: { 0: { halign: 'center' }, 1: { halign: 'center' } },
    margin: { left: 14, right: 120 },
  });

  // PART 7 — Footer
  const footY = (doc as any).lastAutoTable.finalY + 14;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120);
  doc.text('This is a computer generated report', pageWidth / 2, footY, { align: 'center' });

  const fileName = `ReportCard_${student.studentNumber}_${termLabel}`.replace(/\s+/g, '_');
  doc.save(`${fileName}.pdf`);
}

// ─── AHA / AHS report card — unchanged ──────────────────────────────────────

function generateAhaAhsReportCard(reportData: ReportCardData) {
  const { student, term, subjects, attendance, usesPapers, gradingCurriculum } = reportData;
  const doc = new jsPDF();
  const studentName = `${student.firstName} ${student.surname}`;
  const termLabel = `${term.name} ${term.year}`.trim();
  const nextTerm = term.nextTermStartDate
    ? new Date(term.nextTermStartDate).toLocaleDateString('en-GB')
    : '—';

  const schoolName = SCHOOL_NAMES[student.campus] || 'ADVENT HOPE SCHOOLS';

  // Navy banner
  doc.setFillColor(26, 35, 126);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text(schoolName, 14, 16);
  doc.setFontSize(12); doc.setFont('helvetica', 'normal');
  doc.text('STUDENT REPORT', 14, 25);

  doc.setTextColor(0); doc.setFont('helvetica', 'normal');

  // Student info block
  autoTable(doc, {
    startY: 40,
    head: [['Learner Name', 'Stage / Form', 'Term', 'Attendance', 'Next Term Begins on']],
    body: [[studentName, student.form || '—', termLabel || '—', attendance || '—', nextTerm]],
    theme: 'plain',
    headStyles: { fillColor: [26, 35, 126], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 4 },
  });

  // Mid-term Test Results
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Mid-term Test Results', 14, (doc as any).lastAutoTable.finalY + 10);

  const midtermHead = usesPapers
    ? ['Subject', 'Paper 1', 'Paper 2', 'Total', 'Comments']
    : ['Subject', 'Score', 'Comments'];

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 14,
    head: [midtermHead],
    body: subjects.map(s => usesPapers
      ? [s.name, fmt(s.midterm.paper1), fmt(s.midterm.paper2), fmt(s.midterm.total), s.midterm.comments || '—']
      : [s.name, fmt(s.midterm.total), s.midterm.comments || '—']),
    theme: 'striped',
    headStyles: { fillColor: [26, 35, 126], textColor: 255 },
    styles: { fontSize: 9 },
    columnStyles: usesPapers
      ? { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } }
      : { 1: { halign: 'center' } },
  });

  // End of Term Exam Results
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('End of Term Exam Results', 14, (doc as any).lastAutoTable.finalY + 10);

  const endTermHead = usesPapers
    ? ['Subject', 'Paper 1', 'Paper 2', 'Total', 'CM', 'Grade', 'Comments']
    : ['Subject', 'Score', 'CM', 'Grade', 'Comments'];

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 14,
    head: [endTermHead],
    body: subjects.map(s => {
      if (s.noTerminalExam) {
        return usesPapers
          ? [s.name, '—', '—', '—', fmt(s.cm), s.grade || '—', 'No Terminal Examination']
          : [s.name, '—', fmt(s.cm), s.grade || '—', 'No Terminal Examination'];
      }
      return usesPapers
        ? [s.name, fmt(s.endTerm?.paper1), fmt(s.endTerm?.paper2), fmt(s.endTerm?.total), fmt(s.cm), s.grade || '—', s.endTerm?.comments || '—']
        : [s.name, fmt(s.endTerm?.total), fmt(s.cm), s.grade || '—', s.endTerm?.comments || '—'];
    }),
    theme: 'striped',
    headStyles: { fillColor: [26, 35, 126], textColor: 255 },
    styles: { fontSize: 9 },
    columnStyles: usesPapers
      ? { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' } }
      : { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
  });

  // Grading scale reference
  const reference = GRADE_REFERENCE_TABLES[gradingCurriculum];
  if (reference) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(`${gradingCurriculum} Grading Scale`, 14, (doc as any).lastAutoTable.finalY + 10);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 14,
      head: [reference.headers],
      body: reference.rows,
      theme: 'plain',
      headStyles: { fillColor: [26, 35, 126], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { halign: 'center' }, 1: { halign: 'center' } },
      margin: { left: 14, right: 120 },
    });
  }

  // Footer
  const footY = (doc as any).lastAutoTable.finalY + 14;
  doc.setFontSize(8); doc.setTextColor(150);
  doc.text('This is a computer generated report', 105, footY, { align: 'center' });

  const fileName = `ReportCard_${student.studentNumber}_${termLabel}`.replace(/\s+/g, '_');
  doc.save(`${fileName}.pdf`);
}

// ─── Public entry point ──────────────────────────────────────────────────────

export async function generateReportCard(reportData: ReportCardData) {
  if (reportData.student.campus === 'AHJ') {
    await generateAhjReportCard(reportData);
    return;
  }
  generateAhaAhsReportCard(reportData);
}
