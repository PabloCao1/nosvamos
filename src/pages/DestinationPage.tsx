import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Icon } from "../components/ui/Icon";
import { Button, DetailIndicator } from "../components/ui/Button";
import { ErrorState, LoadingState } from "../components/ui/PageState";
import { useTrip } from "../hooks/useTrips";
import { formatUsd } from "../lib/currency/exchangeRates";
import { formatShortDate, formatTripDateTime } from "../lib/dates/tripDateTime";
import { tripRepository } from "../repositories";

const date = (value: string) => formatShortDate(value);

export function DestinationPage() {
  const { tripId, destinationId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { data: trip, isLoading, isError, refetch } = useTrip(tripId);
  const deletion = useMutation({
    mutationFn: async () => {
      if (!trip || !destinationId) throw new Error("Destino no encontrado");
      const selected = trip.destinations.find((item) => item.id === destinationId);
      if (!selected) throw new Error("Destino no encontrado");
      const sameCity = (value?: string) => Boolean(value && value.localeCompare(selected.city, "es", { sensitivity: "base" }) === 0);
      const hasReservations = trip.reservations.some((item) => !["flight", "train", "bus", "ferry", "car"].includes(item.type) && item.status !== "cancelled" && sameCity(item.city));
      const hasActivities = trip.itinerary.some((day) => sameCity(day.city) && day.activities.length > 0);
      if (hasReservations || hasActivities) throw new Error("El destino todavía tiene contenido asociado");
      await tripRepository.updateTrip({ ...trip, destinations: trip.destinations.filter((item) => item.id !== destinationId) });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      navigate(`/viaje/${tripId}`);
    },
  });

  if (isLoading) return <LoadingState />;
  if (isError || !trip) return <ErrorState onRetry={() => void refetch()} />;

  const destination = trip.destinations.find((item) => item.id === destinationId);
  if (!destination) return <ErrorState onRetry={() => void refetch()} />;

  const stays = trip.reservations
    .filter((item) =>
      ["hotel", "apartment"].includes(item.type) &&
      item.status !== "cancelled" &&
      item.city.localeCompare(destination.city, "es", { sensitivity: "base" }) === 0,
    )
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const departureDate = destination.departureDate;
  const cityMatches = (value?: string) =>
    Boolean(value && value.localeCompare(destination.city, "es", { sensitivity: "base" }) === 0);
  const transports: typeof trip.reservations = [];
  const activities = trip.itinerary
    .filter((day) => cityMatches(day.city))
    .flatMap((day) => day.activities.map((activity) => ({ ...activity, date: day.date })))
    .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  const relatedReservations = trip.reservations.filter((item) =>
    !["flight", "train", "bus", "ferry", "car"].includes(item.type) &&
    item.status !== "cancelled" &&
    cityMatches(item.city),
  );
  const canDeleteDestination = relatedReservations.length === 0 && activities.length === 0;

  return (
    <>
      <PageHeader eyebrow={trip.name} title={destination.city} />
      <section className="destination-period-card">
        <div><span>Llegada</span><strong>{date(destination.arrivalDate)}</strong></div>
        <Icon name="chevronRight" size={20} />
        <div><span>Salida</span><strong>{date(departureDate)}</strong></div>
      </section>

      {transports.length > 0 && (
        <section className="section-block destination-events">
          <div className="section-heading"><div><h2>Llegadas y salidas</h2></div><span>{transports.length}</span></div>
          <div className="destination-event-list">
            {transports.map((transport) => {
              const arriving = cityMatches(transport.destinationCity);
              const leaving = cityMatches(transport.originCity);
              const direction = arriving
                ? `Llega desde ${transport.originCity ?? "origen"}`
                : leaving
                  ? `Sale hacia ${transport.destinationCity ?? "próximo destino"}`
                  : "Viaje relacionado";
              return (
                <Link
                  className="destination-event transport-event"
                  key={transport.id}
                  to={`/viaje/${trip.id}/evento/reservation/${transport.id}`}
                  aria-label={`Ver detalle de ${transport.title}`}
                >
                  <span><Icon name={transport.type === "flight" ? "airplane" : transport.type === "train" ? "train" : transport.type === "car" ? "car" : "ticket"} size={21} /></span>
                  <div>
                    <p>{direction}</p>
                    <h3>{transport.title}</h3>
                    <small>{date(transport.startAt)}{transport.serviceNumber ? ` · ${transport.serviceNumber}` : ""}</small>
                    {(transport.originPlace || transport.destinationPlace) && (
                      <small>{transport.originPlace ?? "—"} → {transport.destinationPlace ?? "—"}</small>
                    )}
                    {transport.travelerConfirmations?.map((confirmation) => {
                      const traveler = trip.participants.find((person) => person.id === confirmation.participantId);
                      return <small key={confirmation.participantId}>{traveler?.name ?? "Viajero"} · {confirmation.confirmationCode}</small>;
                    })}
                  </div>
                  <div className="destination-event-side">
                    <strong>{formatTripDateTime(transport.startAt, trip.timezone, { hour: "2-digit", minute: "2-digit" })}</strong>
                    <DetailIndicator />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {activities.length > 0 && (
        <section className="section-block destination-events">
          <div className="section-heading"><div><h2>Excursiones y actividades</h2></div><span>{activities.length}</span></div>
          <div className="destination-event-list">
            {activities.map((activity) => (
              <Link className="destination-event activity-event" key={activity.id} to={`/viaje/${trip.id}/evento/activity/${activity.id}`}>
                <span><Icon name={activity.category === "food" ? "receipt" : activity.category === "transport" ? "airplane" : "calendar"} size={21} /></span>
                <div>
                  <p>{date(activity.date)}</p>
                  <h3>{activity.title}</h3>
                  <small>{activity.location}</small>
                </div>
                <div className="destination-event-side"><strong>{activity.startTime}</strong><DetailIndicator /></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section-block">
        <div className="section-heading"><div><h2>Estadías</h2></div><span>{stays.length}</span></div>
        <div className="card-stack">
          {stays.map((stay) => {
            const start = new Date(stay.startAt);
            const end = stay.endAt ? new Date(stay.endAt) : undefined;
            const nights = end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000)) : null;
            return (
              <Link className="stay-card stay-card-link" key={stay.id} to={`/viaje/${trip.id}/evento/reservation/${stay.id}`}>
                <span><Icon name="bed" size={22} /></span>
                <div>
                  <p>{stay.providerName}</p>
                  <h3>{stay.title}</h3>
                  <small>{date(stay.startAt)}{stay.endAt ? ` – ${date(stay.endAt)}` : ""}</small>
                  {stay.address && <small className="stay-address">{stay.address}</small>}
                  <div className="stay-reference">
                    <span>Código</span>
                    <strong>{stay.confirmationCode ?? stay.providerReference}</strong>
                  </div>
                </div>
                <div className="stay-side">
                  <strong>{formatUsd(stay.totalAmount)}</strong>
                  {nights !== null && <small>{nights} {nights === 1 ? "noche" : "noches"}</small>}
                </div>
              </Link>
            );
          })}
          {!stays.length && <p className="no-results">Todavía no hay alojamientos cargados en este destino.</p>}
        </div>
      </section>

      {canDeleteDestination && <section className="section-block">
        <Button variant="danger" icon="trash" fullWidth onClick={() => setConfirmingDelete(true)}>Eliminar destino</Button>
      </section>}
      {confirmingDelete && <div className="confirm-layer" role="presentation">
        <button type="button" className="confirm-backdrop" onClick={() => setConfirmingDelete(false)} aria-label="Cancelar eliminación" />
        <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-destination-title">
          <div className="confirm-icon">!</div>
          <h2 id="delete-destination-title">¿Eliminar {destination.city}?</h2>
          <p>Se quitará del itinerario. Las reservas y actividades asociadas no se eliminarán.</p>
          {deletion.error && <p className="form-error">No pudimos eliminar el destino. Probá nuevamente.</p>}
          <div className="confirm-actions">
            <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>Cancelar</Button>
            <Button variant="danger" icon="trash" disabled={deletion.isPending} onClick={() => deletion.mutate()}>{deletion.isPending ? "Eliminando…" : "Eliminar"}</Button>
          </div>
        </section>
      </div>}
    </>
  );
}
