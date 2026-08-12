import { describe, expect, it } from "vitest";
import { dateInTripZone, formatTripDateTime, timeInTripZone, wallClockToInstant } from "./tripDateTime";

describe("trip date and time", () => {
  it("preserves exactly the date and time entered by the user", () => {
    const value = "2026-08-25T23:55:00.000Z";
    expect(dateInTripZone(value, "Europe/Paris")).toBe("2026-08-25");
    expect(timeInTripZone(value, "Europe/Paris")).toBe("23:55");
    expect(formatTripDateTime(value, "Europe/Paris")).toBe("Mar, 25 Ago 2026, 11:55 pm");
  });

  it("uses timezone only when calculating the notification instant", () => {
    expect(new Date(wallClockToInstant("2026-08-25T23:55", "America/Argentina/Buenos_Aires")).toISOString())
      .toBe("2026-08-26T02:55:00.000Z");
  });
});
