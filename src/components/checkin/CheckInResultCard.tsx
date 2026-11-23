import type { CheckInResult } from "../../api/types";
import { useLanguage } from "../../i18n/LanguageContext";
import { formatDateTime } from "../../lib/format";

const ALLOWED = "border-green-600 bg-green-50 text-green-900";
const WARNING = "border-amber-500 bg-amber-50 text-amber-900";
const DENIED = "border-red-600 bg-red-50 text-red-900";

// The large result shown to check-in staff after a scan (SRS 4.8): colour, symbol and text,
// so the outcome is clear at a glance and does not depend on colour alone.
export function CheckInResultCard({ result }: { result: CheckInResult }) {
  const { tx, locale } = useLanguage();
  const look = (() => {
    switch (result.result) {
      case "CHECKED_IN": return { title: tx("Проход разрешён"), symbol: "✓", className: ALLOWED };
      case "ALREADY_USED": return { title: tx("Билет уже использован"), symbol: "!", className: WARNING };
      case "CANCELLED": return { title: tx("Билет отменён"), symbol: "✕", className: DENIED };
      case "REFUNDED": return { title: tx("Билет возвращён"), symbol: "✕", className: DENIED };
      case "WRONG_EVENT": return { title: tx("Билет на другое мероприятие"), symbol: "✕", className: DENIED };
      case "INVALID": return { title: tx("Недействительный билет"), symbol: "✕", className: DENIED };
      default: return { title: tx("Проверка завершена: {0}", [String(result.result)]), symbol: "?", className: "border-gray-400 bg-surface" };
    }
  })();
  const ticket = result.ticket;
  return (
    <div id="check-in-result" role="alert" data-result={result.result} className={`mt-3 rounded-xl border-2 p-4 ${look.className}`}>
      <p className="flex items-center gap-3 text-xl font-bold">
        <span aria-hidden="true" className="text-3xl leading-none">{look.symbol}</span>
        {look.title}
      </p>
      {result.message && <p className="mt-1 text-sm">{tx(result.message)}</p>}
      {ticket && (
        <p className="mt-2 text-sm">
          {ticket.attendeeName ?? ticket.attendeeEmail} · {ticket.ticketTypeName}
          {ticket.seatLabel ? ` · ${ticket.seatLabel}` : ""} · {tx("Билет №")}{ticket.id}
        </p>
      )}
      {result.result === "ALREADY_USED" && result.checkedInAt && (
        <p className="mt-1 text-sm">{tx("Отмечен:")} {formatDateTime(result.checkedInAt, locale)}</p>
      )}
    </div>
  );
}
