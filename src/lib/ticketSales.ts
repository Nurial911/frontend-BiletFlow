import type { TicketType } from "../api/types";
import { formatLongDate, formatTime, parseDate } from "./format";

export type TicketSaleState = "sold-out" | "sales-ended" | "not-started" | null;
export type EventTicketSaleState = "sold-out" | "sales-ended" | null;

export function getTicketSaleState(ticket: TicketType, now = Date.now()): TicketSaleState {
  if (ticket.available <= 0) return "sold-out";
  if (ticket.salesEnd && parseDate(ticket.salesEnd).getTime() <= now) return "sales-ended";
  if (ticket.salesStart && parseDate(ticket.salesStart).getTime() > now) return "not-started";
  return null;
}

export function getEventTicketSaleState(
  tickets: TicketType[],
  now = Date.now(),
): EventTicketSaleState {
  const visibleTickets = tickets.filter((ticket) => !ticket.hidden);
  if (visibleTickets.length === 0) return null;

  if (visibleTickets.every((ticket) => ticket.available <= 0)) return "sold-out";

  const allUnsoldTicketsEnded = visibleTickets.every((ticket) => {
    if (ticket.available <= 0) return true;
    if (!ticket.salesEnd) return false;
    return parseDate(ticket.salesEnd).getTime() <= now;
  });

  return allUnsoldTicketsEnded ? "sales-ended" : null;
}

export function formatTicketSalesEnd(salesEnd: string, locale = "ru-RU"): string {
  return `${formatLongDate(salesEnd, locale)}${locale.startsWith("en") ? " at " : locale.startsWith("kk") ? ", " : " в "}${formatTime(salesEnd)}`;
}
