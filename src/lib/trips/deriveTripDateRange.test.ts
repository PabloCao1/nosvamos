import { describe, expect, it } from "vitest";
import { deriveTripDateRange } from "./deriveTripDateRange";

describe("deriveTripDateRange", () => {
  it("uses active reservations and destination dates", () => {
    const range = deriveTripDateRange({
      destinations: [{
        id: "madrid",
        city: "Madrid",
        country: "España",
        arrivalDate: "2026-09-03",
        departureDate: "2026-09-08",
        imageUrl: "",
      }],
      reservations: [{
        id: "flight",
        startAt: "2026-09-02T22:00:00.000Z",
        endAt: "2026-09-03T10:00:00.000Z",
        status: "confirmed",
      }, {
        id: "cancelled-flight",
        startAt: "2026-08-01T10:00:00.000Z",
        status: "cancelled",
      }],
    } as Parameters<typeof deriveTripDateRange>[0]);

    expect(range).toEqual({ startDate: "2026-09-02", endDate: "2026-09-08" });
  });

  it("returns null when no dated travel data exists", () => {
    expect(deriveTripDateRange({ destinations: [], reservations: [] })).toBeNull();
  });
});
