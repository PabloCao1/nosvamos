import { useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Icon } from "../components/ui/Icon";
import { ErrorState, LoadingState } from "../components/ui/PageState";
import { useTrip } from "../hooks/useTrips";

export function DocumentsPage() {
  const { tripId } = useParams();
  const { data: trip, isLoading, isError, refetch } = useTrip(tripId);

  if (isLoading) return <LoadingState />;
  if (isError || !trip) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader eyebrow={trip.name} title="Documentos" />
      <section className="privacy-note">
        <Icon name="lock" size={21} />
        <div>
          <strong>Disponibles sin conexión</strong>
          <p>Pasaportes, seguros y comprobantes del viaje se guardarán cifrados en este espacio.</p>
        </div>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">Archivos del grupo</p><h2>Documentos</h2></div>
          <span>0</span>
        </div>
        <div className="empty-state compact">
          <span className="empty-icon"><Icon name="receipt" size={28} /></span>
          <h2>Todavía no hay documentos</h2>
          <p>Agregá seguros, tickets o identificaciones importantes para el viaje.</p>
        </div>
      </section>
    </>
  );
}
