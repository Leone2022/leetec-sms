// Junior School (AHJ, Cambridge Checkpoint) marks are out of 50 with performance bands.
// They have always been STORED doubled, as a percentage (e.g. 76 for 38/50): the report card
// halves them for display. Teachers see and type marks out of 50; these helpers convert at the
// edges so stored data, reports and past terms are unchanged.
// Keep checkpointBand in sync with ReportCardService.GetBand (backend).

export const CHECKPOINT_MAX = 50;

export const isCheckpointCampus = (campus?: string | null) => (campus ?? '').toUpperCase() === 'AHJ';

/** Stored percentage → mark out of 50, as shown to teachers. */
export const storedToOutOf50 = (stored: number) => Math.round((stored / 2) * 10) / 10;

/** Mark out of 50 typed by a teacher → stored percentage. */
export const outOf50ToStored = (mark: number) => Math.round(mark * 2 * 10) / 10;

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
