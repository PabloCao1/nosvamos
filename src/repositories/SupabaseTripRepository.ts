import { db } from "../lib/indexed-db/database";
import { deriveTripDateRange } from "../lib/trips/deriveTripDateRange";
import { wallClockToInstant } from "../lib/dates/tripDateTime";
import { supabase } from "../lib/supabase";
import type { Activity, Destination, Expense, ItineraryDay, Participant, Reservation, Trip } from "../types/domain";
import { LocalTripRepository } from "./LocalTripRepository";

// Database rows are mapped at this boundary before entering the typed domain model.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const synced = (row: Row) => ({
  id: row.id as string,
  clientId: (row.client_id || row.id) as string,
  createdAt: (row.created_at || new Date().toISOString()) as string,
  updatedAt: (row.updated_at || row.created_at || new Date().toISOString()) as string,
  deletedAt: row.deleted_at || undefined,
  version: Number(row.version || 1),
  syncStatus: "synced" as const,
  lastSyncedAt: new Date().toISOString(),
});

const timeInZone = (iso: string, timezone: string) => new Intl.DateTimeFormat("en-GB", {
  timeZone: timezone,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
}).format(new Date(iso));

const wallClockFromIso = (iso: string, timezone: string) => {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
};

async function selectRows(table: string, tripIds: string[]) {
  const { data, error } = await supabase.from(table).select("*").in("trip_id", tripIds);
  if (error) throw error;
  return (data ?? []) as Row[];
}

const reservationRow = (reservation: Reservation) => ({
  id: reservation.id, client_id: reservation.clientId, trip_id: reservation.tripId,
  destination_id: reservation.destinationId ?? null, type: reservation.type, title: reservation.title,
  provider: reservation.provider, provider_name: reservation.providerName, provider_reference: reservation.providerReference,
  confirmation_code: reservation.confirmationCode ?? null, external_url: reservation.externalUrl ?? null,
  start_at: reservation.startAt, end_at: reservation.endAt || null, city: reservation.city,
  local_start_at: reservation.startAt, local_end_at: reservation.endAt || null,
  origin_city: reservation.originCity ?? null, destination_city: reservation.destinationCity ?? null,
  origin_place: reservation.originPlace ?? null, destination_place: reservation.destinationPlace ?? null,
  service_number: reservation.serviceNumber ?? null, address: reservation.address ?? null,
  traveler_details: reservation.travelerConfirmations ?? [], status: reservation.status,
  payment_status: reservation.paymentStatus, paid_by: reservation.paidBy ?? null,
  pay_on_arrival: reservation.payOnArrival ?? false, total_amount: reservation.totalAmount, currency: reservation.currency,
  original_total_amount: reservation.originalTotalAmount ?? null, original_currency: reservation.originalCurrency ?? null,
  exchange_rate: reservation.exchangeRate ?? null, next_action: reservation.nextAction ?? null,
  available_offline: reservation.availableOffline, import_source: reservation.importSource,
  updated_at: new Date().toISOString(), deleted_at: reservation.deletedAt ?? null, version: reservation.version,
});

const activityRow = (activity: Activity) => ({
  id: activity.id, client_id: activity.clientId, itinerary_day_id: activity.dayId,
  reservation_id: activity.reservationId ?? null, title: activity.title, description: activity.description ?? null,
  location: activity.location, category: activity.category, status: activity.status,
  updated_at: new Date().toISOString(), deleted_at: activity.deletedAt ?? null, version: activity.version,
});

const expenseRow = (expense: Expense) => ({
  id: expense.id, client_id: expense.clientId, trip_id: expense.tripId, reservation_id: expense.reservationId ?? null,
  description: expense.description, category: expense.category, category_label: expense.categoryLabel ?? null,
  original_amount: expense.originalAmount, original_currency: expense.originalCurrency, exchange_rate: expense.exchangeRate,
  converted_amount: expense.convertedAmount, paid_by: expense.paidBy, expense_date: expense.date,
  status: expense.status ?? "active", updated_at: new Date().toISOString(), deleted_at: expense.deletedAt ?? null,
  version: expense.version,
});

