import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { tripRepository } from "../../repositories";
import { Icon, type IconName } from "./Icon";

type FeedbackState = {
  phase: "saving" | "success" | "error";
  icon: IconName;
  reason?: string;
};

type SaveFeedbackContextValue = {
  runSave: <T>(operation: () => Promise<T>, icon?: IconName) => Promise<T>;
};

const SaveFeedbackContext = createContext<SaveFeedbackContextValue | null>(null);
const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function errorMessage(reason: unknown) {
  if (!navigator.onLine) return "Sin conexión";
  if (reason instanceof Error && reason.message) return reason.message;
  if (typeof reason === "object" && reason && "message" in reason && typeof reason.message === "string") return reason.message;
  return "No pudimos confirmar el guardado";
}

export function SaveFeedbackProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const value = useMemo<SaveFeedbackContextValue>(() => ({
    runSave: async <T,>(operation: () => Promise<T>, icon: IconName = "save") => {
      const startedAt = Date.now();
      setFeedback({ phase: "saving", icon });
      try {
        const queueBefore = await tripRepository.getSyncQueue();
        const previousErrors = new Set(queueBefore.filter((item) => item.lastError).map((item) => item.id));
        const result = await operation();
        await wait(Math.max(0, 450 - (Date.now() - startedAt)));
        const queue = await tripRepository.getSyncQueue();
        const pendingError = queue.find((item) => item.lastError && !previousErrors.has(item.id));
        if (!navigator.onLine || pendingError) {
          setFeedback({
            phase: "error",
            icon,
            reason: !navigator.onLine ? "Sin conexión" : errorMessage(pendingError?.lastError),
          });
          await wait(1900);
        } else {
          setFeedback({ phase: "success", icon });
          await wait(850);
        }
        return result;
      } catch (reason) {
        setFeedback({ phase: "error", icon, reason: errorMessage(reason) });
        await wait(1900);
        throw reason;
      } finally {
        setFeedback(null);
      }
    },
  }), []);

  return <SaveFeedbackContext.Provider value={value}>
    {children}
    {feedback && <div className={`save-feedback-layer save-feedback-${feedback.phase}`} role="status" aria-live="assertive">
      <div className="save-feedback-content">
        <div className="save-feedback-visual">
          {feedback.phase === "saving" ? <>
            <span className="save-feedback-spinner" />
            <Icon name={feedback.icon} size={38} />
          </> : <span className="save-feedback-result" aria-hidden="true" />}
        </div>
        <strong>{feedback.phase === "saving" ? "Guardando" : feedback.phase === "success" ? "Guardado" : "No se pudo sincronizar"}</strong>
        {feedback.phase === "error" && <>
          <p>{feedback.reason}</p>
          <small>Quedó guardado en este dispositivo.<br />Volveremos a intentarlo automáticamente.</small>
        </>}
      </div>
    </div>}
  </SaveFeedbackContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSaveFeedback() {
  const context = useContext(SaveFeedbackContext);
  if (!context) throw new Error("useSaveFeedback debe usarse dentro de SaveFeedbackProvider");
  return context;
}
