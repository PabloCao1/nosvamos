import {
  getNotificationPreferences,
  getPushDeviceId,
  type NotificationPreferences,
} from "./notificationPreferences";
import { supabase } from "../supabase";

export type PushAvailability =
  | "ready"
  | "not-installed"
  | "unsupported"
  | "blocked"
  | "not-configured";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  ("standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

const decodeVapidKey = (value: string) => {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
};

export function getPushAvailability(): PushAvailability {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (!isStandalone()) return "not-installed";
  if (Notification.permission === "denied") return "blocked";
  if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) {
    return "not-configured";
  }
  return "ready";
}

export async function getCurrentPushSubscription() {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  const expectedKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  const currentKey = subscription?.options.applicationServerKey;
  if (subscription && expectedKey && currentKey) {
    const expected = decodeVapidKey(expectedKey);
    const current = new Uint8Array(currentKey);
    const matches = expected.length === current.length && expected.every((byte, index) => byte === current[index]);
    if (!matches) {
      await subscription.unsubscribe();
      return null;
    }
  }
  return subscription;
}

export async function registerPushSubscription(subscription: PushSubscription) {
  const { error } = await supabase.functions.invoke("push", {
    body: {
      action: "subscribe",
      subscription: subscription.toJSON(),
      deviceId: getPushDeviceId(),
      userAgent: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferences: getNotificationPreferences(),
    },
  });
  if (error) throw error;
}

export async function enablePushNotifications() {
  if (getPushAvailability() !== "ready") {
    throw new Error("Las notificaciones push no están disponibles en este dispositivo.");
  }
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error("Falta configurar el servicio de notificaciones.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("No se concedió el permiso de notificaciones.");

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidKey(vapidPublicKey),
    }));

  try {
    await registerPushSubscription(subscription);
  } catch {
    if (!existing) await subscription.unsubscribe();
    throw new Error("No se pudo registrar este iPhone para recibir avisos.");
  }

  return subscription;
}

export async function disablePushNotifications() {
  const subscription = await getCurrentPushSubscription();
  if (!subscription) return;

  await supabase.functions.invoke("push", {
    body: { action: "unsubscribe", endpoint: subscription.endpoint, deviceId: getPushDeviceId() },
  });
  await subscription.unsubscribe();
}

export async function updatePushPreferences(preferences: NotificationPreferences) {
  const subscription = await getCurrentPushSubscription();
  if (!subscription) return;
  await supabase.functions.invoke("push", {
    body: {
      action: "preferences",
      endpoint: subscription.endpoint,
      deviceId: getPushDeviceId(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferences,
    },
  });
}

export async function sendTestPushNotification() {
  const subscription = await getCurrentPushSubscription();
  if (!subscription) return { registered: 0, sent: 0, failures: [] };
  await registerPushSubscription(subscription);
  const { data, error } = await supabase.functions.invoke<{
    registered: number;
    sent: number;
    failures: { statusCode?: number; message: string }[];
  }>("push", { body: { action: "test" } });
  if (error) throw error;
  return data ?? { registered: 0, sent: 0, failures: [] };
}
