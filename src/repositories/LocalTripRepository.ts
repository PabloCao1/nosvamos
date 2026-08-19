import { createQueueItem, db, enqueueCompacted, seedDemoData } from "../lib/indexed-db/database";
import { deriveTripDateRange } from "../lib/trips/deriveTripDateRange";
import { findRecentDuplicateExpense } from "../lib/expenses/duplicateExpense";
import type { Activity, Expense, Reservation, Trip } from "../types/domain";
import type { TripRepository } from "./TripRepository";

export class LocalTripRepository implements TripRepository {
  private async hydrateTrip(trip: Trip | undefined): Promise<Trip | null> {
    if (!trip || trip.deletedAt) return null;
    const [activities, reservations, expenses] = await Promise.all([
      db.activities.toArray(),
      db.reservations.where("tripId").equals(trip.id).toArray(),
      db.expenses.where("tripId").equals(trip.id).toArray(),
    ]);
    const hydrated = {
      ...trip,
      itinerary: trip.itinerary.map((day) => ({
        ...day,
        activities: activities
          .filter((activity) => activity.dayId === day.id && !activity.deletedAt)
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      })),
      reservations: reservations
        .filter((item) => !item.deletedAt)
        .sort((a, b) => a.startAt.localeCompare(b.startAt)),
      expenses: expenses
        .filter((item) => !item.deletedAt)
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
    const range = deriveTripDateRange(hydrated);
    return { ...hydrated, ...(range ?? {}) };
  }

  async getAll() {
    await seedDemoData();
    const trips = (await db.trips.toArray()).filter((trip) => !trip.deletedAt);
    return (await Promise.all(trips.map((trip) => this.hydrateTrip(trip)))).filter(
      (trip): trip is Trip => trip !== null,
    );
  }

  async getActive() {
    await seedDemoData();
    return this.hydrateTrip(await db.trips.where("status").anyOf("confirmed", "in_progress", "planning").first());
  }

  async getById(id: string) {
    await seedDemoData();
    return this.hydrateTrip(await db.trips.get(id));
  }

  async addTrip(trip: Trip) {
    await db.transaction("rw", [db.trips, db.syncQueue], async () => {
      await db.trips.add(trip);
      await db.syncQueue.add(createQueueItem("trip", trip.id, trip));
    });
  }

  async updateTrip(trip: Trip) {
    const value: Trip = {
      ...trip,
      updatedAt: new Date().toISOString(),
      version: trip.version + 1,
      syncStatus: trip.syncStatus === "pending_create" ? "pending_create" : "pending_update",
    };
    await db.transaction("rw", [db.trips, db.syncQueue], async () => {
      await db.trips.put(value);
      await enqueueCompacted("trip", value.id, value, "update");
    });
  }

  async deleteTrip(trip: Trip) {
    await db.transaction("rw", [db.trips, db.syncQueue], async () => {
      await db.trips.put({
        ...trip,
        deletedAt: new Date().toISOString(),
        syncStatus: "pending_delete",
        version: trip.version + 1,
      });
      await enqueueCompacted("trip", trip.id, { id: trip.id }, "delete");
    });
  }

  async addActivity(activity: Activity) {
    await db.transaction("rw", [db.activities, db.syncQueue], async () => {
      await db.activities.add(activity);
      await db.syncQueue.add(createQueueItem("activity", activity.id, activity));
    });
  }

  async addExpense(expense: Expense) {
    await db.transaction("rw", [db.expenses, db.syncQueue], async () => {
      const tripExpenses = await db.expenses.where("tripId").equals(expense.tripId).toArray();
      if (findRecentDuplicateExpense(expense, tripExpenses)) {
        throw new Error("Este gasto ya fue agregado hace unos minutos.");
      }
      await db.expenses.add(expense);
      await db.syncQueue.add(createQueueItem("expense", expense.id, expense));
    });
  }

  async addReservation(reservation: Reservation) {
    await db.transaction("rw", [db.reservations, db.syncQueue], async () => {
      await db.reservations.add(reservation);
      await db.syncQueue.add(createQueueItem("reservation", reservation.id, reservation));
    });
  }

  async updateActivity(activity: Activity) {
    const value = { ...activity, updatedAt: new Date().toISOString(), version: activity.version + 1, syncStatus: activity.syncStatus === "pending_create" ? "pending_create" as const : "pending_update" as const };
    await db.transaction("rw", [db.activities, db.syncQueue], async () => {
      await db.activities.put(value);
      await enqueueCompacted("activity", value.id, value, "update");
    });
  }

  async updateExpense(expense: Expense) {
    const value = { ...expense, updatedAt: new Date().toISOString(), version: expense.version + 1, syncStatus: expense.syncStatus === "pending_create" ? "pending_create" as const : "pending_update" as const };
    await db.transaction("rw", [db.expenses, db.syncQueue], async () => {
      await db.expenses.put(value);
      await enqueueCompacted("expense", value.id, value, "update");
    });
  }

  async updateReservation(reservation: Reservation) {
    const value = { ...reservation, updatedAt: new Date().toISOString(), version: reservation.version + 1, syncStatus: reservation.syncStatus === "pending_create" ? "pending_create" as const : "pending_update" as const };
    await db.transaction("rw", [db.reservations, db.syncQueue], async () => {
      await db.reservations.put(value);
      await enqueueCompacted("reservation", value.id, value, "update");
    });
  }

  async deleteActivity(activity: Activity) {
    await this.deleteActivityPermanently(activity);
  }

  async deleteActivityPermanently(activity: Activity, deletedAt = new Date().toISOString()) {
    await db.transaction("rw", [db.activities, db.syncQueue], async () => {
      await db.activities.put({ ...activity, deletedAt, syncStatus: "pending_delete", version: activity.version + 1 });
      await enqueueCompacted("activity", activity.id, { id: activity.id }, "delete");
    });
  }

  async deleteExpense(expense: Expense) {
    await db.transaction("rw", [db.expenses, db.syncQueue], async () => {
      const value: Expense = {
        ...expense,
        status: "cancelled",
        updatedAt: new Date().toISOString(),
        syncStatus: expense.syncStatus === "pending_create" ? "pending_create" : "pending_update",
        version: expense.version + 1,
      };
      await db.expenses.put(value);
      await enqueueCompacted("expense", expense.id, value, "update");
    });
  }

  async deleteReservation(reservation: Reservation) {
    await this.deleteReservationPermanently(reservation);
  }

  async deleteReservationPermanently(reservation: Reservation, deletedAt = new Date().toISOString()) {
    await db.transaction("rw", [db.reservations, db.syncQueue], async () => {
      const value: Reservation = {
        ...reservation,
        deletedAt,
        updatedAt: new Date().toISOString(),
        syncStatus: "pending_delete",
        version: reservation.version + 1,
      };
      await db.reservations.put(value);
      await enqueueCompacted("reservation", reservation.id, { id: reservation.id }, "delete");
    });
  }

  async getPendingCount() {
    await seedDemoData();
    return db.syncQueue.where("status").equals("pending").count();
  }

  async syncPending() {
    return false;
  }

  async getSyncQueue() {
    await seedDemoData();
    return db.syncQueue.orderBy("createdAt").reverse().toArray();
  }

  async retryQueueItem(id: string) {
    await db.syncQueue.update(id, { status: "pending", attempts: 0, lastError: undefined, nextAttemptAt: new Date().toISOString() });
  }

  async discardQueueItem(id: string) {
    await db.syncQueue.delete(id);
  }
}
