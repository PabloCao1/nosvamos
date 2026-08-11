import { mockTrips } from "../data/mockTrips";
import type { TripRepository } from "./TripRepository";

const wait = (milliseconds = 180) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class MockTripRepository implements TripRepository {
  async getAll() {
    await wait();
    return structuredClone(mockTrips);
  }

  async getActive() {
    await wait();
    return structuredClone(mockTrips[0] ?? null);
  }

  async getById(id: string) {
    await wait();
    return structuredClone(mockTrips.find((trip) => trip.id === id) ?? null);
  }

  async addTrip() {}
  async updateTrip() {}
  async deleteTrip() {}
  async addActivity() {}
  async addExpense() {}
  async addReservation() {}
  async updateActivity() {}
  async updateExpense() {}
  async updateReservation() {}
  async deleteActivity() {}
  async deleteExpense() {}
  async deleteReservation() {}
  async getPendingCount() { return 0; }
  async getSyncQueue() { return []; }
  async retryQueueItem() {}
  async discardQueueItem() {}
}
