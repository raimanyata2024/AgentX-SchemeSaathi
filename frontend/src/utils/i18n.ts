/**
 * Shared trilingual localization helpers for English ('en'), Hindi ('hi'), and Marathi ('mr').
 */

export function pickLang(
  language: string,
  en: string,
  hi: string,
  mr: string
): string {
  if (language === 'hi') return hi;
  if (language === 'mr') return mr;
  return en;
}

const CATEGORY_LABELS_MR: Record<string, string> = {
  '': 'सर्व योजना',
  all: 'सर्व योजना',
  agriculture: 'शेती व शेतकरी',
  education: 'शिक्षण व शिष्यवृत्ती',
  health: 'आरोग्य व विमा',
  housing: 'गृहनिर्माण',
  employment: 'रोजगार',
  women_welfare: 'महिला कल्याण',
  children_welfare: 'बाल कल्याण',
  senior_citizens: 'ज्येष्ठ नागरिक',
  disability: 'दिव्यांग कल्याण',
  financial_inclusion: 'आर्थिक समावेशन',
  social_security: 'सामाजिक सुरक्षा व निवृत्तीवेतन',
  skill_development: 'कौशल्य विकास',
};

export function getCategoryLabel(
  language: string,
  cat: { key: string; labelEn: string; labelHi: string }
): string {
  if (language === 'hi') return cat.labelHi;
  if (language === 'mr') return CATEGORY_LABELS_MR[cat.key] || cat.labelEn;
  return cat.labelEn;
}

const LEGACY_SLUG_TO_SCHEME_CODE: Record<string, string> = {
  'scheme-pm-kisan-01': 'PM-KISAN',
  'scheme-pmjay-03': 'AB-PMJAY',
  'scheme-nmms-04': 'NMMS',
};

export function resolveLookupCodeFromRouteParam(id: string): string {
  const normalized = id.trim();
  return LEGACY_SLUG_TO_SCHEME_CODE[normalized.toLowerCase()] || normalized;
}
