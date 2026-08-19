import Dexie, { type EntityTable } from "dexie";
import type { Activity, Expense, Reservation, Trip } from "../../types/domain";

export interface SyncQueueItem {
  id: string;
  operationId: string;
  entityType: "trip" | "activity" | "expense" | "reservation";
  localId: string;
  action: "create" | "update" | "delete";
  payload: unknown;
  attempts: number;
  lastError?: string;
  createdAt: string;
  nextAttemptAt: string;
  status: "pending" | "processing" | "failed";
}

interface AppMetadata {
  key: string;
  value: string;
}

export type NotificationKind =
  | "expense"
  | "lodging"
  | "transport"
  | "activity"
  | "document"
  | "task"
  | "payment"
  | "alert";

export interface AppNotification {
  id: string;
  tripId: string;
  actorId?: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
  priority: "normal" | "important";
  targetPath: string;
}

class NosVamosDatabase extends Dexie {
  trips!: EntityTable<Trip, "id">;
  activities!: EntityTable<Activity, "id">;
  reservations!: EntityTable<Reservation, "id">;
  expenses!: EntityTable<Expense, "id">;
  syncQueue!: EntityTable<SyncQueueItem, "id">;
  metadata!: EntityTable<AppMetadata, "key">;
  notifications!: EntityTable<AppNotification, "id">;

  constructor() {
    super("brujula");
    const baseSchema = {
      trips: "id, status, startDate, updatedAt",
      activities: "id, dayId, syncStatus, updatedAt",
      reservations: "id, tripId, destinationId, type, status, startAt, syncStatus",
      expenses: "id, tripId, paidBy, category, date, syncStatus",
      metadata: "key",
    };
    this.version(1).stores({
      ...baseSchema,
      syncQueue: "id, operationId, entityType, localId, status, createdAt, nextAttemptAt",
    });
    this.version(2).stores({
      ...baseSchema,
      syncQueue: "id, operationId, entityType, localId, [entityType+localId], status, createdAt, nextAttemptAt",
    });
    this.version(3).stores({
      ...baseSchema,
      syncQueue: "id, operationId, entityType, localId, [entityType+localId], status, createdAt, nextAttemptAt",
      notifications: "id, tripId, actorId, kind, priority, readAt, createdAt",
    });
    this.version(4)
      .stores({
        ...baseSchema,
        syncQueue: "id, operationId, entityType, localId, [entityType+localId], status, createdAt, nextAttemptAt",
        notifications: "id, tripId, actorId, kind, priority, readAt, createdAt",
      })
      .upgrade((transaction) =>
        transaction.table("trips").toCollection().modify({ baseCurrency: "USD" }),
      );
  }
}

export const db = new NosVamosDatabase();

const removedSeedTripIds = ["europe-2026", "central-europe-2026"];

export async function seedDemoData() {
  if (await db.metadata.get("real-seed-removed-v1")) return;
  const trips = await db.trips.bulkGet(removedSeedTripIds);
  const dayIds = trips.flatMap((trip) => trip?.itinerary.map((day) => day.id) ?? []);
  const related = await Promise.all([
    dayIds.length ? db.activities.where("dayId").anyOf(dayIds).primaryKeys() : [],
    db.reservations.where("tripId").anyOf(removedSeedTripIds).primaryKeys(),
    db.expenses.where("tripId").anyOf(removedSeedTripIds).primaryKeys(),
  ]);
  const localIds = [...removedSeedTripIds, ...related.flat()].map(String);

  await db.transaction(
    "rw",
    [db.trips, db.activities, db.reservations, db.expenses, db.notifications, db.syncQueue, db.metadata],
    async () => {
      if (dayIds.length) await db.activities.where("dayId").anyOf(dayIds).delete();
      await db.reservations.where("tripId").anyOf(removedSeedTripIds).delete();
      await db.expenses.where("tripId").anyOf(removedSeedTripIds).delete();
      await db.notifications.where("tripId").anyOf(removedSeedTripIds).delete();
      if (localIds.length) await db.syncQueue.where("localId").anyOf(localIds).delete();
      await db.trips.bulkDelete(removedSeedTripIds);
      await db.metadata.put({ key: "real-seed-removed-v1", value: new Date().toISOString() });
    },
  );
}

export async function seedDemoNotifications() {
  // Sin datos precargados: los avisos se crearán a partir de viajes del usuario.
}

export function createSyncableFields(status: "pending_create" | "pending_update" = "pending_create") {
  const now = new Date().toISOString();
  return {
    clientId: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    version: 1,
    syncStatus: status,
  } as const;
}

export function createQueueItem(
  entityType: SyncQueueItem["entityType"],
  localId: string,
  payload: unknown,
  action: SyncQueueItem["action"] = "create",
): SyncQueueItem {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    operationId: crypto.randomUUID(),
    entityType,
    localId,
    action,
    payload,
    attempts: 0,
    createdAt: now,
    nextAttemptAt: now,
    status: "pending",
  };
}

export async function enqueueCompacted(
  entityType: SyncQueueItem["entityType"],
  localId: string,
  payload: unknown,
  action: SyncQueueItem["action"],
) {
  const existing = await db.syncQueue
    .where("[entityType+localId]")
    .equals([entityType, localId])
    .first();
  if (!existing) {
    await db.syncQueue.add(createQueueItem(entityType, localId, payload, action));
    return;
  }
  if (existing.action === "create" && action === "delete") {
    await db.syncQueue.delete(existing.id);
    return;
  }
  await db.syncQueue.update(existing.id, {
    action: existing.action === "create" ? "create" : action,
    payload,
    status: "pending",
    attempts: 0,
    lastError: undefined,
    nextAttemptAt: new Date().toISOString(),
  });
}
