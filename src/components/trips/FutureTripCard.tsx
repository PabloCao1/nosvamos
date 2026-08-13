import { Link } from "react-router-dom";
import type { Trip } from "../../types/domain";
import { AvatarGroup } from "../ui/AvatarGroup";
import { DetailIndicator } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { StatusPill } from "../ui/StatusPill";
import { useCityImage } from "../../hooks/useCityImage";
import { formatShortDate } from "../../lib/dates/tripDateTime";

export function FutureTripCard({ trip }: { trip: Trip }) {
  const start = new Date(`${trip.startDate}T12:00:00`);
  const end = new Date(`${trip.endDate}T12:00:00`);
  const days = Math.ceil((start.getTime() - Date.now()) / 86_400_000);
  const timingLabel = days > 0 ? `Faltan ${days} días` : Date.now() <= end.getTime() ? "En curso" : "Finalizado";
  const firstDestination = trip.destinations[0];
  const { data: automaticCover } = useCityImage(firstDestination?.city, firstDestination?.country, !trip.coverUrl);
  const coverUrl = trip.coverUrl || automaticCover?.url;

  return (
    <Link className="future-trip-card" to={`/viaje/${trip.id}`}>
      <div
        className={`future-trip-cover ${coverUrl ? "" : "cover-placeholder"}`}
        style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined}
      >
        <div className="future-trip-overlay" />
        <div className="future-trip-badges">
          <StatusPill tone="mint">{timingLabel}</StatusPill>
          {trip.syncStatus !== "synced" && <StatusPill>Sin sincronizar</StatusPill>}
        </div>
      </div>
      <div className="future-trip-body">
        <div className="future-trip-heading">
          <div>
            <p>{formatShortDate(trip.startDate)} — {formatShortDate(trip.endDate)}</p>
            <h2>{trip.name}</h2>
          </div>
          <DetailIndicator label={`Ver detalle de ${trip.name}`} />
        </div>
        <div className="future-trip-meta">
          <span><Icon name="location" size={15} /> {trip.destinations.length || "Sin"} destinos</span>
          <AvatarGroup participants={trip.participants} />
        </div>
      </div>
    </Link>
  );
}
