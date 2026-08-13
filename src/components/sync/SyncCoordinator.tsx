import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { tripRepository } from "../../repositories";

/** Keeps the offline queue moving when a PWA returns from the background. */
export function SyncCoordinator() {
  const queryClient = useQueryClient();
  const refreshing = useRef(false);

  useEffect(() => {
    const refresh = async () => {
      if (!navigator.onLine || refreshing.current) return;
      refreshing.current = true;
      try {
        const changed = await tripRepository.syncPending();
        if (changed) await queryClient.invalidateQueries({ queryKey: ["trips"] });
        await queryClient.invalidateQueries({ queryKey: ["sync"] });
      } finally {
        refreshing.current = false;
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15_000);
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [queryClient]);

  return null;
}
