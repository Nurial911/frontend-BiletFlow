import { api, apiBlob } from "./client";
import type {
  CreateEventRequest,
  CreateTicketTypeRequest,
  CreateVenueRequest,
  Event,
  EventHistoryEntry,
  EventPhase,
  OrganizerProfile,
  Page,
  TicketType,
  UpdateEventRequest,
  UpdateTicketTypeRequest,
  Venue,
} from "./types";

// GET /api/events — the backend has no filters yet (city, date, category, search),
// so the catalog loads every page and filters in the browser. Replace this when the
// backend adds query parameters.
export const getEvents = (page = 0, size = 100) =>
  api<Page<Event>>(`/api/events?page=${page}&size=${size}`);

// Every page of /api/events, so the catalog is not cut off at the first 100 events.
// Stops at the last page; the page limit only guards against a backend that never reports one.
export async function getAllEvents(size = 100, maxPages = 50): Promise<Page<Event>> {
  const first = await getEvents(0, size);
  const content = [...first.content];
  let current = first;
  for (let page = 1; page < maxPages && !current.last && page < current.totalPages && current.content.length > 0; page++) {
    current = await getEvents(page, size);
    content.push(...current.content);
  }
  return { ...first, content, last: true };
}

// GET /api/events/{id}
export const getEvent = (id: number) => api<Event>(`/api/events/${id}`);

// GET /api/events/{eventId}/ticket-types — prices live here, not on the event
export const getTicketTypes = (eventId: number) =>
  api<TicketType[]>(`/api/events/${eventId}/ticket-types`);

export const getOrganizerProfile = () => api<OrganizerProfile>("/api/organizers/profile");

// POST /api/organizers/profile — an ATTENDEE becomes an ORGANIZER (profile starts UNVERIFIED).
// The old token still carries the attendee role, so the response brings a new one to use instead.
export interface OrganizerProfileCreated { profile: OrganizerProfile; accessToken: string }
export const createOrganizerProfile = (contactInformation: string) =>
  api<OrganizerProfileCreated>("/api/organizers/profile", { method: "POST", body: { contactInformation } });

export const getOrganizerEvents = (organizerId: number, page = 0, size = 100) =>
  api<Page<Event>>(`/api/events/organizer/${organizerId}?page=${page}&size=${size}`);

export const getVenues = (page = 0, size = 100) =>
  api<Page<Venue>>(`/api/venues?page=${page}&size=${size}`);

export const createVenue = (venue: CreateVenueRequest) =>
  api<Venue>("/api/venues", { method: "POST", body: venue });

export const uploadEventPoster = (eventId: number, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api<Event>(`/api/events/${eventId}/poster`, { method: "POST", body: form });
};

export const deleteEventPoster = (eventId: number) =>
  api<void>(`/api/events/${eventId}/poster`, { method: "DELETE" });

export const getEventPoster = (posterUrl: string) => apiBlob(posterUrl);

export const createTicketType = (eventId: number, ticketType: CreateTicketTypeRequest) =>
  api<TicketType>(`/api/events/${eventId}/ticket-types`, { method: "POST", body: ticketType });

export const updateTicketType = (ticketTypeId: number, ticketType: UpdateTicketTypeRequest) =>
  api<TicketType>(`/api/ticket-types/${ticketTypeId}`, { method: "PUT", body: ticketType });

export const setTicketTypeHidden = (ticketTypeId: number, hidden: boolean) =>
  api<TicketType>(`/api/ticket-types/${ticketTypeId}/${hidden ? "hide" : "unhide"}`, { method: "POST" });

export const createEvent = (event: CreateEventRequest) =>
  api<Event>("/api/events", { method: "POST", body: event });

export const updateEvent = (eventId: number, event: UpdateEventRequest) =>
  api<Event>(`/api/events/${eventId}`, { method: "PUT", body: event });

export type EventManagementAction = "publish" | "unpublish" | "cancel";

export const manageEvent = (eventId: number, action: EventManagementAction) =>
  api<Event>(`/api/events/${eventId}/${action}`, { method: "POST" });

export const setEventSuspended = (eventId: number, suspended: boolean, reason = "") =>
  api<Event>(`/api/events/${eventId}/${suspended ? "suspend" : "unsuspend"}`, {
    method: "POST",
    ...(suspended ? { body: { reason } } : {}),
  });

// GET /api/organizer/events?phase=… — the organizer's own events in one phase (SRS 4.16)
export const getMyEventsByPhase = (phase: EventPhase, page = 0, size = 100) =>
  api<Page<Event>>(`/api/organizer/events?phase=${phase}&page=${page}&size=${size}`);

// POST /api/events/{id}/duplicate — a new DRAFT with the same details, venue, poster and refund policy.
// Orders, tickets, payments, check-ins and support cases are NOT copied. Ticket types are not copied either.
export const duplicateEvent = (eventId: number) =>
  api<Event>(`/api/events/${eventId}/duplicate`, { method: "POST" });

export interface EventHistoryFilter {
  page?: number;
  size?: number;
  from?: string; // yyyy-MM-dd, inclusive
  to?: string; // yyyy-MM-dd, inclusive
  entityType?: string;
}

// GET /api/organizer/events/{eventId}/history — newest first, organizer of the event or platform admin
export const getEventHistory = (eventId: number, filter: EventHistoryFilter = {}) => {
  const params = new URLSearchParams({ page: String(filter.page ?? 0), size: String(filter.size ?? 30) });
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.entityType) params.set("entityType", filter.entityType);
  return api<Page<EventHistoryEntry>>(`/api/organizer/events/${eventId}/history?${params}`);
};
