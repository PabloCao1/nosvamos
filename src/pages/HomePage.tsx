import { PageHeader } from "../components/layout/PageHeader";
import { FutureTripCard } from "../components/trips/FutureTripCard";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/PageState";
import { Icon } from "../components/ui/Icon";
import { useTrips } from "../hooks/useTrips";
import { useUnreadNotificationCount } from "../hooks/useNotifications";

export function HomePage() {
  const { data: trips, isLoading, isError, refetch } = useTrips();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeStatuses = new Set(["planning", "confirmed", "in_progress"]);
  const futureTrips = (trips ?? [])
    .filter((trip) => trip.status !== "archived" && (
      activeStatuses.has(trip.status)
      || new Date(`${trip.endDate || trip.startDate}T23:59:59`) >= today
    ))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <>
      <PageHeader
        title="Tus viajes"
        action={
          <Link className="profile-button" to="/notificaciones" aria-label={`${unreadCount} notificaciones sin leer`}>
            <Icon name="bell" size={21} />
            {unreadCount > 0 && <span className="notification-dot">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </Link>
        }
      />

      <section className="home-intro">
        <div>
          <strong>{futureTrips.length}</strong>
          <p>{futureTrips.length === 1 ? "viaje por delante" : "viajes por delante"}</p>
        </div>
      </section>

      {futureTrips.length ? (
        <>
          <section className="future-trip-list" aria-label="Viajes futuros">
            {futureTrips.map((trip) => <FutureTripCard key={trip.id} trip={trip} />)}
          </section>
          <Link className="past-trips-link" to="/viajes/pasados">
            <span>Viajes pasados</span>
            <Icon name="chevronRight" size={18} />
          </Link>
        </>
      ) : (
        <>
          <EmptyState title="Tu próxima aventura empieza acá" message="Creá un viaje y empezá a organizar sus destinos, reservas y gastos." />
          <Link className="past-trips-link" to="/viajes/pasados">
            <span>Viajes pasados</span>
            <Icon name="chevronRight" size={18} />
          </Link>
        </>
      )}
    </>
  );
}
import { Link } from "react-router-dom";
