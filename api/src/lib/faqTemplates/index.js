import { TRANSVERSAL_STARTER_FAQS } from './transversal.js';

/** Pack universal de FAQs para onboarding (independiente del objetivo). */
export function getStarterFaqs() {
  return TRANSVERSAL_STARTER_FAQS;
}

/** @deprecated Use getStarterFaqs — vertical ya no gobierna el pack. */
export function getStarterFaqsForVertical(_verticalSlug) {
  return getStarterFaqs();
}
