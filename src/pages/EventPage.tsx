import { useLanguage } from "../i18n/LanguageContext";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ApiError } from "../api/client";
import { createOrder, type CheckoutDetails, type OrderItemInput } from "../api/orders";
import { useAuth } from "../auth/AuthContext";
import { minPrice, useEvent, useTicketTypes } from "../hooks/useEvents";
import { Button } from "../components/ui/Button";
import { ErrorMessage } from "../components/ui/ErrorMessage";
import { categoryLabel, formatLongDate, formatPrice, formatTime } from "../lib/format";
import { TicketSelector } from "../components/events/TicketSelector";
import { EventPoster } from "../components/events/EventPoster";

// Event page = the "event info" wireframe.
export default function EventPage() {
  const { tx, locale } = useLanguage();
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [storedPromo] = useState(() => sessionStorage.getItem("bf_promo") ?? "");
  const initialPromo = params.get("promo") ?? storedPromo;
  const { data: event, isLoading, error, refetch } = useEvent(id);
  const { data: types, isLoading: typesLoading } = useTicketTypes(id);
  const { isLoggedIn, openLogin } = useAuth();
  const orderMutation = useMutation({
    mutationFn: ({ items, details }: { items: OrderItemInput[]; details: CheckoutDetails }) => createOrder(id, items, details),
    onSuccess: (order) => navigate(`/orders/${order.id}`),
  });

  if (isLoading) return <EventPageSkeleton />;

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-xl font-bold">{tx("Событие не найдено")}</h1>
        <Link to="/" className="mt-3 inline-block underline">
          {tx("На главную")}</Link>
      </div>
    );
  }
  if (error || !event) return <ErrorMessage error={error} onRetry={() => refetch()} />;

  const visibleTypes = (types ?? []).filter((t) => !t.hidden);
  const ticketsNotRequired = event.status === "PUBLISHED" && !typesLoading && types?.length === 0;
  const posterNeedsAuth = event.status !== "PUBLISHED" || event.visibilityStatus === "PRIVATE";
  const price = minPrice(types);
  const soldOut = visibleTypes.length > 0 && visibleTypes.every((t) => t.available <= 0);

  const onChooseTickets = () => {
    if (!isLoggedIn) return openLogin();
    document.getElementById("tickets")?.scrollIntoView({ behavior: "smooth" });
  };
  const onContinue = (items: OrderItemInput[], details: CheckoutDetails) => {
    if (!isLoggedIn) return openLogin();
    orderMutation.mutate({ items, details });
  };

  return (
    <article>
      <nav aria-label={tx("Навигация")} className="text-xs text-muted">
        <Link to="/" className="hover:underline">{tx("Главная")}</Link>
        {" / "}
        <Link to={`/?category=${encodeURIComponent(event.category)}`} className="hover:underline">
          {categoryLabel(event.category, locale)}
        </Link>
        {" / "}
        <span>{event.title}</span>
      </nav>

      <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
        <EventPoster
          posterUrl={event.posterUrl}
          authenticated={posterNeedsAuth}
          className="aspect-[3/4] rounded-xl text-2xl"
        />

        <div>
          <p className="text-[11px] font-semibold uppercase text-muted">{categoryLabel(event.category, locale)}</p>
          <h1 className="mt-1 text-3xl font-bold">{event.title}</h1>
          <p className="mt-2 text-sm">
            {formatLongDate(event.startTime, locale)}, {formatTime(event.startTime)}
          </p>
          {event.venue && (
            <p className="mt-1 text-sm text-muted">
              {event.venue.name}
              {event.venue.address && `, ${event.venue.address}`}
            </p>
          )}

          {event.suspended ? (
            <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              {tx("Продажа билетов на это мероприятие временно приостановлена.")}</p>
          ) : event.status === "CANCELLED" ? (
            <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{tx("Событие отменено")}</p>
          ) : (
            <div className="mt-5 flex max-w-md items-center justify-between rounded-xl bg-surface p-4">
              <div>
                <p className="font-bold">{formatTime(event.startTime)}</p>
                <p className="text-xs text-muted">
                  {typesLoading
                    ? "…"
                    : ticketsNotRequired
                      ? tx("Билеты не требуются")
                      : price === null
                        ? tx("Билеты пока недоступны")
                        : price === 0
                          ? tx("Бесплатно")
                          : tx("от {0}", [formatPrice(price, locale)])}
                </p>
              </div>
              {!ticketsNotRequired && (
                <Button onClick={onChooseTickets} disabled={price === null || soldOut}>
                  {soldOut ? tx("Билеты закончились") : tx("Выбрать билеты")}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {event.description && (
        <section className="mt-10 max-w-3xl">
          <h2 className="text-lg font-bold">{tx("О событии")}</h2>
          <div className="mt-2 whitespace-pre-line rounded-xl bg-surface p-4 text-sm">{event.description}</div>
        </section>
      )}

      {event.refundPolicy && (
        <section className="mt-6 max-w-3xl">
          <h2 className="text-lg font-bold">{tx("Политика возврата")}</h2>
          <div className="mt-2 whitespace-pre-line rounded-xl bg-surface p-4 text-sm">{event.refundPolicy}</div>
        </section>
      )}

      {ticketsNotRequired && (
        <p className="mt-10 max-w-3xl rounded-xl bg-green-50 p-4 text-sm font-medium text-green-800">
          {tx("Билеты не требуются для этого события.")}</p>
      )}

      {visibleTypes.length > 0 && (
        <section id="tickets" className="mt-10 max-w-3xl">
          <h2 className="text-lg font-bold">{tx("Билеты")}</h2>
          {orderMutation.error && (
            <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {orderMutation.error instanceof Error ? tx(orderMutation.error.message) : tx("Не удалось создать заказ.")}
            </p>
          )}
          <TicketSelector key={`${id}:${initialPromo}`} eventId={id} types={visibleTypes} initialPromo={initialPromo} paidSalesActive={event.paidSalesActive} blocked={event.suspended || event.status === "CANCELLED" || event.status === "DRAFT"} onContinue={onContinue} busy={orderMutation.isPending} />
        </section>
      )}
      <Link to={`/support/new?eventId=${id}`} className="mt-6 inline-block text-sm underline">{tx("Задать вопрос о событии")}</Link>
    </article>
  );
}

function EventPageSkeleton() {

  return (
    <div className="mt-8 grid animate-pulse gap-6 md:grid-cols-[320px_1fr]" aria-hidden="true">
      <div className="aspect-[3/4] rounded-xl bg-surface" />
      <div className="space-y-3">
        <div className="h-3 w-20 rounded bg-surface" />
        <div className="h-8 w-2/3 rounded bg-surface" />
        <div className="h-4 w-40 rounded bg-surface" />
        <div className="h-20 max-w-md rounded-xl bg-surface" />
      </div>
    </div>
  );
}
