import {
  getNotificationPreferences,
  getPushDeviceId,
  type NotificationPreferences,
} from "./notificationPreferences";

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
  if (!import.meta.env.VITE_VAPID_PUBLIC_KEY || !import.meta.env.VITE_PUSH_API_URL) {
    return "not-configured";
  }
  return "ready";
}

export async function getCurrentPushSubscription() {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function enablePushNotifications() {
  if (getPushAvailability() !== "ready") {
    throw new Error("Las notificaciones push no están disponibles en este dispositivo.");
  }
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  const pushApiUrl = import.meta.env.VITE_PUSH_API_URL;
  if (!vapidPublicKey || !pushApiUrl) {
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

  const response = await fetch(`${pushApiUrl}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      deviceId: getPushDeviceId(),
      userAgent: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferences: getNotificationPreferences(),
    }),
  });

  if (!response.ok) {
    if (!existing) await subscription.unsubscribe();
    throw new Error("No se pudo registrar este iPhone para recibir avisos.");
  }

  return subscription;
}

export async function disablePushNotifications() {
  const subscription = await getCurrentPushSubscription();
  if (!subscription) return;

  await fetch(`${import.meta.env.VITE_PUSH_API_URL}/subscriptions`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint, deviceId: getPushDeviceId() }),
  });
  await subscription.unsubscribe();
}

export async function updatePushPreferences(preferences: NotificationPreferences) {
  const subscription = await getCurrentPushSubscription();
  const pushApiUrl = import.meta.env.VITE_PUSH_API_URL;
  if (!subscription || !pushApiUrl) return;
  await fetch(`${pushApiUrl}/subscriptions/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      deviceId: getPushDeviceId(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferences,
    }),
  });
}
