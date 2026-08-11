import { useEffect, useState } from "react";
import {
  disablePushNotifications,
  enablePushNotifications,
  getCurrentPushSubscription,
  getPushAvailability,
  registerPushSubscription,
  type PushAvailability,
} from "../lib/push/pushNotifications";

export function usePushNotifications() {
  const [availability, setAvailability] = useState<PushAvailability>(() => getPushAvailability());
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    getCurrentPushSubscription()
      .then(async (subscription) => {
        if (!subscription) return setEnabled(false);
        await registerPushSubscription(subscription);
        setEnabled(true);
      })
      .catch((reason) => {
        setEnabled(false);
        setError(reason instanceof Error ? reason.message : "No se pudo registrar este dispositivo.");
      })
      .finally(() => setPending(false));
  }, []);

  const enable = async () => {
    setPending(true);
    setError(undefined);
    try {
      await enablePushNotifications();
      setEnabled(true);
      setAvailability(getPushAvailability());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudieron activar.");
      setAvailability(getPushAvailability());
    } finally {
      setPending(false);
    }
  };

  const disable = async () => {
    setPending(true);
    setError(undefined);
    try {
      await disablePushNotifications();
      setEnabled(false);
    } catch {
      setError("No se pudieron desactivar. Probá nuevamente.");
    } finally {
      setPending(false);
    }
  };

  return { availability, enabled, pending, error, enable, disable };
}