const tripRow = (trip: Trip, ownerId?: string) => ({
  id: trip.id, client_id: trip.clientId, ...(ownerId ? { owner_id: ownerId } : {}), name: trip.name,
  description: trip.description, cover_path: trip.coverUrl || null, start_date: trip.startDate || null,
  end_date: trip.endDate || null, base_currency: trip.baseCurrency, timezone: trip.timezone,
  status: trip.status, updated_at: new Date().toISOString(), deleted_at: trip.deletedAt ?? null, version: trip.version,
});

const wallClockToIso = (value: string, timezone: string) => new Date(wallClockToInstant(value, timezone)).toISOString();

export class SupabaseTripRepository extends LocalTripRepository {
  private async persistDestinations(trip: Trip) {
    const { data: remote, error: readError } = await supabase.from("destinations").select("id").eq("trip_id", trip.id).is("deleted_at", null);
    if (readError) throw readError;
    const currentIds = new Set(trip.destinations.map((destination) => destination.id));
    const removedIds = (remote ?? []).map((row) => row.id).filter((id) => !currentIds.has(id));
    if (removedIds.length) {
      const { error } = await supabase.from("destinations").update({ deleted_at: new Date().toISOString() }).in("id", removedIds);
      if (error) throw error;
    }
    if (trip.destinations.length) {
      const { error } = await supabase.from("destinations").upsert(trip.destinations.map((destination, position) => ({
        id: destination.id, client_id: destination.id, trip_id: trip.id, city: destination.city,
        country: destination.country, arrival_date: destination.arrivalDate || null,
        departure_date: destination.departureDate || null, address: destination.address ?? null,
        image_path: destination.imageUrl || null, position, updated_at: new Date().toISOString(), deleted_at: null,
      })));
      if (error) throw error;
    }
  }

  private async replaceLinks(table: "reservation_participants" | "activity_participants", key: "reservation_id" | "activity_id", id: string, participantIds: string[]) {
    const { error: deleteError } = await supabase.from(table).delete().eq(key, id);
    if (deleteError) throw deleteError;
    if (!participantIds.length) return;
    const { error } = await supabase.from(table).insert(participantIds.map((travelerId) => ({ [key]: id, traveler_id: travelerId })));
    if (error) throw error;
  }

  private async persistReservation(reservation: Reservation) {
    const localTrip = await db.trips.get(reservation.tripId);
    const timezone = localTrip?.timezone ?? "America/Argentina/Buenos_Aires";
    const row = { ...reservationRow(reservation), timezone, start_at: wallClockToIso(reservation.startAt, timezone), end_at: reservation.endAt ? wallClockToIso(reservation.endAt, timezone) : null };
    const { error } = await supabase.from("reservations").upsert(row);
    if (error) throw error;
    await this.replaceLinks("reservation_participants", "reservation_id", reservation.id, reservation.participantIds);
  }

  private async persistActivity(activity: Activity) {
    const { data: day, error: dayError } = await supabase.from("itinerary_days").select("trip_id, day").eq("id", activity.dayId).single();
    if (dayError) throw dayError;
    const localTrip = await db.trips.get(day.trip_id);
    const timezone = localTrip?.timezone ?? "America/Argentina/Buenos_Aires";
    const localStartAt = `${day.day}T${activity.startTime}`;
    const localEndAt = activity.endTime ? `${day.day}T${activity.endTime}` : null;
    const row = { ...activityRow(activity), trip_id: day.trip_id, local_start_at: localStartAt, local_end_at: localEndAt, start_at: wallClockToIso(localStartAt, timezone), end_at: localEndAt ? wallClockToIso(localEndAt, timezone) : null };
    const { error } = await supabase.from("activities").upsert(row);
    if (error) throw error;
    await this.replaceLinks("activity_participants", "activity_id", activity.id, activity.participantIds);
  }

  private async persistExpense(expense: Expense) {
    const { error } = await supabase.from("expenses").upsert(expenseRow(expense));
    if (error) throw error;
    const { error: deleteError } = await supabase.from("expense_splits").delete().eq("expense_id", expense.id);
    if (deleteError) throw deleteError;
    if (expense.splits.length) {
      const { error: splitError } = await supabase.from("expense_splits").insert(expense.splits.map((split) => ({ expense_id: expense.id, traveler_id: split.participantId, amount: split.amount })));
      if (splitError) throw splitError;
    }
  }

