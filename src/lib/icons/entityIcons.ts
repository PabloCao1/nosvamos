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

export const activityIcon: Record<ActivityCategory, IconName> = {
  visit: "location",
  food: "food",
  transport: "airplane",
  lodging: "bed",
  shopping: "shopping",
  event: "ticket",
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
