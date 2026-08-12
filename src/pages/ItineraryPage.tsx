import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ActivityCard } from "../components/itinerary/ActivityCard";
import { PageHeader } from "../components/layout/PageHeader";
import { IconButton } from "../components/ui/Button";
import { ErrorState, LoadingState } from "../components/ui/PageState";
import { useTrip } from "../hooks/useTrips";
import { formatShortDate } from "../lib/dates/tripDateTime";

export function ItineraryPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { data: trip, isLoading, isError, refetch } = useTrip(tripId);
  const [selectedDay, setSelectedDay] = useState(0);
  if (isLoading) return <LoadingState />;
  if (isError || !trip) return <ErrorState onRetry={() => void refetch()} />;

  const sortedItinerary = [...trip.itinerary].sort((first, second) => first.date.localeCompare(second.date));
  const day = sortedItinerary[selectedDay];
  if (!day) return <ErrorState onRetry={() => void refetch()} />;
  return (
    <>
      <PageHeader
        eyebrow={trip.name}
        title="Itinerario"
        action={<IconButton icon="search" label="Buscar" />}
      />
      <div className="date-strip" role="tablist" aria-label="Días del itinerario">
        {sortedItinerary.map((item, index) => (
          <button
            role="tab"
            aria-selected={selectedDay === index}
            className={selectedDay === index ? "active" : ""}
            key={item.id}
            onClick={() => setSelectedDay(index)}
          >
            <span>{new Intl.DateTimeFormat("es-AR", { weekday: "short" }).format(new Date(`${item.date}T12:00:00`))}</span>
            <strong>{new Date(`${item.date}T12:00:00`).getDate()}</strong>
          </button>
        ))}
      </div>

      <section className="day-overview">
        <div>
          <p className="eyebrow">{formatShortDate(day.date)}</p>
          <h2>{day.city}</h2>
        </div>
      </section>

      <div className="timeline">
        {day.activities.map((item) => <ActivityCard key={item.id} activity={item} onEdit={() => navigate(`/viaje/${trip.id}/editar/activity/${item.id}`)} />)}
      </div>
    </>
  );
}
