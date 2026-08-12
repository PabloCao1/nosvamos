import { Link } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/PageState";
import { Icon } from "../components/ui/Icon";
import { useTrips } from "../hooks/useTrips";
import { formatShortDate } from "../lib/dates/tripDateTime";

export function PastTripsPage() {
  const { data: trips, isLoading, isError, refetch } = useTrips();
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pastTrips = (trips ?? [])
    .filter((trip) => new Date(`${trip.endDate}T23:59:59`) < today)
    .sort((a, b) => b.endDate.localeCompare(a.endDate));

  return (
    <>
      <PageHeader title="Viajes pasados" />
      {pastTrips.length ? (
        <section className="past-trip-list">
          {pastTrips.map((trip) => (
            <Link key={trip.id} className="past-trip-row" to={`/viaje/${trip.id}`}>
              <div
                className={`past-trip-thumb ${trip.coverUrl ? "" : "cover-placeholder"}`}
                style={trip.coverUrl ? { backgroundImage: `url("${trip.coverUrl}")` } : undefined}
              />
              <div>
                <h2>{trip.name}</h2>
                <p>{formatShortDate(trip.endDate)}</p>
              </div>
              <Icon name="chevronRight" size={18} />
            </Link>
          ))}
        </section>
      ) : (
        <EmptyState title="Todavía no hay viajes pasados" message="Cuando finalice un viaje, aparecerá guardado en esta sección." />
      )}
    </>
  );
}
