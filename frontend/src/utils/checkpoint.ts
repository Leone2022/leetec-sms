// Junior School (AHJ, Cambridge Checkpoint) marks are out of 50 with performance bands.
// From Term 3 2026 teachers enter the actual mark out of 50: it is stored, shown and printed
// exactly as typed. (Earlier terms stored a doubled percentage that the report card halved;
// those terms are left as they were.)
// Keep checkpointBand in sync with ReportCardService.GetBand (backend).

export const CHECKPOINT_MAX = 50;

export const isCheckpointCampus = (campus?: string | null) => (campus ?? '').toUpperCase() === 'AHJ';

/** Performance band for a mark out of 50 (rounded half away from zero, as on the report card). */
export function checkpointBand(markOutOf50: number): string {
  const m = Math.sign(markOutOf50) * Math.round(Math.abs(markOutOf50));
  if (m <= 0) return 'Unclassified';
  if (m <= 10) return 'Basic';
  if (m <= 20) return 'Aspiring';
  if (m <= 30) return 'Good';
  if (m <= 40) return 'High';
  return 'Outstanding';
}
