// Helpers for showing dates and prices the way the Figma design shows them.
// Kazakhstan uses one time zone, so all times are shown in Asia/Almaty.

const TZ = "Asia/Almaty";
const KAZAKH_MONTHS = ["қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым", "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан"];
const KAZAKH_WEEKDAYS = ["Жс", "Дс", "Сс", "Ср", "Бс", "Жм", "Сб"];
function kazakhDate(iso: string, includeYear: boolean) {
  // Some embedded browsers ship without Kazakh ICU data and return "M11".
  const key = dayKey(parseDate(iso));
  const [year, month, day] = key.split("-").map(Number);
  return `${day} ${KAZAKH_MONTHS[month - 1]}${includeYear ? ` ${year}` : ""}`;
}

// If the backend sends a date without a time zone ("2026-09-11T20:00:00"),
// treat it as Kazakhstan time.
export function parseDate(iso: string): Date {
  // Daily sales use LocalDate (YYYY-MM-DD), unlike event LocalDateTime.
  // A timezone suffix is valid only after a time component.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(`${iso}T00:00:00+05:00`);
  const hasZone = /([zZ]|[+-]\d\d:?\d\d)$/.test(iso);
  return new Date(hasZone ? iso : `${iso}+05:00`);
}

// "11 сентября 2026"
export function formatLongDate(iso: string, locale = "ru-RU"): string {
  if (locale.startsWith("kk")) return kazakhDate(iso, true);
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: TZ })
    .format(parseDate(iso))
    .replace(/\s?г\.?$/, "");
}

// "15 ноября"
export function formatShortDate(iso: string, locale = "ru-RU"): string {
  if (locale.startsWith("kk")) return kazakhDate(iso, false);
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: TZ }).format(parseDate(iso));
}

// "20:00"
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(parseDate(iso));
}

export function formatDateTime(iso: string, locale = "ru-RU"): string {
  return `${formatLongDate(iso, locale)}, ${formatTime(iso)}`;
}

// "2026-10-24" — used to compare days in the date strip
export function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: TZ }).format(date);
}

// "Пн"
export function weekdayShort(date: Date, locale = "ru-RU"): string {
  if (locale.startsWith("kk")) return KAZAKH_WEEKDAYS[new Date(`${dayKey(date)}T12:00:00+05:00`).getUTCDay()];
  const w = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: TZ }).format(date);
  return w.charAt(0).toUpperCase() + w.slice(1);
}

// "14 000 ₸"
export function formatPrice(kzt: number, locale = "ru-RU"): string {
  return `${new Intl.NumberFormat(locale.startsWith("kk") ? "ru-RU" : locale, { maximumFractionDigits: 2 }).format(kzt)} ₸`;
}

// The backend stores category as free text. Known codes get a Russian label,
// anything else is shown as typed.
const CATEGORY_LABELS: Record<string, string> = {
  concert: "Концерты", concerts: "Концерты",
  theatre: "Театры", theater: "Театры",
  cinema: "Кино", movie: "Кино",
  comedy: "Юмор", humor: "Юмор",
  museum: "Музеи и Выставки", exhibition: "Музеи и Выставки",
  kids: "Детям", children: "Детям",
  sport: "Спорт", sports: "Спорт",
  leisure: "Досуг",
  show: "Шоу",
  education: "Образование",
  music: "Музыка",
  festival: "Фестивали",
};

const LOCALIZED_CATEGORIES: Record<string, { kk: string; en: string }> = {
  "Концерты": { kk: "Концерттер", en: "Concerts" }, "Театры": { kk: "Театрлар", en: "Theatre" }, "Кино": { kk: "Кино", en: "Cinema" },
  "Юмор": { kk: "Әзіл", en: "Comedy" }, "Музеи и Выставки": { kk: "Мұражайлар мен көрмелер", en: "Museums and exhibitions" },
  "Детям": { kk: "Балаларға", en: "For children" }, "Спорт": { kk: "Спорт", en: "Sport" }, "Досуг": { kk: "Демалыс", en: "Leisure" },
  "Шоу": { kk: "Шоу", en: "Shows" }, "Образование": { kk: "Білім", en: "Education" }, "Музыка": { kk: "Музыка", en: "Music" }, "Фестивали": { kk: "Фестивальдер", en: "Festivals" },
};
const CATEGORY_ALIASES: Record<string, string> = { "концерт": "Концерты", "театр": "Театры", "музей": "Музеи и Выставки", "выставка": "Музеи и Выставки", "фестиваль": "Фестивали" };
export function categoryLabel(category: string, locale = "ru-RU"): string {
  const key = category.trim().toLowerCase();
  const known = CATEGORY_LABELS[key] ?? CATEGORY_ALIASES[key] ?? Object.keys(LOCALIZED_CATEGORIES).find(label => label.toLowerCase() === key);
  if (known) return locale.startsWith("kk") ? LOCALIZED_CATEGORIES[known]?.kk ?? known : locale.startsWith("en") ? LOCALIZED_CATEGORIES[known]?.en ?? known : known;
  return category.charAt(0).toUpperCase() + category.slice(1);
}
