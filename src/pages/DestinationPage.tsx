import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Icon } from "../components/ui/Icon";
import { DetailIndicator } from "../components/ui/Button";
import { ErrorState, LoadingState } from "../components/ui/PageState";
import { useTrip } from "../hooks/useTrips";
import { formatUsd } from "../lib/currency/exchangeRates";
import { formatTripDateTime } from "../lib/dates/tripDateTime";

const date = (value: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(value.includes("T") ? value : `${value}T12:00:00`));

const transportTypes = new Set(["flight", "train", "bus", "ferry", "car"]);

export function DestinationPage() {
  const { tripId, destinationId } = useParams();
  const { data: trip, isLoading, isError, refetch } = useTrip(tripId);

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
  const departure = trip.reservations
    .filter((item) =>
      transportTypes.has(item.type) &&
      item.startAt.slice(0, 10) >= destination.arrivalDate &&
      (item.originCity
        ? item.originCity.localeCompare(destination.city, "es", { sensitivity: "base" }) === 0
        : item.city.localeCompare(destination.city, "es", { sensitivity: "base" }) === 0),
    )
    .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
  const departureDate = departure?.startAt ?? destination.departureDate;
  const cityMatches = (value?: string) =>
    Boolean(value && value.localeCompare(destination.city, "es", { sensitivity: "base" }) === 0);
  const destinationIndex = trip.destinations.findIndex((item) => item.id === destination.id);
  const isFirstDestination = destinationIndex === 0;
  const isLastDestination = destinationIndex === trip.destinations.length - 1;
  const transports = trip.reservations
    .filter((item) =>
      transportTypes.has(item.type) &&
      item.status !== "cancelled" &&
      (
        cityMatches(item.originCity) ||
        cityMatches(item.destinationCity) ||
        cityMatches(item.city) ||
        (isFirstDestination && item.type === "flight" && cityMatches(item.destinationCity)) ||
        (isLastDestination && item.type === "flight" && item.startAt.slice(0, 10) >= destination.departureDate)
      ),
    )
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const activities = trip.itinerary
    .filter((day) => cityMatches(day.city))
    .flatMap((day) => day.activities.map((activity) => ({ ...activity, date: day.date })))
    .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));

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
                  : isLastDestination && transport.type === "flight"
                    ? "Conexión de regreso"
                    : "Viaje relacionado";
              return (
                <Link
                  className="destination-event transport-event"
                  key={transport.id}
                  to={`/viaje/${trip.id}/evento/reservation/${transport.id}`}
                  aria-label={`Ver detalle de ${transport.title}`}
                >
                  <span><Icon name={transport.type === "flight" ? "airplane" : transport.type === "train" ? "train" : transport.type === "car" ? "suitcase" : "ticket"} size={21} /></span>
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

      <section className="section-block">
        <div className="section-heading"><div><h2>Próxima salida</h2></div></div>
        <article className="departure-card">
          <span><Icon name={departure?.type === "flight" ? "airplane" : "ticket"} size={22} /></span>
          <div>
            <strong>{departure ? departure.title : "Fecha definida manualmente"}</strong>
            <p>{date(departureDate)}{departure?.destinationCity ? ` · hacia ${departure.destinationCity}` : ""}</p>
          </div>
        </article>
      </section>
    </>
  );
}