  private async flushPending() {
    if (!navigator.onLine) return;
    const pending = await db.syncQueue.where("status").equals("pending").toArray();
    for (const item of pending) {
      try {
        if (item.action === "delete") {
          const table = item.entityType === "reservation" ? "reservations" : item.entityType === "activity" ? "activities" : item.entityType === "expense" ? "expenses" : "trips";
          const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", item.localId);
          if (error) throw error;
        } else if (item.entityType === "reservation") await this.persistReservation(item.payload as Reservation);
        else if (item.entityType === "activity") await this.persistActivity(item.payload as Activity);
        else if (item.entityType === "expense") await this.persistExpense(item.payload as Expense);
        else {
          const trip = item.payload as Trip;
          const { data: auth } = await supabase.auth.getUser();
          const { error } = await supabase.from("trips").upsert(tripRow(trip, item.action === "create" ? auth.user?.id : undefined));
          if (error) throw error;
          await this.persistDestinations(trip);
        }
        if (item.entityType === "reservation") await db.reservations.update(item.localId, { syncStatus: "synced", lastSyncedAt: new Date().toISOString() });
        else if (item.entityType === "activity") await db.activities.update(item.localId, { syncStatus: "synced", lastSyncedAt: new Date().toISOString() });
        else if (item.entityType === "expense") await db.expenses.update(item.localId, { syncStatus: "synced", lastSyncedAt: new Date().toISOString() });
        else await db.trips.update(item.localId, { syncStatus: "synced", lastSyncedAt: new Date().toISOString() });
        await db.syncQueue.delete(item.id);
      } catch (error) {
        console.error("No se pudo sincronizar el cambio pendiente", error);
        await db.syncQueue.update(item.id, {
          attempts: item.attempts + 1,
          lastError: error instanceof Error ? error.message : "Error de sincronización",
          nextAttemptAt: new Date(Date.now() + 10_000).toISOString(),
        });
      }
    }
  }

