export interface NotificationPreferences {
  groupChanges: boolean;
  flights: boolean;
  lodging: boolean;
  transport: boolean;
  activities: boolean;
  expenses: boolean;
  dayBefore: boolean;
  shortlyBefore: boolean;
  reminderTimings: Record<ScheduledNotificationCategory, ReminderTimingPreferences>;
  shortlyBeforeHours: Record<ScheduledNotificationCategory, number>;
}

export type ScheduledNotificationCategory = "flights" | "transport" | "lodging" | "activities";
export interface ReminderTimingPreferences { twoDays: boolean; dayBefore: boolean; shortlyBefore: boolean }

const defaultTimings = (): NotificationPreferences["reminderTimings"] => ({
  flights: { twoDays: false, dayBefore: true, shortlyBefore: true },
  transport: { twoDays: false, dayBefore: true, shortlyBefore: true },
  lodging: { twoDays: false, dayBefore: true, shortlyBefore: true },
  activities: { twoDays: false, dayBefore: true, shortlyBefore: true },
});

const defaultShortlyBeforeHours = (): NotificationPreferences["shortlyBeforeHours"] => ({
  flights: 2, transport: 2, lodging: 2, activities: 2,
});

export const defaultNotificationPreferences: NotificationPreferences = {
  groupChanges: true,
  flights: true,
  lodging: true,
  transport: true,
  activities: true,
  expenses: true,
  dayBefore: true,
  shortlyBefore: true,
  reminderTimings: defaultTimings(),
  shortlyBeforeHours: defaultShortlyBeforeHours(),
};

const storageKey = "brujula:notification-preferences:v1";

export function getNotificationPreferences(): NotificationPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as Partial<NotificationPreferences>;
    const timings = defaultTimings();
    for (const category of Object.keys(timings) as ScheduledNotificationCategory[]) {
      timings[category] = {
        ...timings[category],
        dayBefore: saved.dayBefore ?? defaultNotificationPreferences.dayBefore,
        shortlyBefore: saved.shortlyBefore ?? defaultNotificationPreferences.shortlyBefore,
        ...saved.reminderTimings?.[category],
      };
    }
    return {
      ...defaultNotificationPreferences,
      ...saved,
      reminderTimings: timings,
      shortlyBeforeHours: { ...defaultShortlyBeforeHours(), ...saved.shortlyBeforeHours },
    };
  } catch {
    return defaultNotificationPreferences;
  }
}

export function saveNotificationPreferences(preferences: NotificationPreferences) {
  localStorage.setItem(storageKey, JSON.stringify(preferences));
}

export function getPushDeviceId() {
  const key = "brujula:push-device-id:v1";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}
