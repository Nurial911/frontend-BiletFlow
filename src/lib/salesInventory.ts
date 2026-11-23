import type { EventSales } from "../api/types";

export function summarizeInventory(events: Pick<EventSales, "capacity" | "ticketsRemaining" | "ticketsSold">[]) {
  const hasCapacity = events.length > 0 && events.every(event => event.capacity != null);
  const capacity = hasCapacity ? events.reduce((sum, event) => sum + event.capacity!, 0) : null;
  const ticketsRemaining = events.length > 0 && events.every(event => event.ticketsRemaining != null)
    ? events.reduce((sum, event) => sum + event.ticketsRemaining!, 0) : null;
  const percentSold = capacity != null && capacity > 0
    ? events.reduce((sum, event) => sum + event.ticketsSold, 0) / capacity * 100 : null;
  return { capacity, ticketsRemaining, percentSold };
}
