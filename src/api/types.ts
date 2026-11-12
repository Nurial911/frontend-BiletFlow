// These types copy the "Schemas" section of the backend's Swagger (api-docs.json).
// If the backend changes a field, change it here and TypeScript will show
// every place in the app that needs updating.

export interface User {
  id: number;
  email: string;
  role: string;
  verificationStatus: boolean;
  createdAt: string;
}

export interface UpdateTicketTypeRequest {
  name?: string;
  description?: string;
  price?: number;
  quantity?: number;
  salesStart?: string;
  salesEnd?: string;
  maxPerOrder?: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface TicketTypeSales {
  ticketTypeId: number;
  name: string;
  price: number;
  hidden: boolean;
  quantity: number;
  sold: number;
  reserved: number;
  available: number;
  revenue: number;
}

export interface DailySales {
  date: string;
  paidOrders: number;
  ticketsSold: number;
  revenue: number;
}

export interface EventSales {
  eventId: number;
  eventTitle: string;
  status: EventStatus;
  suspended: boolean;
  startTime: string;
  endTime?: string;
  capacity?: number;
  paidOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  expiredOrders: number;
  ticketsSold: number;
  ticketsReserved: number;
  revenue: number;
  ticketTypes: TicketTypeSales[];
  salesByDay: DailySales[];
}

export interface SalesTotals {
  events: number;
  paidOrders: number;
  pendingOrders: number;
  ticketsSold: number;
  ticketsReserved: number;
  revenue: number;
}

export interface SalesSummary {
  events: EventSales[];
  totals: SalesTotals;
}

export interface EventOrder {
  id: number;
  status: OrderStatus;
  buyerId: number;
  buyerEmail: string;
  totalAmount: number;
  ticketCount: number;
  createdAt: string;
  expiresAt?: string;
  paidAt?: string;
  items: OrderItem[];
}

export interface Venue {
  id: number;
  name: string;
  address: string;
  capacity: number | null;
}

export interface CreateVenueRequest {
  name: string;
  address: string;
  capacity: number;
}

export interface CreateTicketTypeRequest {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  salesStart?: string;
  salesEnd?: string;
  maxPerOrder?: number;
}

export interface OrganizerProfile {
  id: number;
  userId: number;
  contactInformation: string;
  verificationStatus: string;
}

export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";
export type Visibility = "PUBLIC" | "UNLISTED" | "PRIVATE";

export interface CreateEventRequest {
  title: string;
  description?: string;
  category: string;
  startTime: string;
  endTime?: string;
  registrationOpeningTime?: string;
  registrationClosingTime?: string;
  capacity?: number;
  visibilityStatus: Visibility;
  venueId: number;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  category?: string;
  startTime?: string;
  endTime?: string;
  registrationOpeningTime?: string;
  registrationClosingTime?: string;
  capacity?: number;
  visibilityStatus?: Visibility;
  venueId?: number;
}

export interface Event {
  id: number;
  title: string;
  description?: string;
  category: string;
  startTime: string;
  endTime?: string;
  registrationOpeningTime?: string;
  registrationClosingTime?: string;
  capacity?: number;
  visibilityStatus?: Visibility;
  status?: EventStatus;
  suspended?: boolean;
  suspendedAt?: string;
  suspensionReason?: string;
  organizerId?: number;
  venue?: Venue;
  posterUrl?: string | null;
}

export interface TicketType {
  id: number;
  eventId: number;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  sold: number;
  available: number;
  salesStart?: string;
  salesEnd?: string;
  maxPerOrder?: number;
  hidden: boolean;
}

// Spring Boot wraps every list in this "page" object. The items are in `content`.
export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
export type OrderStatus = "PENDING" | "PAID" | "CANCELLED" | "EXPIRED";

export interface OrderItem {
  ticketTypeId: number;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: number;
  eventId: number;
  eventTitle: string;
  status: OrderStatus;
  attendeeName?: string;      
  subtotalAmount: number;      
  discountAmount: number;     
  totalAmount: number;
  promoCode?: string | null;  
  createdAt: string;
  expiresAt?: string;
  paidAt?: string;
  items: OrderItem[];
}

export type TicketStatus = "VALID" | "USED" | "CANCELLED";

export interface Ticket {
  id: number;
  code: string;
  status: TicketStatus;
  orderId: number;
  eventId: number;
  eventTitle: string;
  ticketTypeId: number;
  ticketTypeName: string;
  attendeeEmail: string;
  attendeeName?: string;
  usedAt?: string;
}

export interface CheckInStats {
  eventId: number;
  registered: number;
  checkedIn: number;
  notCheckedIn: number;
}

export interface CheckInResult {
  result: string;
  message: string;
  checkedInAt?: string;
  ticket: Ticket;
}

export interface EventStaff {
  eventId: number;
  userId: number;
  email: string;
  assignedAt: string;
}

export interface OrderQuote {
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  promoCode?: string | null;
}

export interface PromoPreview {
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  validUntil?: string;
  ticketTypeIds: number[];
}