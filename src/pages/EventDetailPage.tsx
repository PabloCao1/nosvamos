import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Button, IconButton } from "../components/ui/Button";
import { Icon, type IconName } from "../components/ui/Icon";
import { ErrorState, LoadingState } from "../components/ui/PageState";
import { useTrip } from "../hooks/useTrips";
import { formatUsd } from "../lib/currency/exchangeRates";
import { formatClockTime, formatShortDate, formatTripDateTime } from "../lib/dates/tripDateTime";
import { tripRepository } from "../repositories";
import type { Activity, Reservation, Trip } from "../types/domain";
import { reservationIcon, reservationTone } from "../lib/icons/entityIcons";
import { ParticipantAvatar } from "../components/ui/AvatarGroup";

const transportTypes = new Set(["flight", "train", "bus", "ferry", "car"]);
const lodgingTypes = new Set(["hotel", "apartment"]);

const dateTime = (value: string | undefined, timezone: string) => {
  if (!value) return "Sin definir";
  return formatTripDateTime(value, timezone, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

const labels = {
  status: {
    draft: "Borrador",
    pending: "Pendiente",
    confirmed: "Confirmada",
    cancelled: "Anulada",
    completed: "Completada",
  },
  payment: {
    unpaid: "Sin pagar",
    partially_paid: "Pago parcial",
    paid: "Pagada",
    refunded: "Reintegrada",
  },
  activityStatus: {
    planned: "Planificada",
    confirmed: "Confirmada",
    done: "Realizada",
  },
  activityCategory: {
    excursion: "Excursión o tour",
    visit: "Visita",
    food: "Comida",
    transport: "Transporte",
    lodging: "Alojamiento",
    shopping: "Compras",
    event: "Evento",
    outdoor: "Aire libre o deporte",
    free_time: "Tiempo libre",
    other: "Otro",
  },
} as const;

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return <div className="event-detail-row"><span>{label}</span><strong>{value}</strong></div>;
}

function Participants({ ids, trip }: { ids: string[]; trip: Trip }) {
  const people = ids.map((id) => trip.participants.find((person) => person.id === id)).filter(Boolean);
  if (!people.length) return null;
  return (
    <section className="event-detail-section">
      <h2>Integrantes</h2>
      <div className="event-people">
        {people.map((person) => person && (
          <div key={person.id}>
            <ParticipantAvatar participant={person} className="event-person-avatar" />
            <div><strong>{person.name}</strong><small>{person.email ?? "Integrante del viaje"}</small></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReservationDetail({ reservation, trip, moment }: { reservation: Reservation; trip: Trip; moment?: string }) {
  const navigate = useNavigate();
  const isTransport = transportTypes.has(reservation.type);
  const isLodging = lodgingTypes.has(reservation.type);
  const icon: IconName = reservationIcon[reservation.type];
  const linkedExpenses = trip.expenses.filter((expense) => expense.reservationId === reservation.id);
  const momentLabel = isLodging
    ? moment === "end" ? "Check-out" : "Check-in"
    : isTransport
      ? moment === "end" ? "Llegada" : "Salida"
      : moment === "end" ? "Finalización" : "Inicio";

  return (
    <>
      <section className="event-detail-hero">
        <span className={`event-detail-icon tone-${reservationTone[reservation.type]}`}><Icon name={icon} size={28} /></span>
        <div><p>{momentLabel} · {reservation.providerName}</p><h2>{reservation.title}</h2></div>
        <span className={`event-status ${reservation.status}`}>{labels.status[reservation.status]}</span>
      </section>

      <section className="event-detail-section">
        <h2>Fecha y lugar</h2>
        <div className="event-detail-card">
          <DetailRow label={isLodging ? "Check-in" : "Salida"} value={dateTime(reservation.startAt, trip.timezone)} />
          <DetailRow label={isLodging ? "Check-out" : "Llegada"} value={dateTime(reservation.endAt, trip.timezone)} />
          {isTransport && <DetailRow label="Recorrido" value={`${reservation.originCity ?? reservation.city} → ${reservation.destinationCity ?? reservation.city}`} />}
          <DetailRow label="Desde" value={reservation.originPlace} />
          <DetailRow label="Hasta" value={reservation.destinationPlace} />
          {!isTransport && <DetailRow label="Ciudad" value={reservation.city} />}
          <DetailRow label="Dirección" value={reservation.address} />
        </div>
      </section>

      <section className="event-detail-section">
        <h2>Reserva</h2>
        <div className="event-detail-card">
          <DetailRow label="Proveedor" value={reservation.providerName} />
          <DetailRow label={reservation.type === "flight" ? "Vuelo" : "Servicio"} value={reservation.serviceNumber} />
          <DetailRow label="Código" value={reservation.confirmationCode ?? reservation.providerReference} />
          <DetailRow label="Estado del pago" value={labels.payment[reservation.paymentStatus]} />
          <DetailRow label="Importe" value={formatUsd(reservation.totalAmount)} />
          {reservation.originalCurrency && reservation.originalCurrency !== "USD" && (
            <DetailRow label="Importe original" value={`${reservation.originalCurrency} ${reservation.originalTotalAmount?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
          )}
          <DetailRow label="Tarjeta" value={reservation.paymentMethodLast4 ? `MasterCard terminada en ${reservation.paymentMethodLast4}` : undefined} />
          <DetailRow label="Próximo paso" value={reservation.nextAction} />
        </div>
        {reservation.externalUrl && (
          <a className="event-provider-link" href={reservation.externalUrl} target="_blank" rel="noreferrer">
            Abrir en {reservation.providerName}
            <Icon name="arrowUpRight" size={17} />
          </a>
        )}
      </section>

      {reservation.travelerConfirmations?.length ? (
        <section className="event-detail-section">
          <h2>Confirmaciones por viajero</h2>
          <div className="event-detail-card">
            {reservation.travelerConfirmations.map((confirmation) => (
              <div className="traveler-confirmation" key={confirmation.participantId}>
                <div>
                  <span>{trip.participants.find((person) => person.id === confirmation.participantId)?.name ?? "Viajero"}</span>
                  <strong>{confirmation.passengerName ?? "Pasajero"}</strong>
                </div>
                <div>
                  <span>Código</span><strong>{confirmation.confirmationCode}</strong>
                </div>
                {confirmation.seat && <div><span>Asiento</span><strong>{confirmation.seat}</strong></div>}
                {confirmation.baggage && <div><span>Equipaje</span><strong>{confirmation.baggage}</strong></div>}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Participants ids={reservation.participantIds} trip={trip} />

      {linkedExpenses.length > 0 && (
        <section className="event-detail-section">
          <h2>Gastos asociados</h2>
          <div className="event-linked-expenses">
            {linkedExpenses.map((expense) => (
              <button type="button" key={expense.id} onClick={() => navigate(`/viaje/${trip.id}/gasto/${expense.id}`)}>
                <span><Icon name="receipt" size={20} /></span>
                <div><strong>{expense.description}</strong><small>Pagó {trip.participants.find((person) => person.id === expense.paidBy)?.name ?? "Integrante"}</small></div>
                <strong>{formatUsd(expense.convertedAmount)}</strong>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function ActivityDetail({ activity, trip, date }: { activity: Activity; trip: Trip; date: string }) {
  const linkedReservation = activity.reservationId
    ? trip.reservations.find((reservation) => reservation.id === activity.reservationId)
    : undefined;
  return (
    <>
      <section className="event-detail-hero">
        <span className="event-detail-icon tone-activity"><Icon name={activity.category === "food" ? "receipt" : "calendar"} size={28} /></span>
        <div><p>{labels.activityCategory[activity.category]}</p><h2>{activity.title}</h2></div>
        <span className="event-status confirmed">{labels.activityStatus[activity.status]}</span>
      </section>
      <section className="event-detail-section">
        <h2>Detalles</h2>
        <div className="event-detail-card">
          <DetailRow label="Fecha" value={`${formatShortDate(date)}, ${formatClockTime(activity.startTime)}`} />
          <DetailRow label="Finaliza" value={activity.endTime ? `${formatShortDate(date)}, ${formatClockTime(activity.endTime)}` : undefined} />
          <DetailRow label="Lugar" value={activity.location} />
          <DetailRow label="Descripción" value={activity.description} />
          <DetailRow label="Categoría" value={labels.activityCategory[activity.category]} />
          <DetailRow label="Reserva asociada" value={linkedReservation?.title} />
          <DetailRow label="Código" value={linkedReservation?.confirmationCode ?? linkedReservation?.providerReference} />
          <DetailRow label="Importe" value={linkedReservation ? formatUsd(linkedReservation.totalAmount) : undefined} />
        </div>
      </section>
      <Participants ids={activity.participantIds} trip={trip} />
    </>
  );
}

export function EventDetailPage() {
  const { tripId, eventType, eventId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const queryClient = useQueryClient();
  const { data: trip, isLoading, isError, refetch } = useTrip(tripId);
  const reservation = eventType === "reservation"
    ? trip?.reservations.find((item) => item.id === eventId)
    : undefined;
  const activityEntry = eventType === "activity"
    ? trip?.itinerary.flatMap((day) => day.activities.map((activity) => ({ activity, date: day.date }))).find(({ activity }) => activity.id === eventId)
    : undefined;

  const deletion = useMutation({
    mutationFn: async () => {
      if (reservation) return tripRepository.deleteReservation(reservation);
      if (activityEntry) return tripRepository.deleteActivity(activityEntry.activity);
      throw new Error("Evento no encontrado");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      navigate(`/viaje/${tripId}`);
    },
  });

  if (isLoading) return <LoadingState />;
  if (isError || !trip) return <ErrorState onRetry={() => void refetch()} />;
  if (!reservation && !activityEntry) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader
        eyebrow={trip.name}
        title="Detalle del evento"
        action={
          <IconButton
            icon="edit"
            label="Editar evento"
            onClick={() => reservation
              ? navigate(`/viaje/${trip.id}/editar/reservation/${reservation.id}`)
              : activityEntry && navigate(`/viaje/${trip.id}/editar/activity/${activityEntry.activity.id}`)}
          />
        }
      />
      {reservation && <ReservationDetail reservation={reservation} trip={trip} moment={searchParams.get("momento") ?? undefined} />}
      {activityEntry && <ActivityDetail activity={activityEntry.activity} date={activityEntry.date} trip={trip} />}
      <section className="section-block">
        <Button variant="danger" icon="trash" fullWidth onClick={() => setConfirmingDelete(true)}>
          {reservation ? "Eliminar reserva" : "Eliminar actividad"}
        </Button>
      </section>
      {confirmingDelete && (
        <div className="confirm-layer" role="presentation">
          <button type="button" className="confirm-backdrop" onClick={() => setConfirmingDelete(false)} aria-label="Cancelar eliminación" />
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-event-title">
            <div className="confirm-icon">!</div>
            <h2 id="delete-event-title">¿Eliminar {reservation ? "reserva" : "actividad"}?</h2>
            <p>Se eliminará del viaje. Esta acción no se puede deshacer.</p>
            {deletion.error && <p className="form-error">No pudimos eliminarlo. Probá nuevamente.</p>}
            <div className="confirm-actions">
              <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>Cancelar</Button>
              <Button variant="danger" icon="trash" disabled={deletion.isPending} onClick={() => deletion.mutate()}>
                {deletion.isPending ? "Eliminando…" : "Eliminar"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
