import { api } from "./client";
import type { EventAttendance, EventOrder, EventSales, Page, SalesSummary } from "./types";

export const getOrganizerSales = (eventIds?: number[]) => {
  const params = new URLSearchParams();
  eventIds?.forEach((id) => params.append("eventIds", String(id)));
  const query = params.size > 0 ? `?${params.toString()}` : "";
  return api<SalesSummary>(`/api/organizer/sales/events${query}`);
};

export interface SalesFilter { from?: string; to?: string; ticketTypeId?: number }
// The backend applies these filters to salesByDay; headline totals and inventory stay all-time.
export const getEventSales = (eventId: number, filter: SalesFilter = {}) => {
  const params = new URLSearchParams();
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.ticketTypeId !== undefined) params.set("ticketTypeId", String(filter.ticketTypeId));
  return api<EventSales>(`/api/organizer/events/${eventId}/sales${params.size ? `?${params}` : ""}`);
};

export interface EventOrdersFilter {
  page?: number;
  size?: number;
  status?: string;
  query?: string;
}

export const getEventOrders = (eventId: number, filter: EventOrdersFilter = {}) => {
  const params = new URLSearchParams({
    page: String(filter.page ?? 0),
    size: String(filter.size ?? 20),
  });
  if (filter.status) params.set("status", filter.status);
  if (filter.query?.trim()) params.set("q", filter.query.trim());
  return api<Page<EventOrder>>(`/api/organizer/events/${eventId}/orders?${params}`);
};

// GET /api/organizer/events/{eventId}/attendance — organizer of the event or platform admin.
// interval: minutes per bar in "arrivals" (5, 10, 15, 30, 60, 120 or 1440). ticketTypeId narrows everything.
export const getEventAttendance = (eventId: number, filter: { ticketTypeId?: number; interval?: number } = {}) => {
  const params = new URLSearchParams();
  if (filter.ticketTypeId) params.set("ticketTypeId", String(filter.ticketTypeId));
  if (filter.interval) params.set("interval", String(filter.interval));
  const query = params.size > 0 ? `?${params}` : "";
  return api<EventAttendance>(`/api/organizer/events/${eventId}/attendance${query}`);
};
