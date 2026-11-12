import { api, apiBlob } from "./client";
import type { Order, OrderQuote, Page, PromoPreview, Ticket } from "./types";

export interface OrderItemInput {
  ticketTypeId: number;
  quantity: number;
}

// POST /api/orders — creates an order with status PENDING.
// promoCode is optional; the server calculates the discount itself.
export const createOrder = (eventId: number, items: OrderItemInput[], promoCode?: string) =>
  api<Order>("/api/orders", { method: "POST", body: { eventId, items, promoCode } });

// POST /api/orders/quote — same body as createOrder, shows the price with the discount, reserves nothing
export const quoteOrder = (eventId: number, items: OrderItemInput[], promoCode?: string) =>
  api<OrderQuote>("/api/orders/quote", { method: "POST", body: { eventId, items, promoCode } });

// GET /api/events/{eventId}/promo?code=... or ?token=... (token comes from a Campaign QR link)
export const previewPromo = (eventId: number, params: { code?: string; token?: string }) => {
  const query = new URLSearchParams();
  if (params.code) query.set("code", params.code);
  if (params.token) query.set("token", params.token);
  return api<PromoPreview>(`/api/events/${eventId}/promo?${query.toString()}`);
};

// GET /api/orders/{id}
export const getOrder = (id: number) => api<Order>(`/api/orders/${id}`);

// POST /api/orders/{id}/pay — simulated payment, status becomes PAID.
// Pass "DECLINED" to test a failed payment: the server answers 402 and the order stays PENDING.
export const payOrder = (id: number, simulatedOutcome?: "DECLINED") =>
  api<Order>(`/api/orders/${id}/pay`, {
    method: "POST",
    body: simulatedOutcome ? { simulatedOutcome } : undefined,
  });

// POST /api/orders/{id}/cancel
export const cancelOrder = (id: number) => api<Order>(`/api/orders/${id}/cancel`, { method: "POST" });

// GET /api/orders — my orders
export const getMyOrders = (page = 0, size = 20) =>
  api<Page<Order>>(`/api/orders?page=${page}&size=${size}`);

export const getMyTickets = (page = 0, size = 20) =>
  api<Page<Ticket>>(`/api/tickets?page=${page}&size=${size}`);

export const getTicketQr = (ticketId: number) => apiBlob(`/api/tickets/${ticketId}/qr`);

// GET /api/tickets/{id}/pdf — printable A4 ticket
export const getTicketPdf = (ticketId: number) => apiBlob(`/api/tickets/${ticketId}/pdf`);