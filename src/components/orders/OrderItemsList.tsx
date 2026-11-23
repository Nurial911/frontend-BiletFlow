import type { OrderItem } from "../../api/types";

// The lines of one order. With assigned seating an order has one item per seat, and several
// items can share a ticketTypeId, so the key prefers seatId and falls back to the position.
export function OrderItemsList({ items, className = "" }: { items: OrderItem[]; className?: string }) {
  return (
    <ul className={className}>
      {items.map((item, index) => (
        <li key={item.seatId ?? `${item.ticketTypeId}-${index}`}>
          {item.seatLabel
            ? `${item.ticketTypeName} · ${item.seatLabel}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`
            : `${item.ticketTypeName} × ${item.quantity}`}
        </li>
      ))}
    </ul>
  );
}
