import { HOTEL_STARTER_FAQS } from './hotel.js';

const BY_VERTICAL = {
  hotel: HOTEL_STARTER_FAQS,
};

export function getStarterFaqsForVertical(verticalSlug) {
  const key = String(verticalSlug || 'hotel').trim().toLowerCase();
  return BY_VERTICAL[key] || HOTEL_STARTER_FAQS;
}
