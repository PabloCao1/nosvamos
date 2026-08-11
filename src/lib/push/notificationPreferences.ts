export interface NotificationPreferences {
  groupChanges: boolean;
  flights: boolean;
  lodging: boolean;
  transport: boolean;
  activities: boolean;
  expenses: boolean;
  dayBefore: boolean;
  shortlyBefore: boolean;
}

export const defaultNotificationPreferences: NotificationPreferences = {
  groupChanges: true,
  flights: true,
  lodging: true,
  transport: true,
  activities: true,
  expenses: true,
  dayBefore: true,
  shortlyBefore: true,
};

const storageKey = "brujula:notification-preferences:v1";

export function getNotificationPreferences(): NotificationPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as Partial<NotificationPreferences>;
    return { ...defaultNotificationPreferences, ...saved };
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
