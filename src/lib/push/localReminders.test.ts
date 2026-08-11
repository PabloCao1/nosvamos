import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../indexed-db/database";
import { createSyncableFields } from "../indexed-db/database";
import { defaultNotificationPreferences, saveNotificationPreferences } from "./notificationPreferences";
import { syncLocalReminders } from "./localReminders";
import type { Reservation, Trip } from "../../types/domain";

describe("syncLocalReminders", () => {
  beforeEach(async () => {
    await db.notifications.clear();
    localStorage.clear();
    saveNotificationPreferences(defaultNotificationPreferences);
  });

  it("crea recordatorios sin volver a marcar como no leído uno existente", async () => {
    const now = new Date("2026-08-10T11:00:00Z").getTime();
    const reservation: Reservation = {
      ...createSyncableFields(),
      id: "flight-1",
      tripId: "trip-1",
      type: "flight",
      title: "Vuelo a Madrid",
      provider: "generic",
      providerName: "Aerolínea",
      providerReference: "ABC",
      startAt: "2026-08-10T12:00:00Z",
      city: "Ciudad de prueba",
      status: "confirmed",
      paymentStatus: "paid",
      totalAmount: 100,
      currency: "USD",
      participantIds: [],
      availableOffline: true,
      importSource: "manual",
    };
    const trip: Trip = {
      ...createSyncableFields(),
      id: "trip-1",
      name: "España",
      description: "",
      coverUrl: "",
      startDate: "2026-08-10",
      endDate: "2026-08-20",
      baseCurrency: "USD",
      timezone: "America/Argentina/Buenos_Aires",
      status: "confirmed",
      participants: [],
      destinations: [],
      itinerary: [],
      reservations: [reservation],
      expenses: [],
    };

    await syncLocalReminders([trip], now);
    const first = await db.notifications.get("reminder:flight-1:shortlyBefore");
    expect(first?.title).toBe("Próximo: Vuelo a Madrid");
    await db.notifications.update(first!.id, { readAt: new Date(now).toISOString() });

    expect(await syncLocalReminders([trip], now)).toHaveLength(0);
    expect((await db.notifications.get(first!.id))?.readAt).toBeDefined();
  });
});
