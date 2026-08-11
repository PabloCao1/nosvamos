import type { Reservation } from "../../types/domain";
import { Icon } from "../ui/Icon";
import { StatusPill } from "../ui/StatusPill";
import { reservationIcon } from "../../lib/icons/entityIcons";

export function ReservationCard({ reservation, onEdit }: { reservation: Reservation; onEdit?: () => void }) {
  const date = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(reservation.startAt));
  return (
    <button className="reservation-card" onClick={onEdit} disabled={!onEdit} aria-label={onEdit ? `Editar ${reservation.title}` : undefined}>
      <span className={`reservation-icon reservation-${reservation.type}`}><Icon name={reservationIcon[reservation.type]} size={22} /></span>
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
  );
}
