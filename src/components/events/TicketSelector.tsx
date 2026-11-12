import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TicketType } from "../../api/types";
import { quoteOrder, type OrderItemInput } from "../../api/orders";
import { useAuth } from "../../auth/AuthContext";
import { formatPrice } from "../../lib/format";
import { Button } from "../ui/Button";

interface Props {
  eventId: number;
  types: TicketType[];
  onContinue: (items: OrderItemInput[], promoCode?: string) => void;
  busy?: boolean;
  initialPromoCode?: string; // filled in when the page was opened from a Campaign QR
}

// List of ticket types with − / + buttons, a promo code box and a total at the bottom.
export function TicketSelector({ eventId, types, onContinue, busy = false, initialPromoCode }: Props) {
  const { isLoggedIn } = useAuth();
  // How many of each ticket type is chosen: { 4: 2, 5: 1 } means 2 of type 4 and 1 of type 5
  const [counts, setCounts] = useState<Record<number, number>>({});
  // What the user is typing, and the code they pressed "Применить" for
  const [promoInput, setPromoInput] = useState("");
  const [promoCode, setPromoCode] = useState<string>();

  // A Campaign QR code arrives a moment after the page loads, so copy it in when it does
  useEffect(() => {
    if (initialPromoCode) {
      setPromoInput(initialPromoCode);
      setPromoCode(initialPromoCode);
    }
  }, [initialPromoCode]);

  // Can't pick more than what's left, or more than the per-order limit (10 if none is set)
  const maxFor = (t: TicketType) =>
    Math.min(t.available, t.maxPerOrder && t.maxPerOrder > 0 ? t.maxPerOrder : 10);

  const change = (t: TicketType, delta: number) =>
    setCounts((prev) => {
      const next = Math.max(0, Math.min(maxFor(t), (prev[t.id] ?? 0) + delta));
      return { ...prev, [t.id]: next };
    });

  const items = types
    .filter((t) => (counts[t.id] ?? 0) > 0)
    .map((t) => ({ ticketTypeId: t.id, quantity: counts[t.id] }));
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = types.reduce((sum, t) => sum + (counts[t.id] ?? 0) * t.price, 0);


  // Ask the server what the order costs with the code. Only the server knows the discount.
  const quote = useQuery({
    queryKey: ["order-quote", eventId, items, promoCode],
    queryFn: () => quoteOrder(eventId, items, promoCode),
    enabled: !!promoCode && totalCount > 0 && isLoggedIn,
    retry: false,
  });
  // Send the code with the order only if the server accepted it
  const acceptedPromo = quote.data ? promoCode : undefined;

  const applyPromo = () => {
    const code = promoInput.trim();
    setPromoCode(code || undefined);
  };
  const removePromo = () => {
    setPromoInput("");
    setPromoCode(undefined);
  };

  return (
    <div className="mt-2 rounded-xl border">
      <ul className="divide-y">
        {types.map((t) => {
          const count = counts[t.id] ?? 0;
          const soldOut = t.available <= 0;
          return (
            <li key={t.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-semibold">{t.name}</p>
                {t.description && <p className="text-xs text-muted">{t.description}</p>}
                <p className="text-xs text-muted">{soldOut ? "Нет в наличии" : `Осталось: ${t.available}`}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="whitespace-nowrap font-semibold">{t.price === 0 ? "Бесплатно" : formatPrice(t.price)}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => change(t, -1)}
                    disabled={count === 0}
                    aria-label={`Убрать билет ${t.name}`}
                    className="h-8 w-8 rounded-full bg-surface text-lg disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-semibold" aria-live="polite">{count}</span>
                  <button
                    type="button"
                    onClick={() => change(t, +1)}
                    disabled={soldOut || count >= maxFor(t)}
                    aria-label={`Добавить билет ${t.name}`}
                    className="h-8 w-8 rounded-full bg-surface text-lg disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
            <div className="border-t p-4">
        <label htmlFor="promo" className="text-sm font-medium">Промокод</label>
        <div className="mt-1 flex flex-wrap gap-2">
          <input
            id="promo"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value)}
            maxLength={20}
            placeholder="Например, SPRING10"
            className="min-w-40 flex-1 rounded-lg border px-3 py-2 text-sm uppercase"
          />
          <Button variant="secondary" onClick={applyPromo} disabled={!promoInput.trim()}>Применить</Button>
          {promoCode && <Button variant="secondary" onClick={removePromo}>Убрать</Button>}
        </div>
        {promoCode && !isLoggedIn && (
          <p className="mt-2 text-xs text-muted">Войдите в аккаунт, чтобы применить промокод.</p>
        )}
        {promoCode && isLoggedIn && totalCount === 0 && (
          <p className="mt-2 text-xs text-muted">Выберите билеты, чтобы увидеть скидку.</p>
        )}
        {quote.error && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {quote.error instanceof Error ? quote.error.message : "Промокод не подходит."}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-t bg-surface p-4">
        <div>
          <p className="text-xs text-muted">Билетов: {totalCount}</p>
          {quote.data && quote.data.discountAmount > 0 ? (
            <>
              <p className="text-xs text-muted line-through">{formatPrice(quote.data.subtotalAmount)}</p>
              <p className="text-xs text-green-700">Скидка: −{formatPrice(quote.data.discountAmount)}</p>
              <p className="text-lg font-bold">Итого: {formatPrice(quote.data.totalAmount)}</p>
            </>
          ) : (
            <p className="text-lg font-bold">Итого: {formatPrice(total)}</p>
          )}
        </div>
        <Button
          onClick={() => onContinue(items, acceptedPromo)}
          disabled={totalCount === 0 || busy || quote.isFetching || !!quote.error}
        >
          {busy ? "Создаём заказ…" : "Оформить заказ"}
        </Button>
      </div>
    </div>
  );
}