import { Fragment } from "react";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { TripHero } from "../components/trips/TripHero";
import { DestinationImage } from "../components/trips/DestinationImage";
import { TripCalendar } from "../components/trips/TripCalendar";
import { AvatarGroup } from "../components/ui/AvatarGroup";
import { Icon } from "../components/ui/Icon";
import { ButtonLink } from "../components/ui/Button";
import { ErrorState, LoadingState } from "../components/ui/PageState";
import { useTrip } from "../hooks/useTrips";
import { formatUsd } from "../lib/currency/exchangeRates";
import { reservationIcon } from "../lib/icons/entityIcons";
import { formatTripDateTime } from "../lib/dates/tripDateTime";

const transportDateTime = (value: string, timezone: string) => formatTripDateTime(value, timezone);

export function TripPage() {
  const { tripId } = useParams();
  const { data: trip, isLoading, isError, refetch } = useTrip(tripId);
  if (isLoading) return <LoadingState />;
  if (isError || !trip) return <ErrorState onRetry={() => void refetch()} />;
  const activeParticipants = trip.participants.filter((person) => person.status !== "removed");
  const activeExpenses = trip.expenses.filter((item) => item.status !== "cancelled");
  const spent = activeExpenses.reduce((sum, item) => sum + item.convertedAmount, 0);
  const categoryLabels: Record<string, string> = {
    transport: "Transporte",
    lodging: "Alojamiento",
    food: "Comidas",
    activities: "Actividades",
    shopping: "Compras",
    insurance: "Seguros",
    other: "Otros",
  };
  const expenseCategories = Object.entries(
    activeExpenses.reduce<Record<string, number>>((totals, expense) => {
      const category = expense.categoryLabel ?? expense.category;
      totals[category] = (totals[category] ?? 0) + expense.convertedAmount;
      return totals;
    }, {}),
  ).sort(([, first], [, second]) => second - first);
  const firstDestination = trip.destinations[0];
  const lastDestination = trip.destinations.at(-1);
  const outboundFlights = firstDestination
    ? trip.reservations
        .filter((item) =>
          item.type === "flight" &&
          item.status !== "cancelled" &&
          item.startAt.slice(0, 10) <= firstDestination.arrivalDate)
        .sort((a, b) => a.startAt.localeCompare(b.startAt))
    : [];
  const returnFlights = lastDestination
    ? trip.reservations
        .filter((item) =>
          item.type === "flight" &&
          item.status !== "cancelled" &&
          item.startAt.slice(0, 10) >= lastDestination.departureDate)
        .sort((a, b) => a.startAt.localeCompare(b.startAt))
    : [];

  return (
    <>
      <PageHeader title={trip.name} />
      <TripHero trip={trip} />

      <section className="section-block trip-detail-section">
        <div className="section-heading destination-heading">
          <div><h2>Itinerario</h2></div>
          <ButtonLink to={`/viaje/${trip.id}/itinerario/editar`} size="small">Editar</ButtonLink>
        </div>
        <div className="destination-scroll">
          {outboundFlights.map((flight, index) => (
            <Link className="route-connector route-connector-boundary route-flight" key={flight.id} to={`/viaje/${trip.id}/evento/reservation/${flight.id}`}>
              <span><Icon name="airplane" size={32} weight="Filled" /></span>
              <strong>Ida · tramo {index + 1}</strong>
              <small>{flight.originPlace ?? flight.originCity} → {flight.destinationPlace ?? flight.destinationCity}</small>
              <small>{transportDateTime(flight.startAt, trip.timezone)}</small>
              <small>{flight.serviceNumber}</small>
            </Link>
          ))}
          {trip.destinations.map((destination, index) => {
            const next = trip.destinations[index + 1];
            const transport = next
              ? trip.reservations.find((item) =>
                  ["flight", "train", "bus", "ferry", "car"].includes(item.type) &&
                  item.status !== "cancelled" &&
                  item.originCity?.localeCompare(destination.city, "es", { sensitivity: "base" }) === 0 &&
                  item.destinationCity?.localeCompare(next.city, "es", { sensitivity: "base" }) === 0)
              : undefined;
            return (
              <Fragment key={destination.id}>
                <Link className="destination-card" to={`/viaje/${trip.id}/destino/${destination.id}`}>
                  <DestinationImage city={destination.city} country={destination.country} imageUrl={destination.imageUrl} />
                  <span>{index + 1}</span>
                  <div><h3>{destination.city}</h3><p>{destination.country}</p></div>
                </Link>
                {transport && (
                  <Link
                    className={`route-connector route-${transport.type}`}
                    to={`/viaje/${trip.id}/evento/reservation/${transport.id}`}
                    aria-label={`Ver detalle de ${transport.title}`}
                  >
                    <span><Icon name={reservationIcon[transport.type]} size={32} weight="Filled" /></span>
                    <strong>{transport.type === "flight" ? "Vuelo" : transport.type === "train" ? "Tren" : transport.type === "bus" ? "Bus" : transport.type === "car" ? "Auto" : "Ferry"}</strong>
                    <small>{transportDateTime(transport.startAt, trip.timezone)}</small>
                  </Link>
                )}
              </Fragment>
            );
          })}
          {returnFlights.map((flight) => {
            const travelers = flight.travelerConfirmations
              ?.map((confirmation) => trip.participants.find((person) => person.id === confirmation.participantId)?.name)
              .filter(Boolean)
              .join(" y ");
            return (
              <Link className="route-connector route-connector-boundary route-flight" key={flight.id} to={`/viaje/${trip.id}/evento/reservation/${flight.id}`}>
                <span><Icon name="airplane" size={32} weight="Filled" /></span>
                <strong>Regreso{travelers ? ` · ${travelers}` : ""}</strong>
                <small>{flight.originPlace ?? flight.originCity} → {flight.destinationPlace ?? flight.destinationCity}</small>
                <small>{transportDateTime(flight.startAt, trip.timezone)}</small>
                <small>{flight.serviceNumber}</small>
              </Link>
            );
          })}
        </div>
      </section>

      <TripCalendar key={trip.id} trip={trip} />

      <section className="section-block trip-participants-section">
        <div className="section-heading destination-heading"><div><h2>Integrantes</h2></div><ButtonLink to={`/viaje/${trip.id}/integrantes`} size="small">Gestionar</ButtonLink></div>
        <div className="trip-participant-avatars">
          <AvatarGroup participants={activeParticipants} limit={activeParticipants.length} />
        </div>
      </section>

      <section className="expense-dashboard trip-expenses-section">
        <div className="section-heading expense-dashboard-heading">
          <div><h2>Gastos</h2></div>
          <ButtonLink to={`/viaje/${trip.id}/gastos`} size="small">Ver historial</ButtonLink>
        </div>
        <div className="expense-dashboard-total">
          <div>
            <p>Total de gastos</p>
            <strong>{formatUsd(spent)}</strong>
          </div>
        </div>
        {expenseCategories.length > 0 && (
          <div className="expense-category-chart">
            <div className="expense-category-title">
              <strong>Por categoría</strong>
              <span>{expenseCategories.length} categorías</span>
            </div>
            {expenseCategories.slice(0, 4).map(([category, total]) => (
              <div key={category}>
                <p><span>{categoryLabels[category] ?? category}</span><strong>{formatUsd(total)}</strong></p>
                <div><span style={{ width: `${spent ? (total / spent) * 100 : 0}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
