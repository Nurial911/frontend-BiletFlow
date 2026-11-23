// These types copy the "Schemas" section of the backend's Swagger (api-docs.json).
// If the backend changes a field, change it here and TypeScript will show
// every place in the app that needs updating.

export interface User {
  suspended?: boolean;
  suspendedAt?: string;
  suspensionReason?: string;
  fullName?: string;
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
  refunded?: number;
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
  refunds?: number;
  refundedOrders?: number;
  ticketsRefunded?: number;
  discounts: number;
  netRevenue: number;
  processingFees: number;
  estimatedPayout: number;
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
  refunds?: number;
  refundedOrders?: number;
  ticketsRefunded?: number;
  discounts: number;
  netRevenue: number;
  processingFees: number;
  estimatedPayout: number;
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
  attendeeName?: string;
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
  seatingLayout?: string | null;
  id: number;
  name: string;
  address: string;
  capacity: number | null;
}

export interface CreateVenueRequest {
  seatingLayout?: string;
  name: string;
  address: string;
  capacity?: number;
}

export interface CreateTicketTypeRequest {
  name: string;
  description?: string;
  price: number;
  quantity?: number;
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

// Where the event is in time (SRS 4.16), calculated by the backend from the clock and the status
export type EventPhase = "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED";

// GET /api/organizer/events/{eventId}/attendance (SRS 4.15)
// Ticket holders = VALID + USED tickets; refunded and cancelled tickets don't count.
export interface TicketTypeAttendance {
  ticketTypeId: number;
  name: string;
  hidden: boolean;
  ticketHolders: number;
  checkedIn: number;
  absent: number;
  checkInRate: number; // percent, one decimal
}

export interface ArrivalInterval {
  from: string; // inclusive
  to: string; // exclusive
  checkedIn: number;
  cumulative: number;
}

export interface EventAttendance {
  eventId: number;
  eventTitle: string;
  phase: EventPhase;
  startTime: string;
  endTime?: string | null;
  ticketTypeId?: number | null; // the filter applied, null = all ticket types
  ticketHolders: number;
  checkedIn: number;
  absent: number; // "not arrived yet" while the event runs, absent once it is over
  checkInRate: number;
  undoneCheckIns: number;
  firstArrival?: string | null;
  lastArrival?: string | null;
  intervalMinutes: number;
  ticketTypes: TicketTypeAttendance[];
  arrivals: ArrivalInterval[]; // only intervals with arrivals, oldest first
}

// GET /api/organizer/events/{eventId}/history — one line of the activity timeline
export interface EventHistoryEntry {
  id: number;
  timestamp: string;
  actorId?: number | null;
  actorName?: string | null; // admins are shown as "BiletFlow Support"
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string; // e.g. EVENT_PUBLISHED, ORDER_REFUNDED, TICKET_CHECKED_IN
  entityType: string; // EVENT, TICKET_TYPE, ORDER, PAYMENT, TICKET, PROMO_CAMPAIGN, ...
  entityId?: number | null;
  description: string;
}
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
  refundPolicy?: string;
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
  refundPolicy?: string;
}

export interface Event {
  paidSalesActive?: boolean;
  id: number;
  title: string;
  description?: string;
  refundPolicy?: string | null;
  phase?: EventPhase;
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
  // ASSIGNED: buy seated sections on the seat map (see api/seating.ts)
  seatingMode?: "GENERAL_ADMISSION" | "ASSIGNED";
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
export type OrderStatus = "PENDING" | "PAID" | "CANCELLED" | "EXPIRED" | "REFUNDED";

export interface OrderItem {
  ticketTypeId: number;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
  // Assigned seating; null for general admission. seatLabel reads e.g. "Stalls, row A, seat 5".
  seatId?: number | null;
  sectionName?: string | null;
  rowLabel?: string | null;
  seatNumber?: number | null;
  seatLabel?: string | null;
}

export interface Order {
  attendeeName?: string;
  subtotalAmount?: number;
  discountAmount?: number;
  promoCode?: string | null;
  id: number;
  eventId: number;
  eventTitle: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  expiresAt?: string;
  paidAt?: string;
  items: OrderItem[];
}

export type TicketStatus = "VALID" | "USED" | "CANCELLED" | "REFUNDED";

// GET /api/orders/{orderId}/refunds — one entry per refund attempt
export type RefundStatus = "PENDING" | "SUCCEEDED" | "FAILED";

export interface Refund {
  id: number;
  orderId: number;
  status: RefundStatus;
  amount: number;
  reference: string;
  provider: string; // SIMULATED or HALYK
  simulated: boolean;
  reason?: string | null;
  failureReason?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface Ticket {
  attendeeName?: string;
  id: number;
  code: string;
  status: TicketStatus;
  orderId: number;
  eventId: number;
  eventTitle: string;
  ticketTypeId: number;
  ticketTypeName: string;
  attendeeEmail: string;
  usedAt?: string;
  seatId?: number | null;
  seatLabel?: string | null; // assigned seating only
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
