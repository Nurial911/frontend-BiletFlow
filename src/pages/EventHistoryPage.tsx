import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getEvent, getEventHistory } from "../api/events";
import type { EventHistoryEntry } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { Pagination } from "../components/ui/AsyncState";
import { useLanguage } from "../i18n/LanguageContext";
import { formatDateTime } from "../lib/format";

// What each kind of entry is about. The keys are the backend's entityType values.
const ENTITY_LABELS: Record<string, string> = {
  EVENT: "Событие",
  TICKET_TYPE: "Билеты",
  ORDER: "Заказы и возвраты",
  PAYMENT: "Оплата",
  TICKET: "Check-in",
  PROMO_CAMPAIGN: "Промокоды",
  SUPPORT_CASE: "Поддержка",
  STAFF_ASSIGNMENT: "Сотрудники",
  PAID_SALES_ACTIVATION: "Активация продаж",
  PAYOUT: "Выплаты",
};

const ENTITY_COLORS: Record<string, string> = {
  EVENT: "bg-blue-100 text-blue-800",
  ORDER: "bg-amber-100 text-amber-900",
  PAYMENT: "bg-green-100 text-green-800",
  TICKET: "bg-purple-100 text-purple-800",
};

// Activity timeline of one event (SRS 4.16): newest first, filter by date range and type.
// Read-only on purpose: audit entries can't be edited or deleted.
export default function EventHistoryPage() {
  const { tx, locale } = useLanguage();
  const { user } = useAuth();
  const role = user?.role.trim().toUpperCase().replace(/^ROLE_/, "") ?? "";
  const base = role === "PLATFORM_ADMIN" || role === "ADMIN" ? "/admin/dashboard" : "/organizer";
  const eventId = Number(useParams().eventId);
  const validId = Number.isSafeInteger(eventId) && eventId > 0;

  // What's typed in the form, and the filter actually applied (only changes on "Показать")
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [typeInput, setTypeInput] = useState("");
  const [filter, setFilter] = useState({ from: "", to: "", entityType: "" });
  const [page, setPage] = useState(0);

  const event = useQuery({ queryKey: ["event", eventId], queryFn: () => getEvent(eventId), enabled: validId });
  const history = useQuery({
    queryKey: ["event-history", eventId, filter, page],
    queryFn: () => getEventHistory(eventId, { page, ...filter }),
    enabled: validId,
  });

  const applyFilter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFilter({ from: fromInput, to: toInput, entityType: typeInput });
    setPage(0);
  };
  const resetFilter = () => {
    setFromInput("");
    setToInput("");
    setTypeInput("");
    setFilter({ from: "", to: "", entityType: "" });
    setPage(0);
  };

  if (!validId) return <p className="rounded-xl bg-red-50 p-5 text-sm text-red-800">{tx("Некорректный ID события")}</p>;

  return (
    <section className="space-y-5">
      <div>
        <Link to={`${base}/manage`} className="text-sm text-muted underline">{tx("← К управлению событиями")}</Link>
        <h2 className="mt-2 text-xl font-bold">{tx("История события")}</h2>
        {event.data && <p className="mt-1 text-sm text-muted">{event.data.title} · ID: {event.data.id}</p>}
        <p className="mt-1 text-xs text-muted">{tx("Записи журнала нельзя изменить или удалить.")}</p>
      </div>

      <form onSubmit={applyFilter} className="flex flex-wrap items-end gap-3 rounded-xl border p-4">
        <label className="text-sm">
          <span className="block text-xs text-muted">{tx("С даты")}</span>
          <input type="date" value={fromInput} onChange={(e) => setFromInput(e.target.value)} className="mt-1 rounded-lg border px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-muted">{tx("По дату")}</span>
          <input type="date" value={toInput} onChange={(e) => setToInput(e.target.value)} className="mt-1 rounded-lg border px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-muted">{tx("Тип действия")}</span>
          <select value={typeInput} onChange={(e) => setTypeInput(e.target.value)} className="mt-1 rounded-lg border px-3 py-2">
            <option value="">{tx("Все действия")}</option>
            {Object.entries(ENTITY_LABELS).map(([value, label]) => <option key={value} value={value}>{tx(label)}</option>)}
          </select>
        </label>
        <Button type="submit">{tx("Показать")}</Button>
        <Button variant="secondary" onClick={resetFilter}>{tx("Сбросить")}</Button>
      </form>

      {history.isLoading && <p className="rounded-xl bg-surface p-6 text-center text-sm">{tx("Загрузка…")}</p>}
      {history.error && (
        <div className="rounded-xl bg-red-50 p-5 text-sm text-red-800">
          <p>{history.error instanceof Error ? tx(history.error.message) : tx("Не удалось загрузить данные.")}</p>
          <Button variant="secondary" className="mt-3" onClick={() => void history.refetch()}>{tx("Повторить")}</Button>
        </div>
      )}
      {history.data && history.data.content.length === 0 && (
        <p className="rounded-xl bg-surface p-6 text-center text-sm text-muted">{tx("За этот период записей нет.")}</p>
      )}

      {history.data && history.data.content.length > 0 && (
        <ol className="relative space-y-3 border-l-2 border-gray-200 pl-5">
          {history.data.content.map((entry) => <HistoryItem key={entry.id} entry={entry} locale={locale} />)}
        </ol>
      )}
      <Pagination page={page} totalPages={history.data?.totalPages ?? 0} onChange={setPage} />
    </section>
  );
}

function HistoryItem({ entry, locale }: { entry: EventHistoryEntry; locale: string }) {
  const { tx, statusLabel } = useLanguage();
  const label = ENTITY_LABELS[entry.entityType] ?? entry.entityType;
  const color = ENTITY_COLORS[entry.entityType] ?? "bg-gray-100 text-gray-800";
  const actor = entry.actorName || entry.actorEmail || tx("Система");
  return (
    <li className="relative rounded-xl border bg-white p-3 text-sm">
      {/* the dot on the timeline line */}
      <span className="absolute -left-[27px] top-4 h-3 w-3 rounded-full border-2 border-white bg-gray-400" aria-hidden="true" />
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>{tx(label)}</span>
        <time className="text-xs text-muted" dateTime={entry.timestamp}>{formatDateTime(entry.timestamp, locale)}</time>
      </div>
      <p className="mt-2">{entry.description}</p>
      <p className="mt-1 text-xs text-muted">
        {actor}
        {entry.actorRole ? ` · ${statusLabel(entry.actorRole)}` : ""}
        {entry.entityId ? ` · #${entry.entityId}` : ""}
      </p>
    </li>
  );
}
