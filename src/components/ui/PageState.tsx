import { Icon } from "./Icon";
import { Button } from "./Button";

export function LoadingState() {
  return (
    <div className="page-state" aria-live="polite">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card short" />
      <span className="sr-only">Cargando viaje</span>
    </div>
  );
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon name="suitcase" size={28} /></span>
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <h2>No pudimos abrir el viaje</h2>
      <p>Revisá tu conexión o volvé a intentarlo.</p>
      <Button variant="primary" onClick={onRetry}>Reintentar</Button>
    </div>
  );
}
