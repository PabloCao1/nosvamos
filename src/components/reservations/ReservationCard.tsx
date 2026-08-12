import type { Reservation } from "../../types/domain";
import { Icon } from "../ui/Icon";
import { StatusPill } from "../ui/StatusPill";
import { reservationIcon, reservationTone } from "../../lib/icons/entityIcons";
import { formatTripDateTime } from "../../lib/dates/tripDateTime";
import { EntitySyncStatus } from "../sync/EntitySyncStatus";

export function ReservationCard({ reservation, timezone, onEdit }: { reservation: Reservation; timezone: string; onEdit?: () => void }) {
  const date = formatTripDateTime(reservation.startAt, timezone);
  return <div className="sync-entity-wrap">
    <button className="reservation-card" onClick={onEdit} disabled={!onEdit} aria-label={onEdit ? `Editar ${reservation.title}` : undefined}>
      <span className={`reservation-icon reservation-${reservation.type} tone-${reservationTone[reservation.type]}`}><Icon name={reservationIcon[reservation.type]} size={22} /></span>
      <div className="reservation-main">
        <p className="card-kicker">{reservation.providerName}</p>
        <h3>{reservation.title}</h3>
        <p className="reservation-date">{date} · {reservation.city}</p>
        {reservation.nextAction && <p className="next-action">{reservation.nextAction}</p>}
      </div>
      <div className="reservation-side">
        <StatusPill tone={reservation.status === "cancelled" ? "danger" : reservation.paymentStatus === "paid" ? "mint" : "warning"}>
          {reservation.status === "cancelled" ? "Anulada" : reservation.paymentStatus === "paid" ? "Pagada" : "Pendiente"}
        </StatusPill>
        <Icon name="chevronRight" size={18} />
      </div>
    </button>
    <EntitySyncStatus entity={reservation} />
  </div>;
}
