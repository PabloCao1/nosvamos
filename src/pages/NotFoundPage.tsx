import { ButtonLink } from "../components/ui/Button";
import { EmptyState } from "../components/ui/PageState";

export function NotFoundPage() {
  return (
    <>
      <EmptyState title="Esta parada no existe" message="Volvamos al itinerario conocido." />
      <ButtonLink className="center-button" variant="primary" to="/">Ir al inicio</ButtonLink>
    </>
  );
}
