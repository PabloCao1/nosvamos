import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSyncableFields, db } from "../lib/indexed-db/database";
import type { Expense, Reservation, Trip } from "../types/domain";
import { LocalTripRepository } from "./LocalTripRepository";

const tripFixture = (): Trip => ({
  ...createSyncableFields(),
  id: "test-trip",
  name: "Viaje de prueba",
  description: "",
  coverUrl: "",
  startDate: "2030-01-01",
  endDate: "2030-01-05",
  baseCurrency: "USD",
  timezone: "UTC",
  status: "planning",
  participants: [{ id: "test-owner", name: "Persona", initials: "PE", color: "#8EDCC5", role: "owner" }],
  destinations: [],
  itinerary: [],
  reservations: [],
  expenses: [],
});

const expenseFixture = (): Expense => ({
  ...createSyncableFields(),
  id: "test-expense",
  tripId: "test-trip",
  description: "Gasto de prueba",
  category: "food",
  originalAmount: 20,
  originalCurrency: "USD",
  exchangeRate: 1,
  convertedAmount: 20,
  paidBy: "test-owner",
  date: "2030-01-02",
  splits: [{ participantId: "test-owner", amount: 20 }],
});

describe("LocalTripRepository", () => {
  const repository = new LocalTripRepository();

  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it("genera un identificador de cliente distinto para cada alta", () => {
    expect(createSyncableFields().clientId).not.toBe(createSyncableFields().clientId);
  });

  afterEach(async () => {
    await db.delete();
  });

  it("inicia sin viajes precargados", async () => {
    expect(await repository.getAll()).toEqual([]);
    expect(await repository.getActive()).toBeNull();
  });

  it("guarda un viaje local y lo hidrata", async () => {
    const trip = tripFixture();
    await repository.addTrip(trip);
    expect(await repository.getById(trip.id)).toMatchObject({ id: trip.id, name: trip.name });
  });

  it("guarda un gasto y su operación pendiente", async () => {
    await repository.addTrip(tripFixture());
    const expense = expenseFixture();
    await repository.addExpense(expense);

    expect(await db.expenses.get(expense.id)).toMatchObject({ syncStatus: "pending_create" });
    expect(await db.syncQueue.where("localId").equals(expense.id).first()).toMatchObject({
      entityType: "expense",
      action: "create",
      status: "pending",
    });
  });

  it("compacta actualizaciones repetidas", async () => {
    const expense = expenseFixture();
    await repository.addExpense(expense);
    await repository.updateExpense({ ...expense, description: "Primer cambio" });
    await repository.updateExpense({ ...expense, description: "Cambio final" });

    const operations = await db.syncQueue.where("localId").equals(expense.id).toArray();
    expect(operations).toHaveLength(1);
    expect(operations[0]).toMatchObject({ action: "create", payload: { description: "Cambio final" } });
  });

  it("rechaza un gasto idÃ©ntico creado pocos minutos despuÃ©s", async () => {
    const expense = expenseFixture();
    await repository.addExpense(expense);

    await expect(repository.addExpense({
      ...expense,
      id: "duplicate-expense",
      createdAt: new Date(new Date(expense.createdAt).getTime() + 60_000).toISOString(),
    })).rejects.toThrow("Este gasto ya fue agregado");

    expect(await db.expenses.where("tripId").equals(expense.tripId).count()).toBe(1);
    expect(await db.syncQueue.where("entityType").equals("expense").count()).toBe(1);
  });

  it("permite gastos parecidos que no son duplicados exactos", async () => {
    const expense = expenseFixture();
    await repository.addExpense(expense);

    await expect(repository.addExpense({
      ...expense,
      id: "different-expense",
      originalAmount: expense.originalAmount + 1,
      convertedAmount: expense.convertedAmount + 1,
    })).resolves.toBeUndefined();
  });

  it("cancela una alta local eliminada antes de sincronizar", async () => {
    await repository.addTrip(tripFixture());
    const reservation = {
      ...createSyncableFields(), id: "local-reservation", tripId: "test-trip", type: "hotel",
      title: "Hotel", provider: "generic", providerName: "", providerReference: "",
      startAt: "2030-01-02T15:00", city: "Madrid", status: "confirmed", paymentStatus: "unpaid",
      totalAmount: 100, currency: "USD", participantIds: [], availableOffline: true, importSource: "manual",
    } as Reservation;
    await repository.addReservation(reservation);
    await repository.deleteReservation(reservation);

    expect(await db.syncQueue.where("localId").equals(reservation.id).count()).toBe(0);
    expect((await repository.getById("test-trip"))?.reservations).toEqual([]);
    expect((await db.reservations.get(reservation.id))?.deletedAt).toBeDefined();
  });
});
