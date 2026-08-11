import type { Activity, Expense, Reservation, Trip } from "../types/domain";
import type { SyncQueueItem } from "../lib/indexed-db/database";

export interface TripRepository {
  getAll(): Promise<Trip[]>;
  getActive(): Promise<Trip | null>;
  getById(id: string): Promise<Trip | null>;
  addTrip(trip: Trip): Promise<void>;
  updateTrip(trip: Trip): Promise<void>;
  deleteTrip(trip: Trip): Promise<void>;
  addActivity(activity: Activity): Promise<void>;
  addExpense(expense: Expense): Promise<void>;
  addReservation(reservation: Reservation): Promise<void>;
  updateActivity(activity: Activity): Promise<void>;
  updateExpense(expense: Expense): Promise<void>;
  updateReservation(reservation: Reservation): Promise<void>;
  deleteActivity(activity: Activity): Promise<void>;
  deleteExpense(expense: Expense): Promise<void>;
  deleteReservation(reservation: Reservation): Promise<void>;
  getPendingCount(): Promise<number>;
  getSyncQueue(): Promise<SyncQueueItem[]>;
  retryQueueItem(id: string): Promise<void>;
  discardQueueItem(id: string): Promise<void>;
}
