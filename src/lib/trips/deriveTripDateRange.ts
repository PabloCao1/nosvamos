import type { Trip } from "../../types/domain";

export interface TripDateRange {
  startDate: string;
  endDate: string;
}

export function deriveTripDateRange(
  trip: Pick<Trip, "destinations" | "reservations">,
): TripDateRange | null {
  const dates = [
    ...trip.destinations.flatMap((destination) => [
      destination.arrivalDate,
      destination.departureDate,
    ]),
    ...trip.reservations
      .filter((reservation) => reservation.status !== "cancelled")
      .flatMap((reservation) => [
        reservation.startAt.slice(0, 10),
        reservation.endAt?.slice(0, 10) ?? reservation.startAt.slice(0, 10),
      ]),
  ].filter(Boolean).sort();

  if (dates.length === 0) return null;
  return { startDate: dates[0], endDate: dates.at(-1) ?? dates[0] };
}
