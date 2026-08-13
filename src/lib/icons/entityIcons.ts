import type { IconName } from "../../components/ui/Icon";
import type { ActivityCategory, Expense, ReservationType } from "../../types/domain";

export const reservationIcon: Record<ReservationType, IconName> = {
  flight: "airplane",
  train: "train",
  bus: "bus",
  ferry: "ferry",
  hotel: "bed",
  apartment: "bed",
  restaurant: "food",
  activity: "calendar",
  car: "car",
  insurance: "insurance",
  other: "ticket",
};

export type EntityTone = "auto" | "transport" | "lodging" | "excursion" | "activity" | "neutral";

/** Stable visual identity for each kind of trip content. */
export const reservationTone: Record<ReservationType, EntityTone> = {
  flight: "transport",
  train: "transport",
  bus: "transport",
  ferry: "transport",
  hotel: "lodging",
  apartment: "lodging",
  restaurant: "excursion",
  activity: "excursion",
  car: "auto",
  insurance: "neutral",
  other: "neutral",
};

export const activityIcon: Record<ActivityCategory, IconName> = {
  excursion: "ticket",
  visit: "location",
  food: "food",
  transport: "airplane",
  lodging: "bed",
  shopping: "shopping",
  event: "ticket",
  outdoor: "location",
  free_time: "clock",
  other: "calendar",
};

export const expenseIcon: Record<Expense["category"], IconName> = {
  transport: "airplane",
  lodging: "bed",
  food: "food",
  activities: "calendar",
  shopping: "shopping",
  insurance: "insurance",
  other: "receipt",
};
