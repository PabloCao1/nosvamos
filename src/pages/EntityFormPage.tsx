import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ActivityForm,
  ExpenseForm,
  InviteForm,
  ReservationForm,
} from "../components/forms/EntityForms";
import { PageHeader } from "../components/layout/PageHeader";
import { ErrorState, LoadingState } from "../components/ui/PageState";
import { useTrip } from "../hooks/useTrips";
import type { DocumentImportDraft } from "../types/documentImport";

const titles: Record<string, string> = {
  activity: "Nueva actividad",
  expense: "Nuevo gasto",
  reservation: "Nueva reserva",
  lodging: "Nuevo alojamiento",
  transport: "Nuevo traslado",
  car: "Nuevo alquiler de auto",
  excursion: "Nueva excursión",
  invite: "Invitar integrante",
};

export function EntityFormPage() {
  const { tripId, formType, entityId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const importDraft = (location.state as { importDraft?: DocumentImportDraft } | null)?.importDraft;
  const { data: trip, isLoading, isError, refetch } = useTrip(tripId);

  if (isLoading) return <LoadingState />;
  if (isError || !trip || !formType) return <ErrorState onRetry={() => void refetch()} />;

  const activity = entityId
    ? trip.itinerary.flatMap((day) => day.activities).find((item) => item.id === entityId)
    : undefined;
  const expense = entityId ? trip.expenses.find((item) => item.id === entityId) : undefined;
  const reservation = entityId ? trip.reservations.find((item) => item.id === entityId) : undefined;
  const editing = Boolean(entityId);

  if (editing && !activity && !expense && !reservation) {
    return <ErrorState onRetry={() => void refetch()} />;
  }
  if (expense?.status === "cancelled") {
    return <Navigate to={`/viaje/${trip.id}/gasto/${expense.id}`} replace />;
  }
  if (reservation?.status === "cancelled") {
    return <Navigate to={`/viaje/${trip.id}/evento/reservation/${reservation.id}`} replace />;
  }

  const title = editing
    ? formType === "activity" ? "Editar actividad"
      : formType === "expense" ? "Editar gasto"
        : "Editar reserva"
    : titles[formType];
  const close = () => {
    if (typeof window.history.state?.idx === "number" && window.history.state.idx > 0) navigate(-1);
    else navigate(`/viaje/${trip.id}`, { replace: true });
  };
  const formTone = formType === "car" ? "auto" : formType === "transport" ? "transport" : formType === "lodging" ? "lodging" : formType === "excursion" ? "excursion" : formType === "activity" ? "activity" : "neutral";

  return (
    <>
      <PageHeader eyebrow={trip.name} title={title ?? "Formulario"} />
      <section className={`page-editor entity-form-page tone-${formTone}`}>
        {formType === "activity" && <ActivityForm close={close} entity={activity} trip={trip} />}
        {formType === "expense" && <ExpenseForm close={close} entity={expense} trip={trip} importDraft={importDraft} />}
        {formType === "reservation" && <ReservationForm close={close} entity={reservation} trip={trip} importDraft={importDraft} />}
        {formType === "lodging" && <ReservationForm close={close} variant="lodging" trip={trip} importDraft={importDraft} />}
        {formType === "transport" && <ReservationForm close={close} variant="transport" trip={trip} importDraft={importDraft} />}
        {formType === "car" && <ReservationForm close={close} variant="car" trip={trip} importDraft={importDraft} />}
        {formType === "excursion" && <ReservationForm close={close} variant="excursion" trip={trip} importDraft={importDraft} />}
        {formType === "invite" && <InviteForm close={close} trip={trip} />}
      </section>
    </>
  );
}
