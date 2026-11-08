import { api } from "./client";
import type { EventOrder, EventSales, Page, SalesSummary } from "./types";

export const getOrganizerSales = (eventIds?: number[]) => {
  const params = new URLSearchParams();
  eventIds?.forEach((id) => params.append("eventIds", String(id)));
  const query = params.size > 0 ? `?${params.toString()}` : "";
  return api<SalesSummary>(`/api/organizer/sales/events${query}`);
};

export const getEventSales = (eventId: number) =>
  api<EventSales>(`/api/organizer/events/${eventId}/sales`);

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
