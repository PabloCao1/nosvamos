import { Link } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/PageState";
import { Icon } from "../components/ui/Icon";
import { useTrips } from "../hooks/useTrips";
import { dateInTripZone, formatClockTime, timeInTripZone } from "../lib/dates/tripDateTime";
import { activityIcon, reservationIcon } from "../lib/icons/entityIcons";

type TodayItem = {
  id: string; tripId: string; tripName: string; time: string; title: string; detail: string;
  icon: Parameters<typeof Icon>[0]["name"]; href: string; cancelled?: boolean;
};

export function TodayPage() {
  const { data: trips, isLoading, isError, refetch } = useTrips();
  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const now = new Date().toISOString();
  const items: TodayItem[] = (trips ?? []).flatMap((trip) => {
    const today = dateInTripZone(now, trip.timezone);
    const reservations = trip.reservations.flatMap((reservation) => {
      const result: TodayItem[] = [];
      if (dateInTripZone(reservation.startAt, trip.timezone) === today) result.push({
        id: `${reservation.id}-start`, tripId: trip.id, tripName: trip.name,
        time: timeInTripZone(reservation.startAt, trip.timezone), title: reservation.title,
        detail: reservation.type === "hotel" || reservation.type === "apartment" ? `Check-in · ${reservation.city}` : reservation.originCity && reservation.destinationCity ? `${reservation.originCity} → ${reservation.destinationCity}` : reservation.city,
        icon: reservationIcon[reservation.type], href: `/viaje/${trip.id}/evento/reservation/${reservation.id}?moment=start`, cancelled: reservation.status === "cancelled",
      });
      if (reservation.endAt && dateInTripZone(reservation.endAt, trip.timezone) === today) result.push({
        id: `${reservation.id}-end`, tripId: trip.id, tripName: trip.name,
        time: timeInTripZone(reservation.endAt, trip.timezone), title: reservation.title,
        detail: reservation.type === "hotel" || reservation.type === "apartment" ? `Check-out · ${reservation.city}` : `Llegada · ${reservation.destinationCity ?? reservation.city}`,
        icon: reservationIcon[reservation.type], href: `/viaje/${trip.id}/evento/reservation/${reservation.id}?moment=end`, cancelled: reservation.status === "cancelled",
      });
      return result;
    });
    const activities = trip.itinerary.filter((day) => day.date === today).flatMap((day) => day.activities.map((activity): TodayItem => ({
      id: activity.id, tripId: trip.id, tripName: trip.name, time: activity.startTime, title: activity.title,
      detail: activity.location || day.city, icon: activityIcon[activity.category], href: `/viaje/${trip.id}/evento/activity/${activity.id}`,
    })));
    return [...reservations, ...activities];
  }).sort((a, b) => a.time.localeCompare(b.time));

  return <>
    <PageHeader eyebrow="Tu agenda" title="Hoy" />
    {items.length === 0 ? <EmptyState title="Nada para hoy" message="No hay vuelos, traslados, reservas ni actividades programadas para hoy." /> :
      <section className="today-list">
        {items.map((item) => <Link className={`today-item ${item.cancelled ? "cancelled" : ""}`} to={item.href} key={`${item.tripId}-${item.id}`}>
          <time>{formatClockTime(item.time)}</time>
          <span className="today-item-icon"><Icon name={item.icon} size={23} /></span>
          <div><small>{item.tripName}</small><h2>{item.title}</h2><p>{item.detail}</p></div>
          <Icon name="chevronRight" size={18} />
        </Link>)}
      </section>}
  </>;
}
