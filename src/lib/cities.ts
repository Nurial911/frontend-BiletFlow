import type { Venue } from "../api/types";
import type { Language } from "./language";

export const cities = [
  { id: "almaty", ru: "Алматы", kk: "Алматы", en: "Almaty", aliases: ["алматы", "алма-ата", "almaty", "alma-ata"] },
  { id: "astana", ru: "Астана", kk: "Астана", en: "Astana", aliases: ["астана", "astana", "нур-султан", "nur-sultan"] },
  { id: "shymkent", ru: "Шымкент", kk: "Шымкент", en: "Shymkent", aliases: ["шымкент", "чимкент", "shymkent"] },
  { id: "karaganda", ru: "Караганда", kk: "Қарағанды", en: "Karaganda", aliases: ["караганда", "қарағанды", "karaganda", "karagandy"] },
  { id: "aktobe", ru: "Актобе", kk: "Ақтөбе", en: "Aktobe", aliases: ["актобе", "ақтөбе", "aktobe"] },
  { id: "atyrau", ru: "Атырау", kk: "Атырау", en: "Atyrau", aliases: ["атырау", "atyrau"] },
  { id: "aktau", ru: "Актау", kk: "Ақтау", en: "Aktau", aliases: ["актау", "ақтау", "aktau"] },
  { id: "taraz", ru: "Тараз", kk: "Тараз", en: "Taraz", aliases: ["тараз", "taraz"] },
  { id: "pavlodar", ru: "Павлодар", kk: "Павлодар", en: "Pavlodar", aliases: ["павлодар", "pavlodar"] },
  { id: "kokshetau", ru: "Кокшетау", kk: "Көкшетау", en: "Kokshetau", aliases: ["кокшетау", "көкшетау", "kokshetau"] },
  { id: "kostanay", ru: "Костанай", kk: "Қостанай", en: "Kostanay", aliases: ["костанай", "қостанай", "kostanay"] },
  { id: "kyzylorda", ru: "Кызылорда", kk: "Қызылорда", en: "Kyzylorda", aliases: ["кызылорда", "қызылорда", "kyzylorda"] },
  { id: "oral", ru: "Уральск", kk: "Орал", en: "Oral", aliases: ["уральск", "орал", "uralsk", "oral"] },
  { id: "oskemen", ru: "Усть-Каменогорск", kk: "Өскемен", en: "Oskemen", aliases: ["усть-каменогорск", "өскемен", "oskemen", "ust-kamenogorsk"] },
  { id: "semey", ru: "Семей", kk: "Семей", en: "Semey", aliases: ["семей", "semey"] },
  { id: "petropavl", ru: "Петропавловск", kk: "Петропавл", en: "Petropavl", aliases: ["петропавловск", "петропавл", "petropavl", "petropavlovsk"] },
  { id: "turkistan", ru: "Туркестан", kk: "Түркістан", en: "Turkistan", aliases: ["туркестан", "түркістан", "turkistan"] },
  { id: "taldykorgan", ru: "Талдыкорган", kk: "Талдықорған", en: "Taldykorgan", aliases: ["талдыкорган", "талдықорған", "taldykorgan"] },
  { id: "zhezkazgan", ru: "Жезказган", kk: "Жезқазған", en: "Zhezkazgan", aliases: ["жезказган", "жезқазған", "zhezkazgan"] },
];
export function venueCity(venue?: Pick<Venue, "address">): string | null {
  const address = venue?.address?.toLowerCase() ?? "";
  // A selected city is saved at the start of new venue addresses. Prefer it
  // over city names occurring later in street names or other address details.
  const explicit = addressCityPrefix(address);
  if (explicit) return explicit;
  return cities.find(city => city.aliases.some(alias => new RegExp(`(^|[^\\p{L}\\p{N}])${alias}($|[^\\p{L}\\p{N}])`, "u").test(address)))?.id ?? null;
}
export function addressCityPrefix(address: string): string | null {
  const text = address.trim().toLowerCase();
  return cities.find(city => city.aliases.some(alias => new RegExp(`^(?:г\\.?\\s*)?${alias}(?:\\s*,|$)`, "u").test(text)))?.id ?? null;
}
export const cityLabel = (id: string, language: Language) => cities.find(city => city.id === id)?.[language];
export function catalogParams(params: URLSearchParams) {
  const next = new URLSearchParams();
  for (const key of ["q", "category", "date", "city", "lang", "promo"]) {
    const value = params.get(key);
    if (value) next.set(key, value);
  }
  return next;
}
