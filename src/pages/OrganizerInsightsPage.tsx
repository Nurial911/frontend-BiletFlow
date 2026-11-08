import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignEventStaff,
  getEventStaff,
  removeEventStaff,
} from "../api/checkIn";
import { getEventOrders, getEventSales, getOrganizerSales } from "../api/sales";
import { Button, buttonClass } from "../components/ui/Button";
import { formatLongDate, formatPrice, formatShortDate } from "../lib/format";
import type { EventSales, EventStaff } from "../api/types";

export function OrganizerSalesPage() {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [orderPage, setOrderPage] = useState(0);
  const [orderStatus, setOrderStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const sales = useQuery({
    queryKey: ["organizer-sales-summary"],
    queryFn: () => getOrganizerSales(),
  });
  const eventSales = useQuery({
    queryKey: ["organizer-sales-detail", selectedEventId],
    queryFn: () => getEventSales(selectedEventId!),
    enabled: selectedEventId !== null,
  });
  const eventOrders = useQuery({
    queryKey: ["organizer-event-orders", selectedEventId, orderPage, orderStatus, orderQuery],
    queryFn: () => getEventOrders(selectedEventId!, {
      page: orderPage,
      size: 20,
      status: orderStatus || undefined,
      query: orderQuery,
    }),
    enabled: selectedEventId !== null,
  });
  const retry = () => {
    void sales.refetch();
    if (selectedEventId !== null) {
      void eventSales.refetch();
      void eventOrders.refetch();
    }
  };

  if (sales.isLoading) return <LoadingState />;
  if (sales.error) return <ErrorState error={sales.error} onRetry={retry} />;
  if (!sales.data) return <ErrorState error={new Error("Backend не вернул сводку продаж.")} onRetry={retry} />;

  const summary = sales.data;
  const rows = summary?.events ?? [];
  const submitOrderSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOrderPage(0);
    setOrderQuery(searchInput.trim());
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Продажи мероприятий</h2>
        <p className="mt-1 text-sm text-muted">Статистика и выручка загружены из backend.</p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl bg-surface p-6 text-center text-sm text-muted">У вас пока нет мероприятий.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Оплачено заказов" value={summary.totals.paidOrders.toLocaleString("ru-RU")} />
            <Metric label="Продано билетов" value={summary.totals.ticketsSold.toLocaleString("ru-RU")} />
            <Metric label="Выручка" value={formatPrice(summary.totals.revenue)} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Metric label="Ожидают оплаты" value={summary.totals.pendingOrders.toLocaleString("ru-RU")} />
            <Metric label="Зарезервировано билетов" value={summary.totals.ticketsReserved.toLocaleString("ru-RU")} />
          </div>
          {rows.map((row) => (
            <EventSalesCard
              key={row.eventId}
              row={row}
              expanded={selectedEventId === row.eventId}
              onToggle={() => {
                setSelectedEventId((current) => current === row.eventId ? null : row.eventId);
                setOrderPage(0);
                setOrderStatus("");
                setOrderQuery("");
                setSearchInput("");
              }}
            />
          ))}
          {selectedEventId !== null && (
            <section className="rounded-xl border p-4">
              <h3 className="text-lg font-semibold">Динамика и заказы</h3>
              {eventSales.isLoading ? <LoadingState /> : eventSales.error ? (
                <ErrorState error={eventSales.error} onRetry={() => { void eventSales.refetch(); }} />
              ) : eventSales.data ? (
                <SalesDetail sales={eventSales.data} />
              ) : null}
              <div className="mt-6 border-t pt-4">
                <h4 className="font-semibold">Заказы мероприятия</h4>
                <form onSubmit={submitOrderSearch} className="mt-3 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
                  <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Поиск по email или номеру заказа" className="rounded-lg border px-3 py-2 text-sm" />
                  <select value={orderStatus} onChange={(event) => { setOrderStatus(event.target.value); setOrderPage(0); }} className="rounded-lg border px-3 py-2 text-sm">
                    <option value="">Все статусы</option>
                    <option value="PENDING">Ожидает оплаты</option>
                    <option value="PAID">Оплачен</option>
                    <option value="CANCELLED">Отменён</option>
                    <option value="EXPIRED">Истёк</option>
                  </select>
                  <Button type="submit">Найти</Button>
                </form>
                {eventOrders.isLoading ? <LoadingState /> : eventOrders.error ? (
                  <ErrorState error={eventOrders.error} onRetry={() => { void eventOrders.refetch(); }} />
                ) : (eventOrders.data?.content ?? []).length === 0 ? (
                  <p className="mt-3 text-sm text-muted">Заказы не найдены.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {(eventOrders.data?.content ?? []).map((order) => (
                      <article key={order.id} className="rounded-lg bg-surface p-3 text-sm">
                        <div className="flex flex-wrap justify-between gap-2">
                          <strong>Заказ №{order.id} · {order.buyerEmail}</strong>
                          <span>{formatPrice(order.totalAmount)} · {order.status}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {order.ticketCount} бил. · Создан {new Date(order.createdAt).toLocaleString("ru-RU")}
                          {order.paidAt ? ` · Оплачен ${new Date(order.paidAt).toLocaleString("ru-RU")}` : ""}
                        </p>
                        <ul className="mt-2 text-xs">
                          {order.items.map((item) => <li key={item.ticketTypeId}>{item.ticketTypeName} × {item.quantity}</li>)}
                        </ul>
                      </article>
                    ))}
                    <OrdersPagination
                      page={orderPage}
                      totalPages={eventOrders.data?.totalPages ?? 0}
                      onChange={setOrderPage}
                    />
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function EventSalesCard({ row, expanded, onToggle }: { row: EventSales; expanded: boolean; onToggle: () => void }) {
  return (
    <article className="rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{row.eventTitle}</h3>
          <p className="mt-1 text-sm text-muted">{formatShortDate(row.startTime)} · {row.status}{row.suspended ? " · Приостановлено" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/organizer/events/${row.eventId}/staff`} className={buttonClass("secondary")}>Сотрудники</Link>
          <Button variant="secondary" onClick={onToggle}>{expanded ? "Скрыть детали" : "Заказы и детали"}</Button>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <p>Оплаченные заказы: <strong>{row.paidOrders}</strong></p>
        <p>Ожидают оплаты: <strong>{row.pendingOrders}</strong></p>
        <p>Отменены / истекли: <strong>{row.cancelledOrders + row.expiredOrders}</strong></p>
        <p>Продано билетов: <strong>{row.ticketsSold}</strong></p>
        <p>Зарезервировано: <strong>{row.ticketsReserved}</strong></p>
        <p>Выручка: <strong>{formatPrice(row.revenue)}</strong></p>
      </div>
      {row.ticketTypes.length === 0 ? <p className="mt-3 text-sm text-muted">Типы билетов не добавлены.</p> : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b text-xs text-muted">
              <tr><th className="py-2 pr-3">Тип билета</th><th className="py-2 pr-3">Цена</th><th className="py-2 pr-3">Продано</th><th className="py-2 pr-3">Резерв</th><th className="py-2 pr-3">Остаток</th><th className="py-2">Выручка</th></tr>
            </thead>
            <tbody>
              {row.ticketTypes.map((ticket) => (
                <tr key={ticket.ticketTypeId} className="border-b last:border-0">
                  <td className="py-2 pr-3">{ticket.name}</td>
                  <td className="py-2 pr-3">{ticket.price === 0 ? "Бесплатно" : formatPrice(ticket.price)}</td>
                  <td className="py-2 pr-3">{ticket.sold}</td>
                  <td className="py-2 pr-3">{ticket.reserved}</td>
                  <td className="py-2 pr-3">{ticket.available}</td>
                  <td className="py-2">{formatPrice(ticket.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function SalesDetail({ sales }: { sales: EventSales }) {
  const maxDailyRevenue = Math.max(0, ...sales.salesByDay.map((day) => day.revenue));
  return (
    <div className="mt-4">
      <div className="grid gap-2 sm:grid-cols-4">
        <Metric label="Выручка" value={formatPrice(sales.revenue)} />
        <Metric label="Оплачено заказов" value={String(sales.paidOrders)} />
        <Metric label="Отменено заказов" value={String(sales.cancelledOrders)} />
        <Metric label="Истекло заказов" value={String(sales.expiredOrders)} />
      </div>
      <h4 className="mt-5 font-semibold">Продажи по дням</h4>
      {sales.salesByDay.length === 0 ? <p className="mt-2 text-sm text-muted">Данных о продажах пока нет.</p> : (
        <div className="mt-2 space-y-2">
          {sales.salesByDay.map((day) => (
            <div key={day.date} className="grid grid-cols-[90px_1fr_auto] items-center gap-3 text-xs">
              <span>{formatLongDate(day.date)}</span>
              <div className="h-3 overflow-hidden rounded bg-surface">
                <div className="h-full rounded bg-black" style={{ width: `${maxDailyRevenue > 0 ? Math.max(day.revenue / maxDailyRevenue * 100, day.revenue > 0 ? 2 : 0) : 0}%` }} />
              </div>
              <span className="whitespace-nowrap">{formatPrice(day.revenue)} · {day.ticketsSold} бил.</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrdersPagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-center gap-3">
      <Button variant="secondary" disabled={page === 0} onClick={() => onChange(page - 1)}>Назад</Button>
      <span className="text-sm">{page + 1} / {totalPages}</span>
      <Button variant="secondary" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>Далее</Button>
    </div>
  );
}

export function OrganizerEventStaffPage() {
  const eventId = Number(useParams().eventId);
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState("");
  const staff = useQuery({
    queryKey: ["event-staff", eventId],
    queryFn: () => getEventStaff(eventId),
    enabled: Number.isSafeInteger(eventId) && eventId > 0,
  });
  const addStaff = useMutation({
    mutationFn: (staffEmail: string) => assignEventStaff(eventId, staffEmail),
    onSuccess: async () => {
      setEmail("");
      setFormError("");
      await queryClient.invalidateQueries({ queryKey: ["event-staff", eventId] });
    },
  });
  const removeStaffMutation = useMutation({
    mutationFn: (userId: number) => removeEventStaff(eventId, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["event-staff", eventId] });
    },
  });

  if (!Number.isSafeInteger(eventId) || eventId <= 0) return <p role="alert">Некорректный ID мероприятия.</p>;
  if (staff.isLoading) return <LoadingState />;
  if (staff.error) return <ErrorState error={staff.error} onRetry={() => { void staff.refetch(); }} />;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setFormError("Введите корректный email сотрудника.");
      return;
    }
    setFormError("");
    addStaff.mutate(normalizedEmail);
  };

  return (
    <section className="max-w-3xl space-y-5">
      <div>
        <Link to="/organizer/sales" className="text-sm underline">К продажам</Link>
        <h2 className="mt-2 text-xl font-bold">Сотрудники мероприятия</h2>
        <p className="mt-1 text-sm text-muted">Назначайте сотрудников, которым backend разрешает работу с check-in.</p>
      </div>
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email сотрудника"
          className="min-w-60 flex-1 rounded-lg border px-3 py-2 text-sm"
        />
        <Button type="submit" disabled={addStaff.isPending}>{addStaff.isPending ? "Назначаем…" : "Назначить"}</Button>
      </form>
      {(formError || addStaff.error) && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {formError || (addStaff.error instanceof Error ? addStaff.error.message : "Не удалось назначить сотрудника.")}
        </p>
      )}
      {removeStaffMutation.error && <ApiErrorMessage error={removeStaffMutation.error} />}
      {(staff.data ?? []).length === 0 ? (
        <p className="rounded-xl bg-surface p-5 text-sm text-muted">Сотрудники ещё не назначены.</p>
      ) : (
        <div className="space-y-2">
          {(staff.data ?? []).map((person) => (
            <StaffRow key={person.userId} person={person} pending={removeStaffMutation.isPending} onRemove={() => removeStaffMutation.mutate(person.userId)} />
          ))}
        </div>
      )}
    </section>
  );
}

function StaffRow({ person, pending, onRemove }: { person: EventStaff; pending: boolean; onRemove: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
      <div><p className="font-medium">{person.email}</p><p className="text-xs text-muted">Назначен: {new Date(person.assignedAt).toLocaleDateString("ru-RU")}</p></div>
      <Button variant="secondary" disabled={pending} onClick={onRemove}>Убрать доступ</Button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-surface p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>;
}

function LoadingState() {
  return <p className="rounded-xl bg-surface p-6 text-center text-sm">Загрузка…</p>;
}

function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="rounded-xl bg-red-50 p-5 text-sm text-red-800">
      <p>{error instanceof Error ? error.message : "Не удалось загрузить данные."}</p>
      <Button variant="secondary" className="mt-3" onClick={onRetry}>Повторить</Button>
    </div>
  );
}

function ApiErrorMessage({ error }: { error: unknown }) {
  return <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error instanceof Error ? error.message : "Не удалось изменить список сотрудников."}</p>;
}
