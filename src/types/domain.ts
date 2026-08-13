export type SyncStatus =
  | "synced"
  | "pending_create"
  | "pending_update"
  | "pending_delete"
  | "conflict"
  | "failed";

export interface SyncableEntity {
  id: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  version: number;
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
}

export interface Participant {
  id: string;
  name: string;
  email?: string;
  avatarPath?: string;
  initials: string;
  color: string;
  role: "owner" | "admin" | "member" | "viewer";
  status?: "active" | "removed";
  joinedAt?: string;
  removedAt?: string;
}

export interface Destination {
  id: string;
  city: string;
  country: string;
  arrivalDate: string;
  departureDate: string;
  imageUrl: string;
  address?: string;
}

export type ActivityCategory =
  | "visit"
  | "food"
  | "transport"
  | "lodging"
  | "shopping"
  | "event"
  | "free_time"
  | "other";

export interface Activity extends SyncableEntity {
  dayId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location: string;
  category: ActivityCategory;
  status: "planned" | "confirmed" | "done";
  participantIds: string[];
  reservationId?: string;
  totalAmount?: number;
  currency?: string;
  originalTotalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  paymentStatus?: "unpaid" | "paid";
  paidBy?: string;
  payOnArrival?: boolean;
}

export interface ItineraryDay {
  id: string;
  date: string;
  city: string;
  weatherLabel: string;
  weatherTemperature: string;
  activities: Activity[];
}

export type ReservationType =
  | "flight"
  | "train"
  | "bus"
  | "ferry"
  | "hotel"
  | "apartment"
  | "restaurant"
  | "activity"
  | "car"
  | "insurance"
  | "other";

export type TravelProvider =
  | "booking"
  | "airbnb"
  | "air_france"
  | "ryanair"
  | "omio"
  | "expedia"
  | "agoda"
  | "hotels"
  | "iberia"
  | "lufthansa"
  | "easyjet"
  | "flixbus"
  | "trainline"
  | "get_your_guide"
  | "civitatis"
  | "generic";

export interface Reservation extends SyncableEntity {
  tripId: string;
  destinationId?: string;
  type: ReservationType;
  title: string;
  provider: TravelProvider;
  providerName: string;
  providerReference: string;
  confirmationCode?: string;
  externalUrl?: string;
  startAt: string;
  endAt?: string;
  city: string;
  originCity?: string;
  destinationCity?: string;
  originPlace?: string;
  destinationPlace?: string;
  serviceNumber?: string;
  address?: string;
  travelerConfirmations?: {
    participantId: string;
    confirmationCode: string;
    seat?: string;
    baggage?: string;
    passengerName?: string;
  }[];
  paymentMethodLast4?: string;
  status: "draft" | "pending" | "confirmed" | "cancelled" | "completed";
  paymentStatus: "unpaid" | "partially_paid" | "paid" | "refunded";
  paidBy?: string;
  payOnArrival?: boolean;
  totalAmount: number;
  currency: string;
  originalTotalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  participantIds: string[];
  nextAction?: string;
  availableOffline: boolean;
  importSource: "manual" | "url" | "pdf" | "image" | "text" | "email";
}

export interface ExpenseSplit {
  participantId: string;
  amount: number;
}

export interface Expense extends SyncableEntity {
  tripId: string;
  description: string;
  category: "transport" | "lodging" | "food" | "activities" | "shopping" | "insurance" | "other";
  categoryLabel?: string;
  originalAmount: number;
  originalCurrency: string;
  exchangeRate: number;
  convertedAmount: number;
  paidBy: string;
  splits: ExpenseSplit[];
  date: string;
  reservationId?: string;
  status?: "active" | "cancelled";
  receiptImageDataUrl?: string;
}

export interface Trip extends SyncableEntity {
  name: string;
  description: string;
  coverUrl: string;
  startDate: string;
  endDate: string;
  baseCurrency: string;
  timezone: string;
  status: "draft" | "planning" | "confirmed" | "in_progress" | "finished" | "archived";
  participants: Participant[];
  destinations: Destination[];
  itinerary: ItineraryDay[];
  reservations: Reservation[];
  expenses: Expense[];
  customExpenseCategories?: string[];
}

export interface Settlement {
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
}
