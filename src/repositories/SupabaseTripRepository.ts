import { db } from "../lib/indexed-db/database";
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

async function selectRows(table: string, tripIds: string[]) {
  const { data, error } = await supabase.from(table).select("*").in("trip_id", tripIds);
  if (error) throw error;
  return (data ?? []) as Row[];
}

export class SupabaseTripRepository extends LocalTripRepository {
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
        confirmationCode: row.confirmation_code || undefined, externalUrl: row.external_url || undefined, startAt: row.start_at,
        endAt: row.end_at || undefined, city: row.city || "", originCity: row.origin_city || undefined,
        destinationCity: row.destination_city || undefined, originPlace: row.origin_place || undefined,
        destinationPlace: row.destination_place || undefined, serviceNumber: row.service_number || undefined, address: row.address || undefined,
        travelerConfirmations: row.traveler_details || [], status: row.status, paymentStatus: row.payment_status,
        totalAmount: Number(row.total_amount), currency: row.currency, originalTotalAmount: row.original_total_amount == null ? undefined : Number(row.original_total_amount),
        originalCurrency: row.original_currency || undefined, exchangeRate: row.exchange_rate == null ? undefined : Number(row.exchange_rate),
        participantIds: reservationParticipants.filter((link) => link.reservation_id === row.id).map((link) => link.traveler_id),
        nextAction: row.next_action || undefined, availableOffline: row.available_offline, importSource: row.import_source,
      }));
      const activities: Activity[] = activityRows.filter((row) => row.trip_id === tripRow.id && !row.deleted_at).map((row) => ({
        ...synced(row), dayId: row.itinerary_day_id, title: row.title, description: row.description || undefined,
        startTime: timeInZone(row.start_at, timezone), endTime: row.end_at ? timeInZone(row.end_at, timezone) : undefined,
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

    await db.transaction("rw", [db.trips, db.activities, db.reservations, db.expenses], async () => {
      await db.trips.bulkPut(trips);
      await db.activities.bulkPut(trips.flatMap((trip) => trip.itinerary.flatMap((day) => day.activities)));
      await db.reservations.bulkPut(trips.flatMap((trip) => trip.reservations));
      await db.expenses.bulkPut(trips.flatMap((trip) => trip.expenses));
    });
    return trips;
  }

  override async getAll() {
    try { return await this.fetchRemote(); } catch (error) {
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
}
