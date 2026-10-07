// From Term 3 2026 the school records only a final (end-of-term) mark per subject:
// no mid-term test. Earlier terms keep the old mid-term + end-of-term entry.
// Keep in sync with backend/LeeTec.API/Services/MarkPolicy.cs.
export function isFinalMarkOnlyTerm(term?: { year?: number; termNumber?: number } | null): boolean {
  if (!term?.year || !term?.termNumber) return false;
  return term.year > 2026 || (term.year === 2026 && term.termNumber >= 3);
}
