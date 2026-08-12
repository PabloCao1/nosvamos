import { Icon } from "./Icon";
import { Button } from "./Button";

export function LoadingState() {
  return (
    <div className="page-state page-skeleton" aria-live="polite" aria-busy="true">
      <div className="page-skeleton-header">
        <div className="skeleton skeleton-back" />
        <div><div className="skeleton skeleton-eyebrow" /><div className="skeleton skeleton-title" /></div>
      </div>
      <div className="skeleton skeleton-hero" />
      <div className="page-skeleton-section">
        <div className="skeleton skeleton-section-title" />
        {[0, 1, 2].map((item) => <div className="skeleton-row" key={item}>
          <div className="skeleton skeleton-avatar" />
          <div><div className="skeleton skeleton-line wide" /><div className="skeleton skeleton-line" /></div>
        </div>)}
      </div>
      <span className="sr-only">Cargando contenido</span>
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
