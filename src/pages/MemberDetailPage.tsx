import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ExpenseCard } from "../components/expenses/ExpenseCard";
import { PageHeader } from "../components/layout/PageHeader";
import { ReservationCard } from "../components/reservations/ReservationCard";
import { Button, IconButtonLink } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { ErrorState, LoadingState } from "../components/ui/PageState";
import { useTrip } from "../hooks/useTrips";
import { formatUsd } from "../lib/currency/exchangeRates";
import { calculateBalances, calculateSettlements } from "../lib/expenses/calculateBalances";
import { activityIcon } from "../lib/icons/entityIcons";
import { tripRepository } from "../repositories";

const activityDate = (date: string, time: string) => {
  const label = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" })
    .format(new Date(`${date}T12:00:00`));
  return `${label} · ${time}`;
};

export function MemberDetailPage() {
  const { tripId, memberId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const { data: trip, isLoading, isError, refetch } = useTrip(tripId);

  const removeMember = useMutation({
    mutationFn: async () => {
      if (!trip || !memberId) return;
      await tripRepository.updateTrip({
        ...trip,
        participants: trip.participants.map((person) => person.id === memberId
          ? { ...person, status: "removed", removedAt: new Date().toISOString() }
          : person),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      navigate(`/viaje/${tripId}/integrantes`, { replace: true });
    },
  });

  if (isLoading) return <LoadingState />;
  if (isError || !trip) return <ErrorState onRetry={() => void refetch()} />;

  const member = trip.participants.find((person) => person.id === memberId);
  if (!member) return <ErrorState onRetry={() => void refetch()} />;

  const balance = calculateBalances(trip.participants, trip.expenses)
    .find((item) => item.participant.id === member.id);
  const settlements = calculateSettlements(trip.participants, trip.expenses)
    .filter((item) => item.fromParticipantId === member.id || item.toParticipantId === member.id);
  const byId = new Map(trip.participants.map((person) => [person.id, person]));
  const expenses = [...trip.expenses]
    .filter((expense) =>
      expense.paidBy === member.id
      || expense.splits.some((split) => split.participantId === member.id))
    .reverse();
  const reservations = trip.reservations
    .filter((reservation) =>
      reservation.participantIds.includes(member.id)
      || reservation.travelerConfirmations?.some((item) => item.participantId === member.id));
  const activities = trip.itinerary
    .flatMap((day) => day.activities
      .filter((activity) => activity.participantIds.includes(member.id))
      .map((activity) => ({ activity, date: day.date })))
    .sort((first, second) =>
      `${first.date}T${first.activity.startTime}`.localeCompare(`${second.date}T${second.activity.startTime}`));

  return (
    <>
      <PageHeader
        eyebrow={trip.name}
        title={member.name}
        action={member.status !== "removed"
          ? <IconButtonLink icon="edit" label="Editar integrante" to={`/viaje/${trip.id}/integrantes/${member.id}/editar`} />
          : undefined}
      />

      <section className="member-dashboard-hero">
        <span className="member-dashboard-avatar" style={{ background: member.color }}>{member.initials}</span>
        <div>
          <h2>{member.name}</h2>
          <p>{member.email ?? "Sin email cargado"}</p>
          <span>{member.status === "removed" ? "Retirado" : member.role === "owner" ? "Propietario" : "Integrante"}</span>
        </div>
      </section>

      <section className="member-dashboard-section">
        <div className="section-heading"><div><p className="eyebrow">Resumen</p><h2>Balance personal</h2></div></div>
        <div className="member-dashboard-metrics">
          <article><Icon name="wallet" size={21} /><span>Pagó</span><strong>{formatUsd(balance?.paid ?? 0)}</strong></article>
          <article><Icon name="receipt" size={21} /><span>Le corresponde</span><strong>{formatUsd(balance?.consumed ?? 0)}</strong></article>
          <article><Icon name="arrowUpRight" size={21} /><span>{(balance?.net ?? 0) >= 0 ? "Recibe" : "Debe"}</span><strong>{formatUsd(Math.abs(balance?.net ?? 0))}</strong></article>
        </div>
      </section>

      <section className="member-dashboard-section">
        <div className="section-heading"><div><h2>Pagos pendientes</h2></div><span>{settlements.length}</span></div>
        <div className="member-payment-list">
          {settlements.map((settlement) => {
            const memberPays = settlement.fromParticipantId === member.id;
            const other = byId.get(memberPays ? settlement.toParticipantId : settlement.fromParticipantId);
            return (
              <article key={`${settlement.fromParticipantId}-${settlement.toParticipantId}`}>
                <span className="mini-avatar" style={{ background: other?.color }}>{other?.initials}</span>
                <div><strong>{memberPays ? `Pagarle a ${other?.name}` : `${other?.name} debe pagarle`}</strong><p>{memberPays ? "Pago pendiente" : "Importe por recibir"}</p></div>
                <b>{formatUsd(settlement.amount)}</b>
              </article>
            );
          })}
          {settlements.length === 0 && <p className="member-dashboard-empty">No tiene pagos pendientes.</p>}
        </div>
      </section>

      <section className="member-dashboard-section">
        <div className="section-heading"><div><h2>Gastos</h2></div><span>{expenses.length}</span></div>
        <div className="card-stack">
          {expenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              payer={byId.get(expense.paidBy)}
              onEdit={() => navigate(`/viaje/${trip.id}/editar/expense/${expense.id}`)}
            />
          ))}
          {expenses.length === 0 && <p className="member-dashboard-empty">Todavía no participa en gastos.</p>}
        </div>
      </section>

      <section className="member-dashboard-section">
        <div className="section-heading"><div><h2>Reservas</h2></div><span>{reservations.length}</span></div>
        <div className="card-stack">
          {reservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              onEdit={() => navigate(`/viaje/${trip.id}/evento/reservation/${reservation.id}`)}
            />
          ))}
          {reservations.length === 0 && <p className="member-dashboard-empty">No tiene reservas asociadas.</p>}
        </div>
      </section>

      <section className="member-dashboard-section">
        <div className="section-heading"><div><h2>Actividades</h2></div><span>{activities.length}</span></div>
        <div className="member-activity-list">
          {activities.map(({ activity, date }) => (
            <Link key={activity.id} to={`/viaje/${trip.id}/evento/activity/${activity.id}`}>
              <span><Icon name={activityIcon[activity.category]} size={22} weight="Filled" /></span>
              <div><strong>{activity.title}</strong><p>{activity.location}</p></div>
              <time>{activityDate(date, activity.startTime)}</time>
              <Icon name="chevronRight" size={17} />
            </Link>
          ))}
          {activities.length === 0 && <p className="member-dashboard-empty">No tiene actividades asignadas.</p>}
        </div>
      </section>

      {member.role !== "owner" && member.status !== "removed" && (
        <section className="member-dashboard-danger">
          <Button variant="danger" icon="trash" fullWidth onClick={() => setConfirmingRemoval(true)}>Sacar integrante del viaje</Button>
        </section>
      )}

      {confirmingRemoval && (
        <div className="confirm-layer" role="presentation">
          <button className="confirm-backdrop" onClick={() => setConfirmingRemoval(false)} aria-label="Cancelar" />
          <section className="confirm-dialog" role="alertdialog" aria-modal="true">
            <div className="confirm-icon">!</div>
            <h2>¿Sacar a {member.name}?</h2>
            <p>Sus datos, reservas y movimientos seguirán guardados en el historial.</p>
            <div className="confirm-actions">
              <Button variant="secondary" onClick={() => setConfirmingRemoval(false)}>Cancelar</Button>
              <Button variant="danger" onClick={() => removeMember.mutate()} disabled={removeMember.isPending}>
                {removeMember.isPending ? "Quitando…" : "Sacar integrante"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
