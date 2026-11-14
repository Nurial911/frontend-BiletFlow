import { useLanguage } from "../../i18n/LanguageContext";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TicketType } from "../../api/types";
import { quoteOrder, type CheckoutDetails, type OrderItemInput } from "../../api/orders";
import { previewPromo } from "../../api/commerce";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { formatPrice, parseDate } from "../../lib/format";
import { Button } from "../ui/Button";
import { MutationError } from "../ui/AsyncState";

interface Props {
  eventId: number;
  types: TicketType[];
  onContinue: (items: OrderItemInput[], details: CheckoutDetails) => void;
  busy?: boolean;
  blocked?: boolean;
  paidSalesActive?: boolean;
  initialPromo?: string;
}

export function TicketSelector({ eventId, types, onContinue, busy = false, blocked, paidSalesActive, initialPromo = "" }: Props) {
  const { tx, locale } = useLanguage();
  const { isLoggedIn } = useAuth();
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [attendeeName, setAttendeeName] = useState("");
  const [promoInput, setPromoInput] = useState(initialPromo);
  const [promo, setPromo] = useState({ value: initialPromo, token: !!initialPromo });
  const preview = useQuery({
    queryKey: ["promo-preview", eventId, promo],
    queryFn: async () => {
      try { return await previewPromo(eventId, promo.value, promo.token); }
      catch (error) {
        if (promo.token && error instanceof ApiError && error.status === 400) return previewPromo(eventId, promo.value);
        throw error;
      }
    },
    enabled: !!promo.value,
    retry: false,
  });
  const maxFor = (t: TicketType) => {
    const now = Date.now();
    if (blocked || (t.price > 0 && paidSalesActive === false) || (t.salesStart && parseDate(t.salesStart).getTime() > now) || (t.salesEnd && parseDate(t.salesEnd).getTime() <= now)) return 0;
    return Math.min(t.available, t.maxPerOrder && t.maxPerOrder > 0 ? t.maxPerOrder : 10);
  };
  const items = types.filter(t => Math.min(counts[t.id] ?? 0, maxFor(t)) > 0)
    .map(t => ({ ticketTypeId: t.id, quantity: Math.min(counts[t.id], maxFor(t)) }));
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const promoCode = promo.value ? preview.data?.code : undefined;
  const quote = useQuery({
    queryKey: ["order-quote", eventId, items, promoCode],
    queryFn: () => quoteOrder(eventId, items, promoCode),
    enabled: isLoggedIn && totalCount > 0 && (!promo.value || !!preview.data),
    retry: false,
    staleTime: 0,
  });
  const promoUnapplied = promoInput.trim() !== promo.value;
  const canCheckout = totalCount > 0 && !busy && !blocked && !promoUnapplied && (!promo.value || (!!preview.data && !preview.error && !preview.isFetching)) && (!isLoggedIn || (!!quote.data && !quote.isFetching && !quote.error));

  return <div className="mt-2 overflow-hidden rounded-xl border">
    {paidSalesActive === false && <p className="bg-amber-50 p-4 text-sm text-amber-900">{tx("Платные продажи ещё не активированы или приостановлены. Бесплатные билеты доступны в пределах сроков продажи.")}</p>}
    <ul className="divide-y">
      {types.map(t => {
        const count = Math.min(counts[t.id] ?? 0, maxFor(t));
        return <li key={t.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div><p className="font-semibold">{t.name}</p>{t.description && <p className="text-xs text-muted">{t.description}</p>}<p className="text-xs text-muted">{maxFor(t) === 0 ? tx("Сейчас недоступен") : tx("Осталось: {0}", [t.available])}</p></div>
          <div className="flex items-center gap-4">
            <p className="whitespace-nowrap font-semibold">{t.price === 0 ? tx("Бесплатно") : formatPrice(t.price, locale)}</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={count === 0 || busy} onClick={() => setCounts(prev => ({ ...prev, [t.id]: Math.max(0, count - 1) }))} aria-label={tx("Убрать билет {0}", [t.name])} className="h-8 w-8 rounded-full bg-surface text-lg disabled:opacity-40">−</button>
              <span className="w-5 text-center font-semibold" aria-live="polite">{count}</span>
              <button type="button" disabled={count >= maxFor(t) || busy} onClick={() => setCounts(prev => ({ ...prev, [t.id]: count + 1 }))} aria-label={tx("Добавить билет {0}", [t.name])} className="h-8 w-8 rounded-full bg-surface text-lg disabled:opacity-40">+</button>
            </div>
          </div>
        </li>;
      })}
    </ul>
    <div className="space-y-3 border-t p-4">
      <label className="block text-sm">{tx("Имя посетителя (необязательно)")}<input value={attendeeName} onChange={e => setAttendeeName(e.target.value)} maxLength={200} autoComplete="name" className="mt-1 w-full rounded-lg border px-3 py-2" placeholder={tx("Если не указано, используем имя или email аккаунта")} /></label>
      <form onSubmit={e => { e.preventDefault(); setPromo({ value: promoInput.trim(), token: false }); }} className="flex flex-wrap items-end gap-2">
        <label className="min-w-40 flex-1 text-sm">{tx("Промокод")}<input value={promoInput} onChange={e => setPromoInput(e.target.value)} maxLength={200} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
        <Button type="submit" variant="secondary" disabled={preview.isFetching || busy}>{tx("Применить")}</Button>
        {promo.value && <Button variant="secondary" onClick={() => { setPromoInput(""); setPromo({ value: "", token: false }); sessionStorage.removeItem("bf_promo"); }}>{tx("Убрать")}</Button>}
      </form>
      {preview.isFetching && <p role="status" className="text-sm">{tx("Проверяем промокод…")}</p>}
      {promo.value && <MutationError error={preview.error} />}
      {promo.value && preview.data && !preview.error && <p className="text-sm text-green-800">{tx("Промокод ")}{preview.data.code} {tx(" применён. Скидка: ")}{preview.data.discountValue}{preview.data.discountType === "PERCENT" ? "%" : " ₸"}.</p>}
      {promoUnapplied && <p className="text-xs text-muted">{tx("Примените изменённый промокод перед оформлением.")}</p>}
      {isLoggedIn && totalCount > 0 && <MutationError error={quote.error} />}
      {quote.error && <Button variant="secondary" onClick={() => void quote.refetch()}>{tx("Повторить расчёт")}</Button>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-4 border-t bg-surface p-4">
      <div aria-live="polite"><p className="text-xs text-muted">{tx("Билетов: ")}{totalCount}</p>
        {isLoggedIn && quote.data && totalCount > 0 && <><p className="text-sm">{tx("До скидки: ")}{formatPrice(quote.data.subtotalAmount, locale)}</p><p className="text-sm">{tx("Скидка: ")}{formatPrice(quote.data.discountAmount, locale)}</p></>}
        <p className="text-lg font-bold">{tx("Итого: ")}{totalCount === 0 ? formatPrice(0, locale) : isLoggedIn ? quote.isFetching ? tx("Считаем…") : quote.data && !quote.error ? formatPrice(quote.data.totalAmount, locale) : tx("Расчёт недоступен") : tx("Войдите для расчёта")}</p>
      </div>
      <Button onClick={() => onContinue(items, { attendeeName: attendeeName.trim() || undefined, promoCode })} disabled={!canCheckout}>{busy ? tx("Создаём заказ…") : isLoggedIn ? tx("Оформить заказ") : tx("Войти для оформления")}</Button>
      <p className="w-full text-xs text-muted">{tx("Предварительный расчёт не резервирует билеты. Окончательная стоимость подтверждается при создании заказа.")}</p>
    </div>
  </div>;
}