  private async fetchRemote(): Promise<Trip[]> {
    const { data: tripData, error: tripError } = await supabase.from("trips").select("*").is("deleted_at", null).order("start_date");
    if (tripError) throw tripError;
    const tripRows = (tripData ?? []) as Row[];
    const tripIds = tripRows.map((row) => row.id as string);
    if (!tripIds.length) return [];

    const [destinationRows, dayRows, travelerRows, reservationRows, activityRows, expenseRows] = await Promise.all([
      selectRows("destinations", tripIds), selectRows("itinerary_days", tripIds), selectRows("travelers", tripIds),
      selectRows("reservations", tripIds), selectRows("activities", tripIds), selectRows("expenses", tripIds),
    ]);
    const linkedUserIds = travelerRows.map((row) => row.linked_user_id as string | undefined).filter((id): id is string => Boolean(id));
    const { data: profileRows, error: profileError } = linkedUserIds.length
      ? await supabase.from("profiles").select("id,avatar_path").in("id", linkedUserIds)
      : { data: [], error: null };
    if (profileError) throw profileError;
    const avatarsByUser = new Map((profileRows ?? []).map((profile) => [profile.id, profile.avatar_path as string | null]));
    const reservationIds = reservationRows.map((row) => row.id as string);
    const activityIds = activityRows.map((row) => row.id as string);
    const expenseIds = expenseRows.map((row) => row.id as string);
    const [{ data: reservationParticipantRows }, { data: activityParticipantRows }, { data: splitRows }] = await Promise.all([
      reservationIds.length ? supabase.from("reservation_participants").select("*").in("reservation_id", reservationIds) : Promise.resolve({ data: [] }),
      activityIds.length ? supabase.from("activity_participants").select("*").in("activity_id", activityIds) : Promise.resolve({ data: [] }),
      expenseIds.length ? supabase.from("expense_splits").select("*").in("expense_id", expenseIds) : Promise.resolve({ data: [] }),
    ]);

    const destinations: Destination[] = destinationRows.filter((row) => !row.deleted_at).map((row) => ({
      id: row.id, city: row.city, country: row.country, arrivalDate: row.arrival_date || "", departureDate: row.departure_date || "",
      imageUrl: row.image_path || "", address: row.address || undefined,
    }));
    const participants: Participant[] = travelerRows.filter((row) => !row.deleted_at).map((row) => ({
      id: row.id, name: row.name, email: row.email || undefined, initials: row.initials || "", color: row.color || "#8EDCC5",
      avatarPath: row.linked_user_id ? avatarsByUser.get(row.linked_user_id) || undefined : undefined,
      role: row.role, status: row.status, joinedAt: row.joined_at, removedAt: row.removed_at || undefined,
    }));
    const reservationParticipants = reservationParticipantRows ?? [];
    const activityParticipants = activityParticipantRows ?? [];
    const splits = splitRows ?? [];

    const trips = tripRows.map((tripRow): Trip => {
      const timezone = tripRow.timezone || "America/Argentina/Buenos_Aires";
      const tripDestinationIds = new Set(destinationRows.filter((row) => row.trip_id === tripRow.id && !row.deleted_at).map((row) => row.id));
      const tripDestinations = destinations.filter((destination) => tripDestinationIds.has(destination.id));
      const tripTravelerIds = new Set(travelerRows.filter((row) => row.trip_id === tripRow.id && !row.deleted_at).map((row) => row.id));
      const tripReservations: Reservation[] = reservationRows.filter((row) => row.trip_id === tripRow.id && !row.deleted_at).map((row) => ({
        ...synced(row), tripId: tripRow.id, destinationId: row.destination_id || undefined, type: row.type, title: row.title,
        provider: row.provider || "generic", providerName: row.provider_name || "", providerReference: row.provider_reference || "",
        confirmationCode: row.confirmation_code || undefined, externalUrl: row.external_url || undefined,
        startAt: row.local_start_at?.slice(0, 16) || wallClockFromIso(row.start_at, row.timezone || timezone),
        endAt: row.local_end_at?.slice(0, 16) || (row.end_at ? wallClockFromIso(row.end_at, row.timezone || timezone) : undefined),
        city: row.city || "", originCity: row.origin_city || undefined,
        destinationCity: row.destination_city || undefined, originPlace: row.origin_place || undefined,
        destinationPlace: row.destination_place || undefined, serviceNumber: row.service_number || undefined, address: row.address || undefined,
        travelerConfirmations: row.traveler_details || [], status: row.status, paymentStatus: row.payment_status,
        paidBy: row.paid_by || undefined, payOnArrival: Boolean(row.pay_on_arrival),
        totalAmount: Number(row.total_amount), currency: row.currency, originalTotalAmount: row.original_total_amount == null ? undefined : Number(row.original_total_amount),
        originalCurrency: row.original_currency || undefined, exchangeRate: row.exchange_rate == null ? undefined : Number(row.exchange_rate),
        participantIds: reservationParticipants.filter((link) => link.reservation_id === row.id).map((link) => link.traveler_id),
        nextAction: row.next_action || undefined, availableOffline: row.available_offline, importSource: row.import_source,
      }));
      const activities: Activity[] = activityRows.filter((row) => row.trip_id === tripRow.id && !row.deleted_at).map((row) => ({
        ...synced(row), dayId: row.itinerary_day_id, title: row.title, description: row.description || undefined,
        startTime: row.local_start_at?.slice(11, 16) || timeInZone(row.start_at, timezone),
        endTime: row.local_end_at?.slice(11, 16) || (row.end_at ? timeInZone(row.end_at, timezone) : undefined),
        location: row.location || "", category: row.category, status: row.status,
        participantIds: activityParticipants.filter((link) => link.activity_id === row.id).map((link) => link.traveler_id),
        reservationId: row.reservation_id || undefined,
      }));
      const itinerary: ItineraryDay[] = dayRows.filter((row) => row.trip_id === tripRow.id && !row.deleted_at)
        .sort((a, b) => Number(a.position) - Number(b.position)).map((row) => ({
          id: row.id, date: row.day, city: destinations.find((destination) => destination.id === row.destination_id)?.city || "",
          weatherLabel: "Sin datos", weatherTemperature: "—", activities: activities.filter((activity) => activity.dayId === row.id),
        }));
      const expenses: Expense[] = expenseRows.filter((row) => row.trip_id === tripRow.id && !row.deleted_at).map((row) => ({
        ...synced(row), tripId: tripRow.id, reservationId: row.reservation_id || undefined, description: row.description,
        category: row.category, categoryLabel: row.category_label || undefined, originalAmount: Number(row.original_amount),
        originalCurrency: row.original_currency, exchangeRate: Number(row.exchange_rate), convertedAmount: Number(row.converted_amount),
        paidBy: row.paid_by, date: row.expense_date, status: row.status,
        splits: splits.filter((split) => split.expense_id === row.id).map((split) => ({ participantId: split.traveler_id, amount: Number(split.amount) })),
      }));
      return {
        ...synced(tripRow), name: tripRow.name, description: tripRow.description || "", coverUrl: tripRow.cover_path || "",
        startDate: tripRow.start_date || "", endDate: tripRow.end_date || "", baseCurrency: tripRow.base_currency,
        timezone, status: tripRow.status, participants: participants.filter((participant) => tripTravelerIds.has(participant.id)),
        destinations: tripDestinations, itinerary, reservations: tripReservations, expenses,
        customExpenseCategories: [...new Set(expenses.map((expense) => expense.categoryLabel).filter((value): value is string => Boolean(value)))],
      };
    });

    const normalizedTrips = trips.map((trip) => ({ ...trip, ...(deriveTripDateRange(trip) ?? {}) }));
    await db.transaction("rw", [db.trips, db.activities, db.reservations, db.expenses], async () => {
      await db.trips.bulkPut(normalizedTrips);
      await db.activities.bulkPut(normalizedTrips.flatMap((trip) => trip.itinerary.flatMap((day) => day.activities)));
      await db.reservations.bulkPut(normalizedTrips.flatMap((trip) => trip.reservations));
      await db.expenses.bulkPut(normalizedTrips.flatMap((trip) => trip.expenses));
    });
    return normalizedTrips;
  }

