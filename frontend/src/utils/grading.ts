export type CurriculumType = 'Cambridge Checkpoint' | 'ZIMSEC O-Level' | 'ZIMSEC A-Level' | 'Cambridge IGCSE' | 'Cambridge A-Level';

// AHJ Cambridge Checkpoint — score out of 50
function gradeForCheckpoint(score: number): string {
  if (score <= 0) return 'Unclassified';
  if (score <= 10) return 'Basic';
  if (score <= 20) return 'Aspiring';
  if (score <= 30) return 'Good';
  if (score <= 40) return 'High';
  return 'Outstanding';
}

// ZIMSEC O-Level — percentage
function gradeForZimsecOLevel(score: number): string {
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 45) return 'D';
  if (score >= 35) return 'E';
  return 'U';
}

// ZIMSEC A-Level — percentage
function gradeForZimsecALevel(score: number): string {
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 45) return 'D';
  if (score >= 40) return 'E';
  if (score >= 35) return 'O';
  return 'F';
}

// Cambridge IGCSE — percentage
function gradeForCambridgeIgcse(score: number): string {
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

// Cambridge A-Level — percentage
function gradeForCambridgeALevel(score: number): string {
  if (score >= 90) return 'A*';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  if (score >= 40) return 'E';
  return 'U';
}

/**
 * Returns the grade/band label for a score, based on curriculum type.
 * `level` is currently unused but kept for future level-specific grading scales.
 */
export function getGradeForScore(score: number, curriculumType: CurriculumType, _level?: string): string {
  switch (curriculumType) {
    case 'Cambridge Checkpoint':
      return gradeForCheckpoint(score);
    case 'ZIMSEC O-Level':
      return gradeForZimsecOLevel(score);
    case 'ZIMSEC A-Level':
      return gradeForZimsecALevel(score);
    case 'Cambridge IGCSE':
      return gradeForCambridgeIgcse(score);
    case 'Cambridge A-Level':
      return gradeForCambridgeALevel(score);
    default:
      return '';
  }
}

// Reference tables for report card grading-scale appendices.
// Keep these ranges in sync with the gradeFor* functions above.
export const GRADE_REFERENCE_TABLES: Record<CurriculumType, { headers: string[]; rows: string[][] }> = {
  'Cambridge Checkpoint': {
    headers: ['SCORE RANGE', 'PERFORMANCE BAND'],
    rows: [
      ['0', 'Unclassified'],
      ['1–10', 'Basic'],
      ['11–20', 'Aspiring'],
      ['21–30', 'Good'],
      ['31–40', 'High'],
      ['41–50', 'Outstanding'],
    ],
  },
  'ZIMSEC O-Level': {
    headers: ['GRADE', 'MARK RANGE', 'DESCRIPTION'],
    rows: [
      ['A', '75–100', 'Distinction'],
      ['B', '60–74', 'Merit'],
      ['C', '50–59', 'Credit'],
      ['D', '45–49', 'Pass'],
      ['E', '35–44', 'Pass'],
      ['U', '0–34', 'Ungraded'],
    ],
  },
  'ZIMSEC A-Level': {
    headers: ['GRADE', 'MARK RANGE'],
    rows: [
      ['A', '75–100'],
      ['B', '60–74'],
      ['C', '50–59'],
      ['D', '45–49'],
      ['E', '40–44'],
      ['O', '35–39'],
      ['F', '0–34'],
    ],
  },
  'Cambridge IGCSE': {
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
  },
  'Cambridge A-Level': {
    headers: ['PERCENTAGE', 'GRADE'],
    rows: [
      ['90–100', 'A*'],
      ['80–89', 'A'],
      ['70–79', 'B'],
      ['60–69', 'C'],
      ['50–59', 'D'],
      ['40–49', 'E'],
      ['0–39', 'U'],
    ],
  },
};
