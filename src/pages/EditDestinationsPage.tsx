import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Icon, type IconName } from "../components/ui/Icon";
import { DetailIndicator } from "../components/ui/Button";
import { ErrorState, LoadingState } from "../components/ui/PageState";
import { useTrip } from "../hooks/useTrips";
import { dateInTripZone, timeInTripZone } from "../lib/dates/tripDateTime";
import { reservationTone, type EntityTone } from "../lib/icons/entityIcons";

interface ItineraryMovement {
  id: string;
  entityId: string;
  kind: "reservation" | "activity";
  date: string;
  time: string;
  title: string;
  detail: string;
  label: string;
  icon: IconName;
  cancelled?: boolean;
  tone: EntityTone;
}

const typeLabels: Record<string, string> = {
  flight: "Vuelo",
  train: "Tren",
  bus: "Bus",
  ferry: "Ferry",
  car: "Auto",
  hotel: "Alojamiento",
  apartment: "Alojamiento",
  restaurant: "Restaurante",
  activity: "Actividad",
  insurance: "Seguro",
  other: "Reserva",
};

const movementIcon = (type: string): IconName =>
  type === "flight" ? "airplane"
    : type === "train" ? "train"
    : ["hotel", "apartment"].includes(type) ? "bed"
      : type === "activity" ? "calendar"
        : "ticket";

const shortDate = (value: string) =>
  new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));

export function EditDestinationsPage() {
  const { tripId } = useParams();
  const { data: trip, isLoading, isError, refetch } = useTrip(tripId);

  if (isLoading) return <LoadingState />;
  if (isError || !trip) return <ErrorState onRetry={() => void refetch()} />;

  const movements: ItineraryMovement[] = [
    ...trip.reservations.map((reservation) => ({
      id: `reservation-${reservation.id}`,
      entityId: reservation.id,
      kind: "reservation" as const,
      date: dateInTripZone(reservation.startAt, trip.timezone),
      time: timeInTripZone(reservation.startAt, trip.timezone),
      title: reservation.title,
      detail: reservation.type === "flight" || reservation.type === "train" || reservation.type === "bus"
        ? `${reservation.originPlace ?? reservation.originCity ?? "Origen"} → ${reservation.destinationPlace ?? reservation.destinationCity ?? "Destino"}`
        : reservation.address ?? reservation.city,
      label: typeLabels[reservation.type] ?? "Reserva",
      icon: movementIcon(reservation.type),
      tone: reservationTone[reservation.type],
      cancelled: reservation.status === "cancelled",
    })),
    ...trip.itinerary.flatMap((day) => day.activities.map((activity) => ({
      id: `activity-${activity.id}`,
      entityId: activity.id,
      kind: "activity" as const,
      date: day.date,
      time: activity.startTime,
      title: activity.title,
      detail: activity.location,
      label: "Actividad",
      icon: "calendar" as IconName,
      tone: "activity" as const,
    }))),
  ].sort((first, second) => `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`));

  const groups = Object.entries(
    movements.reduce<Record<string, ItineraryMovement[]>>((result, movement) => {
      (result[movement.date] ??= []).push(movement);
      return result;
    }, {}),
  );

  const pathFor = (movement: ItineraryMovement) =>
    `/viaje/${trip.id}/evento/${movement.kind}/${movement.entityId}`;

  return (
    <>
      <PageHeader eyebrow={trip.name} title="Editar itinerario" />
      <p className="itinerary-editor-intro">Tocá cualquier movimiento para ver todos sus datos, editarlo o anularlo.</p>

      <div className="itinerary-editor">
        {groups.map(([date, items]) => (
          <section className="itinerary-editor-day" key={date}>
            <div className="itinerary-editor-date">
              <strong>{new Date(`${date}T12:00:00`).getDate()}</strong>
              <span>{shortDate(date).replace(/^\S+\s/, "")}</span>
            </div>
            <div className="itinerary-editor-items">
              {items.map((movement) => (
                <Link
                  className={`itinerary-movement movement-${movement.kind} tone-${movement.tone} ${movement.cancelled ? "cancelled" : ""}`}
                  key={movement.id}
                  to={pathFor(movement)}
                >
                  <span className="itinerary-movement-icon"><Icon name={movement.icon} size={25} /></span>
                  <div>
                    <p>{movement.label}{movement.time !== "00:00" ? ` · ${movement.time}` : ""}</p>
                    <h2>{movement.title}</h2>
                    <small>{movement.cancelled ? "Anulada · " : ""}{movement.detail}</small>
                  </div>
                  <DetailIndicator />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
