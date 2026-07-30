export type CurriculumType = 'Cambridge Checkpoint' | 'ZIMSEC O-Level' | 'ZIMSEC A-Level' | 'Cambridge IGCSE' | 'Cambridge A-Level';

// Unified curriculum-aware grading: any curriculum containing "Cambridge" uses
// the single Cambridge scale (A*-U) regardless of level; "A-Level" (checked
// after Cambridge) uses the ZIMSEC A-Level scale (A-F); everything else falls
// back to the ZIMSEC O-Level scale (A-U). Keep in sync with the backend's
// ReportCardService.GetGrade and reportCard.ts's calculateGrade.
export function getGradeForScore(score: number, curriculumType: CurriculumType, _level?: string): string {
  const c = curriculumType.toUpperCase();

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

// Reference tables for report card grading-scale appendices.
// Keep these ranges in sync with getGradeForScore/calculateGrade above.
const CAMBRIDGE_TABLE = {
  headers: ['PERCENTAGE', 'GRADE'],
  rows: [
    ['90–100', 'A*'],
    ['80–89', 'A'],
    ['70–79', 'B'],
    ['60–69', 'C'],
    ['50–59', 'D'],
    ['40–49', 'E'],
    ['30–39', 'F'],
    ['20–29', 'G'],
    ['0–19', 'U'],
  ],
};

const ZIMSEC_O_LEVEL_TABLE = {
  headers: ['GRADE', 'MARK RANGE'],
  rows: [
    ['A', '70–100'],
    ['B', '60–69'],
    ['C', '50–59'],
    ['D', '45–49'],
    ['E', '40–44'],
    ['U', '0–39'],
  ],
};

const ZIMSEC_A_LEVEL_TABLE = {
  headers: ['GRADE', 'MARK RANGE'],
  rows: [
    ['A', '70–100'],
    ['B', '60–69'],
    ['C', '50–59'],
    ['D', '45–49'],
    ['E', '40–44'],
    ['O', '35–39'],
    ['F', '0–34'],
  ],
};

export const GRADE_REFERENCE_TABLES: Record<CurriculumType, { headers: string[]; rows: string[][] }> = {
  'Cambridge Checkpoint': CAMBRIDGE_TABLE,
  'Cambridge IGCSE': CAMBRIDGE_TABLE,
  'Cambridge A-Level': CAMBRIDGE_TABLE,
  'ZIMSEC O-Level': ZIMSEC_O_LEVEL_TABLE,
  'ZIMSEC A-Level': ZIMSEC_A_LEVEL_TABLE,
};
