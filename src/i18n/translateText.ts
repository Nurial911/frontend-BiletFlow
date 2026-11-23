import messages from "./messages.json";
import type { Language } from "../lib/language";

const catalog: Record<string, readonly string[]> = messages;
const sourceByTranslation = new Map<string, string>();
const templateRules: { source: string; pattern: RegExp; indices: number[]; fixedLength: number }[] = [];
for (const [source, variants] of Object.entries(catalog)) {
  for (const variant of variants) if (!sourceByTranslation.has(variant)) sourceByTranslation.set(variant, source);
  for (const variant of [source, ...variants]) {
    if (!/\{\d+\}/.test(variant)) continue;
    const indices: number[] = [];
    const pattern = variant.split(/(\{\d+\})/g).map(part => {
      if (/^\{\d+\}$/.test(part)) { indices.push(Number(part.slice(1, -1))); return "(.*?)"; }
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("");
    templateRules.push({ source, pattern: new RegExp(`^${pattern}$`, "u"), indices, fixedLength: variant.replace(/\{\d+\}/g, "").length });
  }
}

// Source phrases are keys; organizer-authored content is never passed here.
export function translateText(language: Language, source: string | number | null | undefined, values: readonly unknown[] = []): string {
  if (source === null || source === undefined) return "";
  const text = String(source);
  const key = text.trim().replace(/\s+/g, " ");
  let sourceKey = catalog[key] ? key : sourceByTranslation.get(key);
  let substitutions = values;
  if (!sourceKey && values.length === 0) {
    // When several templates match, the one with the most fixed text wins, so a short
    // template such as "{0} at {1}" cannot take over a longer server message containing " at ".
    let best: { rule: (typeof templateRules)[number]; match: RegExpExecArray } | undefined;
    for (const rule of templateRules) {
      const match = rule.pattern.exec(key);
      if (match && (!best || rule.fixedLength > best.rule.fixedLength)) best = { rule, match };
    }
    if (best) {
      const { rule, match } = best;
      const captured: string[] = [];
      rule.indices.forEach((index, position) => { captured[index] = match[position + 1]; });
      sourceKey = rule.source;
      substitutions = captured;
    }
  }
  const translated = sourceKey ? language === "ru" ? sourceKey : catalog[sourceKey]?.[language === "en" ? 0 : 1] : undefined;
  const result = translated === undefined || (language === "ru" && key === sourceKey) ? text : `${text.match(/^\s*/)?.[0] ?? ""}${translated}${text.match(/\s*$/)?.[0] ?? ""}`;
  return result.replace(/\{(\d+)\}/g, (match, index: string) => Number(index) < substitutions.length ? String(substitutions[Number(index)] ?? "") : match);
}

const STATUS_TEXT: Record<string, string> = {
  SCHEDULED: "Запланировано", ON_HOLD: "На удержании", DISMISSED: "Отклонена", ACTIONED: "Меры приняты", FRAUD: "Мошенничество", MISLEADING: "Недостоверная информация", INAPPROPRIATE: "Неприемлемый контент", SPAM: "Спам", OTHER: "Другое",
  DRAFT: "Черновик", PUBLISHED: "Опубликовано", CANCELLED: "Отменено", PENDING: "Ожидает подтверждения", PAID: "Оплачен", EXPIRED: "Истёк", REFUNDED: "Возвращён",
  VALID: "Действителен", USED: "Использован", SUCCEEDED: "Успешно", FAILED: "Отклонено", ACTIVE: "Активен", SUSPENDED: "Приостановлено",
  OPEN: "Открыто", IN_PROGRESS: "В работе", WAITING_FOR_CUSTOMER: "Ожидает ответа посетителя", RESOLVED: "Решено",
  UNVERIFIED: "Не подтверждён", VERIFIED: "Подтверждён", REJECTED: "Отклонён",
  ATTENDEE: "Посетитель", USER: "Пользователь", ORGANIZER: "Организатор", EVENT_ADMIN: "Администратор мероприятия", PLATFORM_ADMIN: "Администратор платформы",
  EVENT_STAFF: "Сотрудник мероприятия", CHECK_IN_STAFF: "Сотрудник check-in", ADMIN: "Администратор",
};
export function translateStatus(language: Language, value?: string | null): string {
  if (!value) return "—";
  const key = value.replace(/^ROLE_/, "");
  return translateText(language, STATUS_TEXT[key] ?? value);
}
