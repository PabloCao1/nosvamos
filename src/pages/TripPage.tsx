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
import { reservationIcon, reservationTone } from "../lib/icons/entityIcons";
import { dateInTripZone, formatClockTime, timeInTripZone } from "../lib/dates/tripDateTime";

const transportLabels: Record<string, string> = {
  flight: "Vuelo",
  train: "Tren",
  bus: "Bus",
  ferry: "Ferry",
  car: "Auto",
};

const transportDateTime = (value: string, timezone: string) => {
  const [year, month, day] = dateInTripZone(value, timezone).split("-").map(Number);
  const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day, 12)))
    .replace(".", "");
  return `${day} ${monthLabel.charAt(0).toUpperCase()}${monthLabel.slice(1)} · ${formatClockTime(timeInTripZone(value, timezone))}`;
};

const semanticExpenseCategory = (category: string, label: string, linkedType?: string) => {
  if (linkedType === "car") return "auto";
  if (linkedType === "activity") return "excursion";
  if (category !== "other") return category;
  const normalized = label.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (/auto|coche|alquiler/.test(normalized)) return "auto";
  if (/aloj|hotel|departamento|airbnb/.test(normalized)) return "lodging";
  if (/transport|vuelo|avion|tren|bus|ferry|traslado/.test(normalized)) return "transport";
  if (/excursion|tour|entrada|experiencia/.test(normalized)) return "excursion";
  if (/actividad|evento/.test(normalized)) return "activities";
  if (/comida|restaurant|bar|cafe/.test(normalized)) return "food";
  return "other";
};

const expenseCategoryColor: Record<string, string> = {
  auto: "var(--tone-auto)",
  transport: "var(--tone-transport)",
  lodging: "var(--tone-lodging)",
  excursion: "var(--tone-excursion)",
  food: "var(--tone-excursion)",
  shopping: "var(--tone-excursion)",
  activities: "var(--tone-activity)",
  insurance: "var(--mint)",
  other: "var(--mint)",
};

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
  const expenseCategories = Object.values(
    activeExpenses.reduce<Record<string, { category: string; label: string; total: number }>>((totals, expense) => {
      const linkedType = trip.reservations.find((reservation) => reservation.id === expense.reservationId)?.type;
      const semanticLabel = linkedType === "car"
        ? "Auto"
        : linkedType === "activity"
          ? "Excursiones"
          : expense.categoryLabel ?? categoryLabels[expense.category] ?? expense.category;
      const semanticCategory = semanticExpenseCategory(expense.category, semanticLabel, linkedType);
      const key = `${semanticCategory}:${semanticLabel}`;
      totals[key] ??= {
        category: semanticCategory,
        label: semanticLabel,
        total: 0,
      };
      totals[key].total += expense.convertedAmount;
      return totals;
    }, {}),
  ).sort((first, second) => second.total - first.total);
  const sortedDestinations = [...trip.destinations].sort((first, second) =>
    (first.arrivalDate || "9999-12-31").localeCompare(second.arrivalDate || "9999-12-31") || first.departureDate.localeCompare(second.departureDate));
  const transports = trip.reservations
    .filter((item) => ["flight", "train", "bus", "ferry", "car"].includes(item.type) && item.status !== "cancelled")
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const routeItems = [
    ...sortedDestinations.map((destination) => ({
      kind: "destination" as const,
      id: destination.id,
      dateTime: `${destination.arrivalDate || "9999-12-31"}T23:59`,
      destination,
    })),
    ...transports.map((transport) => ({
      kind: "transport" as const,
      id: transport.id,
      dateTime: transport.startAt,
      transport,
    })),
  ].sort((first, second) => first.dateTime.localeCompare(second.dateTime) || first.id.localeCompare(second.id));

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
          {routeItems.map((item) => {
            if (item.kind === "destination") {
              const destination = item.destination;
              const destinationNumber = sortedDestinations.findIndex((candidate) => candidate.id === destination.id) + 1;
              return (
                <Link key={destination.id} className="destination-card" to={`/viaje/${trip.id}/destino/${destination.id}`}>
                  <DestinationImage city={destination.city} country={destination.country} imageUrl={destination.imageUrl} />
                  <span>{destinationNumber}</span>
                  <div><h3>{destination.city}</h3><p>{destination.country}</p></div>
                </Link>
              );
            }
            const transport = item.transport;
            return (
              <Link className={`route-connector route-${transport.type} tone-${reservationTone[transport.type]}`} key={transport.id} to={`/viaje/${trip.id}/evento/reservation/${transport.id}`}>
                <span><Icon name={reservationIcon[transport.type]} size={32} weight="Filled" /></span>
                <strong>{transportLabels[transport.type] ?? "Transporte"}{transport.serviceNumber ? ` ${transport.serviceNumber}` : ""}</strong>
                <small className="route-journey">{transport.originCity ?? "Origen"} → {transport.destinationCity ?? transport.city}</small>
                <small className="route-date">{transportDateTime(transport.startAt, trip.timezone)}</small>
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
          <strong>{formatUsd(spent)}</strong>
          {expenseCategories.length > 0 && (
            <div className="expense-category-chart">
              {expenseCategories.slice(0, 4).map(({ category, label, total }) => (
                <div className={`expense-category-${category}`} key={label}>
                  <p><span>{label}</span><strong>{formatUsd(total)}</strong></p>
                  <div><span style={{ width: `${spent ? (total / spent) * 100 : 0}%`, backgroundColor: expenseCategoryColor[category] ?? "var(--mint)" }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
