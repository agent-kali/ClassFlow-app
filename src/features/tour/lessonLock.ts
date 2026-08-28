/** Block every lesson card from opening while the tour is on a non-edit step. */
export const TOUR_BLOCK_ALL_LESSONS = "__tour_block_all__";

export function resolveTourLessonLock(
  tourActive: boolean,
  tourStep: number,
  tourLessonId: string | null
): string | null {
  if (!tourActive) return null;
  if (tourStep === 1) return tourLessonId ?? TOUR_BLOCK_ALL_LESSONS;
  return TOUR_BLOCK_ALL_LESSONS;
}
