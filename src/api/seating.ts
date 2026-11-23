import { api } from "./client";

// Assigned seating (backend SRS 4.3.1). An ASSIGNED event has a seat map made of sections:
// SEATED sections are bought as specific seats (seatIds on the order), STANDING sections
// by ticket type and quantity, like general admission.
export type SeatingMode = "GENERAL_ADMISSION" | "ASSIGNED";
export type SectionKind = "SEATED" | "STANDING";
// AVAILABLE can be picked; HELD is in someone else's unpaid order; YOURS is in the viewer's own
// unpaid order; SOLD is paid; UNAVAILABLE is blocked by the organizer or its section isn't on sale.
export type SeatStatus = "AVAILABLE" | "HELD" | "YOURS" | "SOLD" | "UNAVAILABLE";

export interface MapArea {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SeatSection {
  id: number;
  key: string;
  name: string;
  kind: SectionKind;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  onSale: boolean;
  ticketTypeId: number | null;
  ticketTypeName: string | null;
  price: number | null;
  available: number;
  held: number;
  sold: number;
  blocked: number;
}

export interface SeatMap {
  eventId: number;
  seatingMode: SeatingMode;
  layoutKey: string | null; // null when the venue has no seat map
  layoutName: string | null;
  width: number | null;     // map size, in the layout's units
  height: number | null;
  stage: MapArea | null;
  capacity: number | null;
  sections: SeatSection[];
}

export interface Seat {
  id: number;
  row: string;
  number: number;
  x: number; // seat centre on the map, in the same units as the sections
  y: number;
  accessible: boolean;
  status: SeatStatus;
}

export interface SectionSeats {
  section: SeatSection;
  seats: Seat[]; // empty for a standing section
}

// GET /api/events/{id}/seat-map — public: sections with prices and availability
export const getSeatMap = (eventId: number) => api<SeatMap>(`/api/events/${eventId}/seat-map`);

// GET /api/events/{id}/seat-map/sections/{sectionId} — public: one section's seats; poll to stay current
export const getSectionSeats = (eventId: number, sectionId: number) =>
  api<SectionSeats>(`/api/events/${eventId}/seat-map/sections/${sectionId}`);

export interface SeatingLayout { key: string; name: string; description: string; capacity: number; seatCount: number; standingCapacity: number }
export const getSeatingLayouts = () => api<SeatingLayout[]>("/api/venues/seating-layouts");
export const setVenueLayout = (id: number, seatingLayout: string | null) => api(`/api/venues/${id}/seating-layout`, { method: "PUT", body: { seatingLayout } });
export const getSeating = (id: number) => api<SeatMap>(`/api/events/${id}/seating`);
export const setSeatingMode = (id: number, mode: SeatingMode) => api<SeatMap>(`/api/events/${id}/seating`, { method: "PUT", body: { mode } });
export const assignSection = (id: number, sectionId: number, ticketTypeId: number | null) => api<SeatMap>(`/api/events/${id}/seating/sections/${sectionId}`, { method: "PUT", body: { ticketTypeId } });
export const setSeatsBlocked = (id: number, seatIds: number[], blocked: boolean) => api<SeatMap>(`/api/events/${id}/seating/seats`, { method: "PUT", body: { seatIds, blocked } });
