import { api, apiBlob } from "./client";
import type { Order, Page, Ticket } from "./types";
import type { OrderQuote, Payment, PaymentSession } from "./commerce";

export interface OrderItemInput {
  ticketTypeId: number;
  quantity: number;
}

// POST /api/orders — creates an order with status PENDING
export interface CheckoutDetails { attendeeName?: string; promoCode?: string }
export const createOrder = (eventId: number, items: OrderItemInput[], details: CheckoutDetails = {}) =>
  api<Order>("/api/orders", { method: "POST", body: { eventId, items, ...details } });
export const quoteOrder = (eventId: number, items: OrderItemInput[], promoCode?: string) =>
  api<OrderQuote>("/api/orders/quote", { method: "POST", body: { eventId, items, promoCode } });
export const openPaymentSession = (id: number) => api<PaymentSession>(`/api/orders/${id}/payment-session`, { method: "POST" });
export const checkPayment = (id: number) => api<Order>(`/api/orders/${id}/payment-check`, { method: "POST" });
export const getPayments = (id: number) => api<Payment[]>(`/api/orders/${id}/payments`);

// GET /api/orders/{id}
export const getOrder = (id: number) => api<Order>(`/api/orders/${id}`);

// POST /api/orders/{id}/pay — simulated payment, status becomes PAID
export const payOrder = (id: number, simulatedOutcome?: "DECLINED" | "SUCCESS") => api<Order>(`/api/orders/${id}/pay`, { method: "POST", ...(simulatedOutcome ? { body: { simulatedOutcome } } : {}) });

// POST /api/orders/{id}/cancel
export const cancelOrder = (id: number) => api<Order>(`/api/orders/${id}/cancel`, { method: "POST" });

// GET /api/orders — my orders
export const getMyOrders = (page = 0, size = 20) =>
  api<Page<Order>>(`/api/orders?page=${page}&size=${size}`);

export const getMyTickets = (page = 0, size = 20) =>
  api<Page<Ticket>>(`/api/tickets?page=${page}&size=${size}`);

export const getTicketQr = (ticketId: number) => apiBlob(`/api/tickets/${ticketId}/qr`);
export const getTicketPdf = (ticketId: number) => apiBlob(`/api/tickets/${ticketId}/pdf`);
