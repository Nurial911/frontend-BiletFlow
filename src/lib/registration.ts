import type { Event } from "../api/types";
import { parseDate } from "./format";

export function registrationState(event: Pick<Event, "startTime" | "registrationOpeningTime" | "registrationClosingTime">, now = Date.now()): "open" | "not-open" | "closed" | "started" {
  if (now >= parseDate(event.startTime).getTime()) return "started";
  if (event.registrationClosingTime && now > parseDate(event.registrationClosingTime).getTime()) return "closed";
  if (event.registrationOpeningTime && now < parseDate(event.registrationOpeningTime).getTime()) return "not-open";
  return "open";
}
