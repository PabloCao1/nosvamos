import { useState } from "react";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "../lib/push/notificationPreferences";
import { updatePushPreferences } from "../lib/push/pushNotifications";

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState(getNotificationPreferences);

  const update = (key: keyof NotificationPreferences, value: boolean) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    saveNotificationPreferences(next);
    void updatePushPreferences(next);
  };

  return { preferences, update };
}
