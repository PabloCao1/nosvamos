import type { Reservation, ReservationType, Trip } from "../../types/domain";
import { db, type AppNotification, type NotificationKind } from "../indexed-db/database";
import { getNotificationPreferences, type NotificationPreferences } from "./notificationPreferences";

const HOUR = 60 * 60 * 1000;

const rules: Partial<Record<ReservationType, { dayBefore: number; shortlyBefore: number }>> = {
  flight: { dayBefore: 24, shortlyBefore: 3 },
  train: { dayBefore: 24, shortlyBefore: 2 },
  bus: { dayBefore: 24, shortlyBefore: 2 },
  ferry: { dayBefore: 24, shortlyBefore: 2 },
  hotel: { dayBefore: 24, shortlyBefore: 3 },
  apartment: { dayBefore: 24, shortlyBefore: 3 },
  restaurant: { dayBefore: 24, shortlyBefore: 2 },
  activity: { dayBefore: 24, shortlyBefore: 1 },
  car: { dayBefore: 24, shortlyBefore: 2 },
  insurance: { dayBefore: 24, shortlyBefore: 3 },
  other: { dayBefore: 24, shortlyBefore: 2 },
};

function isEnabled(type: ReservationType, preferences: NotificationPreferences) {
  if (type === "flight") return preferences.flights;
  if (type === "hotel" || type === "apartment") return preferences.lodging;
  if (["train", "bus", "ferry", "car"].includes(type)) return preferences.transport;
  return preferences.activities;
}

function kindFor(type: ReservationType): NotificationKind {
  if (type === "hotel" || type === "apartment") return "lodging";
  if (["flight", "train", "bus", "ferry", "car"].includes(type)) return "transport";
  return "activity";
}

function reminder(
  trip: Trip,
  reservation: Reservation,
  offset: "dayBefore" | "shortlyBefore",
  hours: number,
  now: number,
): AppNotification | null {
  const startsAt = new Date(reservation.startAt).getTime();
  const dueAt = startsAt - hours * HOUR;
  if (!Number.isFinite(startsAt) || now < dueAt || now >= startsAt) return null;
  const id = `reminder:${reservation.id}:${offset}`;
  return {
    id,
    tripId: trip.id,
    kind: kindFor(reservation.type),
    title: offset === "dayBefore" ? `Mañana: ${reservation.title}` : `Próximo: ${reservation.title}`,
    body: offset === "dayBefore"
      ? `Empieza en aproximadamente 24 horas · ${reservation.city}`
      : `Empieza en ${hours} ${hours === 1 ? "hora" : "horas"} · ${reservation.city}`,
    createdAt: new Date(dueAt).toISOString(),
    priority: "important",
    targetPath: `/viaje/${trip.id}/reservas`,
  };
}

export async function syncLocalReminders(trips: Trip[], now = Date.now()) {
  const preferences = getNotificationPreferences();
  const reminders = trips.flatMap((trip) => trip.reservations.flatMap((reservation) => {
    if (reservation.status === "cancelled" || reservation.status === "completed") return [];
    if (!isEnabled(reservation.type, preferences)) return [];
    const rule = rules[reservation.type] ?? rules.other!;
    return [
      preferences.dayBefore ? reminder(trip, reservation, "dayBefore", rule.dayBefore, now) : null,
      preferences.shortlyBefore ? reminder(trip, reservation, "shortlyBefore", rule.shortlyBefore, now) : null,
    ].filter((item): item is AppNotification => item !== null);
  }));
  if (!reminders.length) return reminders;
  const existingIds = new Set(
    (await db.notifications.bulkGet(reminders.map((item) => item.id)))
      .filter((item): item is AppNotification => Boolean(item))
      .map((item) => item.id),
  );
  const newReminders = reminders.filter((item) => !existingIds.has(item.id));
  if (newReminders.length) await db.notifications.bulkAdd(newReminders);
  return newReminders;
}
