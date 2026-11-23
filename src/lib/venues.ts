import type { CreateVenueRequest, Venue } from "../api/types";
import { addressCityPrefix, cities, venueCity } from "./cities";

export function venuesInCity(venues: Venue[], cityId: string): Venue[] {
  if (!cityId) return [];
  return venues.filter(venue => cityId === "unknown" ? venueCity(venue) === null : venueCity(venue) === cityId);
}

export function prepareVenueRequest(input: { name: string; cityId: string; address: string; capacity: string | number; seatingLayout?: string }): CreateVenueRequest {
  const city = cities.find(item => item.id === input.cityId);
  if (!city) throw new Error("Выберите город площадки.");
  const name = input.name.trim();
  const streetAddress = input.address.trim();
  const capacity = Number(input.capacity);
  if (!name || !streetAddress || (!input.seatingLayout && (!Number.isSafeInteger(capacity) || capacity <= 0))) {
    throw new Error("Укажите название, адрес и вместимость площадки (целое число больше нуля).");
  }
  const prefix = addressCityPrefix(streetAddress);
  if (prefix && prefix !== city.id) throw new Error("Город в адресе не совпадает с выбранным городом площадки.");
  // The current API has no city property; keep the explicit selection in its
  // persisted address rather than sending an unsupported field or local cache.
  const address = prefix === city.id ? streetAddress : `${city.ru}, ${streetAddress}`;
  if (address.length > 300) throw new Error("Адрес вместе с городом не должен превышать 300 символов.");
  return { name, address, ...(input.seatingLayout ? { seatingLayout: input.seatingLayout } : { capacity }) };
}

export function validateEventVenue(cityId: string, venue?: Venue, legacyVenueId?: number) {
  const knownCity = cities.some(city => city.id === cityId);
  const legacyCity = cityId === "unknown" && legacyVenueId !== undefined && venue?.id === legacyVenueId && venueCity(venue) === null;
  if (!knownCity && !legacyCity) throw new Error("Выберите город события.");
  if (!venue || (knownCity && venueCity(venue) !== cityId)) throw new Error("Выберите площадку в выбранном городе.");
}
