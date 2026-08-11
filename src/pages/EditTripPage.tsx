import { useNavigate, useParams } from "react-router-dom";
import { TripForm } from "../components/forms/EntityForms";
import { PageHeader } from "../components/layout/PageHeader";
import { ErrorState, LoadingState } from "../components/ui/PageState";
import { useTrip } from "../hooks/useTrips";

export function EditTripPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { data: trip, isLoading, isError, refetch } = useTrip(tripId);

  if (isLoading) return <LoadingState />;
  if (isError || !trip) return <ErrorState onRetry={() => void refetch()} />;

  const close = () => navigate(`/viaje/${trip.id}`, { replace: true });

  return (
    <>
      <PageHeader eyebrow={trip.name} title="Editar viaje" />
      <section className="page-editor trip-page-editor">
        <p className="page-editor-intro">
          Actualizá el nombre, la descripción y las fechas generales del viaje.
        </p>
        <TripForm close={close} entity={trip} />
      </section>
    </>
  );
}
