// How marks work for a term + campus. Keep in sync with backend/LeeTec.API/Services/MarkPolicy.cs.
//   'averaged'   — before Term 3 2026: mid-term and end-of-term, Final Mark = their average.
//   'final-only' — Term 3 2026 onward, AHA/AHS: one final (end-of-term) mark, no mid-term.
//   'separate'   — Term 3 2026 onward, AHJ: mid-term and end-of-term are separate assessments with
//                  separate reports (Mid-Term Report / End of Term Report), never added or averaged.
export type MarkMode = 'averaged' | 'final-only' | 'separate';

type TermLike = { year?: number; termNumber?: number } | null | undefined;

export function isFrom2026Term3(term: TermLike): boolean {
  if (!term?.year || !term?.termNumber) return false;
  return term.year > 2026 || (term.year === 2026 && term.termNumber >= 3);
}

export function markMode(term: TermLike, campus?: string | null): MarkMode {
  if (!isFrom2026Term3(term)) return 'averaged';
  return (campus ?? '').toUpperCase() === 'AHJ' ? 'separate' : 'final-only';
}