  override async getAll() {
    try {
      await this.flushPending();
      if (await db.syncQueue.where("status").equals("pending").count()) return super.getAll();
      return await this.fetchRemote();
    } catch (error) {
      console.error("No se pudieron descargar los viajes de Supabase", error);
      return super.getAll();
    }
  }

  override async getActive() {
    const trips = await this.getAll();
    return trips.find((trip) => ["confirmed", "in_progress", "planning"].includes(trip.status)) ?? null;
  }

  override async getById(id: string) {
    return (await this.getAll()).find((trip) => trip.id === id) ?? super.getById(id);
  }

  override async deleteReservation(reservation: Reservation) {
    await super.deleteReservationPermanently(reservation);
    await this.flushPending();
  }

  override async deleteActivity(activity: Activity) {
    await super.deleteActivityPermanently(activity);
    await this.flushPending();
  }

  override async addReservation(reservation: Reservation) {
    await super.addReservation(reservation); await this.flushPending();
  }
  override async updateReservation(reservation: Reservation) {
    await super.updateReservation(reservation); await this.flushPending();
  }
  override async addActivity(activity: Activity) {
    await super.addActivity(activity); await this.flushPending();
  }
  override async updateActivity(activity: Activity) {
    await super.updateActivity(activity); await this.flushPending();
  }
  override async addExpense(expense: Expense) {
    await super.addExpense(expense); await this.flushPending();
  }
  override async updateExpense(expense: Expense) {
    await super.updateExpense(expense); await this.flushPending();
  }

  override async addTrip(trip: Trip) {
    await super.addTrip(trip); await this.flushPending();
  }

  override async updateTrip(trip: Trip) {
    await super.updateTrip(trip); await this.flushPending();
  }

  override async getPendingCount() {
    await this.flushPending();
    return super.getPendingCount();
  }
}
