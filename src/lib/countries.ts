// Countries where most Egyptians abroad live, Gulf first.
export const COUNTRIES = [
  { code: "SA", name: "السعودية", flag: "🇸🇦" },
  { code: "AE", name: "الإمارات", flag: "🇦🇪" },
  { code: "KW", name: "الكويت", flag: "🇰🇼" },
  { code: "QA", name: "قطر", flag: "🇶🇦" },
  { code: "OM", name: "عُمان", flag: "🇴🇲" },
  { code: "BH", name: "البحرين", flag: "🇧🇭" },
  { code: "JO", name: "الأردن", flag: "🇯🇴" },
  { code: "LB", name: "لبنان", flag: "🇱🇧" },
  { code: "IQ", name: "العراق", flag: "🇮🇶" },
  { code: "LY", name: "ليبيا", flag: "🇱🇾" },
  { code: "MA", name: "المغرب", flag: "🇲🇦" },
  { code: "DZ", name: "الجزائر", flag: "🇩🇿" },
  { code: "TN", name: "تونس", flag: "🇹🇳" },
  { code: "SD", name: "السودان", flag: "🇸🇩" },
  { code: "TR", name: "تركيا", flag: "🇹🇷" },
  { code: "US", name: "أمريكا", flag: "🇺🇸" },
  { code: "CA", name: "كندا", flag: "🇨🇦" },
  { code: "GB", name: "بريطانيا", flag: "🇬🇧" },
  { code: "DE", name: "ألمانيا", flag: "🇩🇪" },
  { code: "FR", name: "فرنسا", flag: "🇫🇷" },
  { code: "IT", name: "إيطاليا", flag: "🇮🇹" },
  { code: "NL", name: "هولندا", flag: "🇳🇱" },
  { code: "BE", name: "بلجيكا", flag: "🇧🇪" },
  { code: "AT", name: "النمسا", flag: "🇦🇹" },
  { code: "CH", name: "سويسرا", flag: "🇨🇭" },
  { code: "ES", name: "إسبانيا", flag: "🇪🇸" },
  { code: "GR", name: "اليونان", flag: "🇬🇷" },
  { code: "SE", name: "السويد", flag: "🇸🇪" },
  { code: "IE", name: "أيرلندا", flag: "🇮🇪" },
  { code: "AU", name: "أستراليا", flag: "🇦🇺" },
  { code: "NZ", name: "نيوزيلندا", flag: "🇳🇿" },
  { code: "CN", name: "الصين", flag: "🇨🇳" },
  { code: "JP", name: "اليابان", flag: "🇯🇵" },
  { code: "MY", name: "ماليزيا", flag: "🇲🇾" },
  { code: "ZA", name: "جنوب أفريقيا", flag: "🇿🇦" },
  { code: "NG", name: "نيجيريا", flag: "🇳🇬" },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];

const byCode = new Map<string, (typeof COUNTRIES)[number]>(COUNTRIES.map((c) => [c.code, c]));

export function isCountryCode(code: string): code is CountryCode {
  return byCode.has(code);
}

export function countryLabel(code: string) {
  const c = byCode.get(code);
  return c ? `${c.flag} ${c.name}` : code;
}
