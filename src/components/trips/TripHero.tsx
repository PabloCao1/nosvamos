import type { Trip } from "../../types/domain";
import { AvatarGroup } from "../ui/AvatarGroup";
import { IconButtonLink } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { useCityImage } from "../../hooks/useCityImage";

export function TripHero({ trip }: { trip: Trip }) {
  const firstDestination = trip.destinations[0];
  const { data: automaticCover } = useCityImage(firstDestination?.city, firstDestination?.country, !trip.coverUrl);
  const coverUrl = trip.coverUrl || automaticCover?.url;
  const start = new Date(`${trip.startDate}T12:00:00`);
  const end = new Date(`${trip.endDate}T12:00:00`);
  const nights = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  const dates = `${new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(start)}–${new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(end)}`;

  return (
    <article className={`trip-hero ${coverUrl ? "" : "cover-placeholder"}`} style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined}>
      <div className="trip-hero-shade" />
      <div className="trip-hero-top">
        <div className="trip-hero-date">
          <h2><Icon name="calendar" size={22} /> {dates}</h2>
        </div>
        <IconButtonLink
          className="hero-icon-button"
          icon="edit"
          label={`Editar ${trip.name}`}
          to={`/viaje/${trip.id}/editar`}
        />
      </div>
      <div className="trip-hero-content">
        <div className="hero-meta">
          <AvatarGroup participants={trip.participants} />
          <div className="hero-meta-details">
            <span><Icon name="bed" size={17} /> {nights} {nights === 1 ? "noche" : "noches"}</span>
            <span><Icon name="location" size={17} /> {trip.destinations.length} destinos</span>
          </div>
        </div>
      </div>
    </article>
  );
}
