import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { refundOrder } from "../../api/orders";
import { useLanguage } from "../../i18n/LanguageContext";
import { Button } from "../ui/Button";
import { MutationError } from "../ui/AsyncState";

interface Props {
  orderId: number;
  totalAmount: number;
}

// "Refund" button for one paid order. A free order (total 0) is cancelled instead.
// Opens a small confirm box with an optional reason that the buyer will see.
export function RefundOrderButton({ orderId, totalAmount }: Props) {
  const { tx } = useLanguage();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const isFree = totalAmount === 0;

  const refund = useMutation({
    mutationFn: () => refundOrder(orderId, reason.trim() || undefined),
    onSuccess: async () => {
      setOpen(false);
      setReason("");
      // Reload the order list and the sales numbers so the new status and refund totals show up
      await queryClient.invalidateQueries({ queryKey: ["organizer-event-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["organizer-sales-detail"] });
      await queryClient.invalidateQueries({ queryKey: ["organizer-sales-summary"] });
      // Refunded tickets stop counting as ticket holders
      await queryClient.invalidateQueries({ queryKey: ["event-attendance"] });
    },
  });

  if (!open) {
    return (
      <Button variant="secondary" className="mt-2" onClick={() => setOpen(true)}>
        {isFree ? tx("Отменить регистрацию") : tx("Вернуть деньги")}
      </Button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-semibold">
        {isFree ? tx("Отменить эту регистрацию?") : tx("Вернуть покупателю всю сумму заказа?")}
      </p>
      <p className="mt-1 text-xs text-muted">{tx("Билеты заказа сразу станут недействительными и вернутся в продажу.")}</p>
      <label className="mt-2 block text-xs font-medium" htmlFor={`refund-reason-${orderId}`}>
        {tx("Причина (увидит покупатель, необязательно)")}
      </label>
      <textarea
        id={`refund-reason-${orderId}`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        rows={2}
        className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm"
      />
      <MutationError error={refund.error} />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button disabled={refund.isPending} onClick={() => refund.mutate()}>
          {refund.isPending ? tx("Выполняем…") : isFree ? tx("Да, отменить") : tx("Да, вернуть деньги")}
        </Button>
        <Button variant="secondary" disabled={refund.isPending} onClick={() => setOpen(false)}>
          {tx("Не сейчас")}
        </Button>
      </div>
    </div>
  );
}