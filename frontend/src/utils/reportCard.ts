import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GRADE_REFERENCE_TABLES, type CurriculumType } from './grading';

// Curriculum-aware grade calculation, kept in sync with the backend's
// ReportCardService.GetGrade. Cambridge (any level) uses a single A*-U scale
// with 9 bands (A*,A,B,C,D,E,F,G,U); ZIMSEC A-Level uses A-F; everything else
// falls back to ZIMSEC O-Level (A-U).
export function calculateGrade(score: number, curriculum: string): string {
  const c = curriculum.toUpperCase();
  if (c.includes('CAMBRIDGE')) {
    if (score >= 90) return 'A*';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    if (score >= 40) return 'E';
    if (score >= 30) return 'F';
    if (score >= 20) return 'G';
    return 'U';
  }
  if (c.includes('A-LEVEL') || c.includes('A LEVEL')) {
    if (score >= 70) return 'A';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 45) return 'D';
    if (score >= 40) return 'E';
    if (score >= 35) return 'O';
    return 'F';
  }
  // ZIMSEC O-Level default
  if (score >= 70) return 'A';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 45) return 'D';
  if (score >= 40) return 'E';
  return 'U';
}

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
  band: string | null;
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

// Cambridge Checkpoint performance-band ranges, mirroring the backend's
// ReportCardService.GetBand exactly. AHJ-specific — not a letter-grade scale.
const AHJ_PERFORMANCE_BANDS: [string, string][] = [
  ['0', 'Unclassified'],
  ['1–10', 'Basic'],
  ['11–20', 'Aspiring'],
  ['21–30', 'Good'],
  ['31–40', 'High'],
  ['41–50', 'Outstanding'],
];

const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '—' : String(v));

// ─── Image loading ──────────────────────────────────────────────────────────

// Vite resolves these at build time — PNGs and JPEGs present in the folder are included.
const logoAssets = import.meta.glob('../assets/logos/*.{png,jpg,jpeg}', {
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
  const watermark = await loadLogo('adventlogo.jpeg');
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
  // term.name already includes the year (e.g. "Term 2 2026") — don't append term.year too.
  const termLabel = term.name.trim();
  // TODO: hardcoded per director's request until the real per-term date is ready.
  const nextTerm = '8 September 2026';

  // Watermark goes first so all content renders on top of it.
  await drawWatermark(doc, pageWidth, pageHeight);

  // Load logos; log which were found.
  const [ahjCrest, cambridgeLogo] = await Promise.all([
    loadLogo('adventlogo.jpeg'),
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
    head: [['Subject', 'Final Mark', 'Band', 'Comments']],
    body: subjects.map(s => {
      const comments = (s.noTerminalExam ? s.midterm.comments : s.endTerm?.comments) || '—';
      const label = s.noTerminalExam
        ? `${s.name} (No Terminal Examination)`
        : `${s.name} (Core Subject)`;
      return [
        label,
        fmt(s.cm),
        s.band || '—',
        comments,
      ];
    }),
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, lineColor: [180, 180, 180], lineWidth: 0.3 },
    columnStyles: {
      1: { halign: 'center', fontStyle: 'bold' },
      2: { halign: 'center' },
    },
  });

  // PART 6 — Performance-band reference table
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text('CAMBRIDGE CHECKPOINT PERFORMANCE BANDS', 14, (doc as any).lastAutoTable.finalY + 10);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 14,
    head: [['SCORE RANGE', 'PERFORMANCE BAND']],
    body: AHJ_PERFORMANCE_BANDS,
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

// ─── AHA / AHS report card (ZIMSEC O-Level/A-Level, and Cambridge AHA/AHS) ──
// Mirrors generateAhjReportCard's layout exactly: watermark, dual-logo header,
// details grid, subject grid, grading-scale reference table, footer. No CM or
// Band column here — Band is Cambridge-Checkpoint-only.

async function generateAhaAhsReportCard(reportData: ReportCardData) {
  const { student, term, subjects, attendance, gradingCurriculum } = reportData;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const studentName = `${student.firstName} ${student.surname}`;
  // term.name already includes the year (e.g. "Term 2 2026") — don't append term.year too.
  const termLabel = term.name.trim();
  // TODO: hardcoded per director's request until the real per-term date is ready.
  const nextTerm = '8 September 2026';

  const schoolName = SCHOOL_NAMES[student.campus] || 'ADVENT HOPE SCHOOLS';
  const isCambridge = gradingCurriculum.toUpperCase().startsWith('CAMBRIDGE');

  // Watermark goes first so all content renders on top of it.
  await drawWatermark(doc, pageWidth, pageHeight);

  // Load logos; log which were found. Advent Hope crest is always shown on
  // the left (no separate AHA/AHS crest file, so this reuses the same Advent
  // Hope Group of Schools logo used for AHJ). The right-hand curriculum logo
  // depends on the student's actual curriculum: Cambridge Assessment for
  // Cambridge IGCSE/A-Level, or the ZIMSEC logo for ZIMSEC O-Level/A-Level.
  const [ahaCrest, curriculumLogo] = await Promise.all([
    loadLogo('adventlogo.jpeg'),
    loadLogo(isCambridge ? 'cambridge-assessment-logo.png' : 'zimsec.png'),
  ]);
  console.log(
    `[ReportCard] Advent Hope crest: ${ahaCrest ? 'found' : 'missing'} | ${isCambridge ? 'Cambridge' : 'ZIMSEC'} logo: ${curriculumLogo ? 'found' : 'missing'}`,
  );

  // HEADER — two-column logos, centered title below
  const LOGO_Y = 8;
  const LOGO_H = 32;
  if (ahaCrest) drawLogoLeft(doc, ahaCrest, 14, LOGO_Y, 35, LOGO_H);
  if (curriculumLogo) drawLogoRight(doc, curriculumLogo, pageWidth - 14, LOGO_Y, 30, LOGO_H);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text(schoolName, pageWidth / 2, 22, { align: 'center' });
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

  // PART 5 — Subject grid
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    head: [['Subject', 'Final Mark', 'Grade', 'Comments']],
    body: subjects
      .filter(s => s.midterm?.total !== null || s.endTerm?.total !== null)
      .map(s => {
        const ca = s.midterm?.total ?? null;
        const written = s.endTerm?.total ?? null;
        const finalMark = ca !== null && written !== null
          ? Math.round((Number(ca) + Number(written)) / 2)
          : ca ?? written;
        const comments = s.endTerm?.comments || s.midterm?.comments || '—';
        return [s.name, fmt(finalMark), s.grade || '—', comments];
      }),
    theme: 'grid',
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, lineColor: [180, 180, 180], lineWidth: 0.3 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'center', fontStyle: 'bold' },
    },
  });

  // PART 6 — Grading scale reference table
  const reference = GRADE_REFERENCE_TABLES[gradingCurriculum];
  if (reference) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(`${gradingCurriculum.toUpperCase()} GRADING SCALE`, 14, (doc as any).lastAutoTable.finalY + 10);
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
  }

  // PART 7 — Footer
  const footY = (doc as any).lastAutoTable.finalY + 14;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120);
  doc.text('This is a computer generated report', pageWidth / 2, footY, { align: 'center' });

  const fileName = `ReportCard_${student.studentNumber}_${termLabel}`.replace(/\s+/g, '_');
  doc.save(`${fileName}.pdf`);
}

// ─── Public entry point ──────────────────────────────────────────────────────

export async function generateReportCard(reportData: ReportCardData) {
  if (reportData.student.campus === 'AHJ') {
    await generateAhjReportCard(reportData);
    return;
  }
  await generateAhaAhsReportCard(reportData);
}
