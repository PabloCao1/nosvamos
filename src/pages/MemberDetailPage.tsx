import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { ErrorState, LoadingState } from "../components/ui/PageState";
import { useTrip } from "../hooks/useTrips";
import { ParticipantAvatar } from "../components/ui/AvatarGroup";
import { formatUsd } from "../lib/currency/exchangeRates";
import { calculateBalances, calculateSettlements } from "../lib/expenses/calculateBalances";
import { activityIcon, reservationTone } from "../lib/icons/entityIcons";
import { tripRepository } from "../repositories";
import type { IconName } from "../components/ui/Icon";

const activityDate = (date: string, time: string) => {
  const label = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" })
    .format(new Date(`${date}T12:00:00`));
  return `${label} · ${time}`;
};

const expenseCategoryLabels: Record<string, string> = {
  transport: "Transporte",
  lodging: "Alojamiento",
  food: "Comidas",
  activities: "Actividades",
  shopping: "Compras",
  insurance: "Seguros",
  other: "Otros",
};

const reservationTypeLabels: Record<string, string> = {
  flight: "Vuelos", train: "Trenes", bus: "Buses", ferry: "Ferries",
  hotel: "Hoteles", apartment: "Casas y departamentos", restaurant: "Restaurantes",
  activity: "Actividades reservadas", car: "Autos", insurance: "Seguros", other: "Otras reservas",
};

const activityCategoryLabels: Record<string, string> = {
  visit: "Visitas", food: "Comidas", transport: "Traslados", lodging: "Alojamiento",
  shopping: "Compras", event: "Eventos", free_time: "Tiempo libre", other: "Otras actividades",
};

const expenseCategoryIcons: Record<string, IconName> = {
  transport: "airplane", lodging: "bed", food: "food", activities: "ticket",
  shopping: "shopping", insurance: "insurance", other: "receipt",
};

const reservationTypeIcons: Record<string, IconName> = {
  flight: "airplane", train: "train", bus: "bus", ferry: "ferry", hotel: "hotel",
  apartment: "apartment", restaurant: "food", activity: "ticket", car: "car",
  insurance: "insurance", other: "receipt",
};

export function MemberDetailPage() {
  const { tripId, memberId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
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
  const paidExpenses = trip.expenses.filter((expense) => expense.paidBy === member.id && expense.status !== "cancelled");
  const paidByCategory = Array.from(paidExpenses.reduce((categories, expense) => {
    const label = expense.categoryLabel ?? expenseCategoryLabels[expense.category] ?? expense.category;
    const current = categories.get(label) ?? { total: 0, expenses: [] as typeof paidExpenses, icon: expenseCategoryIcons[expense.category] ?? "receipt" };
    categories.set(label, { ...current, total: current.total + expense.convertedAmount, expenses: [...current.expenses, expense] });
    return categories;
  }, new Map<string, { total: number; expenses: typeof paidExpenses; icon: IconName }>()).entries())
    .map(([label, values]) => ({ label, ...values }))
    .sort((first, second) => second.total - first.total);
  const reservations = trip.reservations
    .filter((reservation) =>
      reservation.participantIds.includes(member.id)
      || reservation.travelerConfirmations?.some((item) => item.participantId === member.id));
  const reservationsByType = Array.from(reservations.reduce((groups, reservation) => {
    const label = reservationTypeLabels[reservation.type] ?? "Otras reservas";
    groups.set(label, [...(groups.get(label) ?? []), reservation]);
    return groups;
  }, new Map<string, typeof reservations>()).entries());
  const activities = trip.itinerary
    .flatMap((day) => day.activities
      .filter((activity) => activity.participantIds.includes(member.id))
      .map((activity) => ({ activity, date: day.date })))
    .sort((first, second) =>
      `${first.date}T${first.activity.startTime}`.localeCompare(`${second.date}T${second.activity.startTime}`));
  const activitiesByCategory = Array.from(activities.reduce((groups, item) => {
    const label = activityCategoryLabels[item.activity.category] ?? "Otras actividades";
    groups.set(label, [...(groups.get(label) ?? []), item]);
    return groups;
  }, new Map<string, typeof activities>()).entries());

  return (
    <>
      <PageHeader eyebrow={trip.name} title={member.name} />

      <section className="member-dashboard-hero">
        <ParticipantAvatar participant={member} className="member-dashboard-avatar" />
        <div>
          <h2>{member.name}</h2>
          <span>{member.status === "removed" ? "Retirado" : member.role === "owner" ? "Propietario" : "Integrante"}</span>
        </div>
      </section>

      <section className="member-dashboard-section">
        <div className="section-heading"><div><p className="eyebrow">Resumen</p><h2>Balance personal</h2></div></div>
        <div className="member-dashboard-metrics">
          <article><Icon name="wallet" size={21} /><span>Pagó</span><strong>{formatUsd(balance?.paid ?? 0)}</strong></article>
          <article><Icon name="receipt" size={21} /><span>Le corresponde</span><strong>{formatUsd(balance?.consumed ?? 0)}</strong></article>
          <article><Icon name="users" size={21} /><span>{(balance?.net ?? 0) >= 0 ? "Recibe" : "Debe"}</span><strong>{formatUsd(Math.abs(balance?.net ?? 0))}</strong></article>
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
        <div className="section-heading"><div><p className="eyebrow">Pagado por {member.name}</p><h2>Gastos por rubro</h2></div><span>{paidExpenses.length}</span></div>
        <div className="member-category-breakdown">
          {paidByCategory.map((category) => (
            <article className={expandedCategory === `expense:${category.label}` ? "expanded" : ""} key={category.label}>
              <button type="button" onClick={() => setExpandedCategory((current) => current === `expense:${category.label}` ? null : `expense:${category.label}`)} aria-expanded={expandedCategory === `expense:${category.label}`}>
                <span><Icon name={category.icon} size={20} /></span>
                <div><strong>{category.label}</strong><small>{category.expenses.length} {category.expenses.length === 1 ? "pago" : "pagos"}</small></div>
                <b>{formatUsd(category.total)}</b>
                <Icon name="chevronRight" size={18} className="member-category-chevron" />
              </button>
              {expandedCategory === `expense:${category.label}` && (
                <div className="member-category-items">
                  {[...category.expenses].sort((first, second) => second.date.localeCompare(first.date)).map((expense) => (
                    <button type="button" key={expense.id} onClick={() => navigate(`/viaje/${trip.id}/editar/expense/${expense.id}`)}>
                      <span><strong>{expense.description}</strong><small>{new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${expense.date}T12:00:00`))}</small></span>
                      <b>{formatUsd(expense.convertedAmount)}</b>
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
          {paidByCategory.length === 0 && <p className="member-dashboard-empty">Todavía no registró pagos.</p>}
        </div>
      </section>

      <section className="member-dashboard-section">
        <div className="section-heading"><div><h2>Reservas</h2></div><span>{reservations.length}</span></div>
        <div className="member-category-breakdown">
          {reservationsByType.map(([label, items]) => (
            <article className={`${expandedCategory === `reservation:${label}` ? "expanded " : ""}tone-${reservationTone[items[0].type]}`} key={label}>
              <button type="button" onClick={() => setExpandedCategory((current) => current === `reservation:${label}` ? null : `reservation:${label}`)} aria-expanded={expandedCategory === `reservation:${label}`}>
                <span><Icon name={reservationTypeIcons[items[0].type] ?? "receipt"} size={20} /></span>
                <div><strong>{label}</strong><small>{items.length} {items.length === 1 ? "reserva" : "reservas"}</small></div>
                <b>{items.length}</b>
                <Icon name="chevronRight" size={18} className="member-category-chevron" />
              </button>
              {expandedCategory === `reservation:${label}` && <div className="member-category-items">
                {items.map((reservation) => <button type="button" key={reservation.id} onClick={() => navigate(`/viaje/${trip.id}/evento/reservation/${reservation.id}`)}>
                  <span><strong>{reservation.title}</strong><small>{reservation.startAt.slice(0, 10).split("-").reverse().join("/")}</small></span>
                  <Icon name="chevronRight" size={17} />
                </button>)}
              </div>}
            </article>
          ))}
          {reservations.length === 0 && <p className="member-dashboard-empty">No tiene reservas asociadas.</p>}
        </div>
      </section>

      <section className="member-dashboard-section">
        <div className="section-heading"><div><h2>Actividades</h2></div><span>{activities.length}</span></div>
        <div className="member-category-breakdown">
          {activitiesByCategory.map(([label, items]) => (
            <article className={`${expandedCategory === `activity:${label}` ? "expanded " : ""}tone-activity`} key={label}>
              <button type="button" onClick={() => setExpandedCategory((current) => current === `activity:${label}` ? null : `activity:${label}`)} aria-expanded={expandedCategory === `activity:${label}`}>
                <span><Icon name={activityIcon[items[0].activity.category]} size={20} weight="Filled" /></span>
                <div><strong>{label}</strong><small>{items.length} {items.length === 1 ? "actividad" : "actividades"}</small></div>
                <b>{items.length}</b>
                <Icon name="chevronRight" size={18} className="member-category-chevron" />
              </button>
              {expandedCategory === `activity:${label}` && <div className="member-category-items">
                {items.map(({ activity, date }) => <button type="button" key={activity.id} onClick={() => navigate(`/viaje/${trip.id}/evento/activity/${activity.id}`)}>
                  <span><strong>{activity.title}</strong><small>{activity.location} · {activityDate(date, activity.startTime)}</small></span>
                  <Icon name="chevronRight" size={17} />
                </button>)}
              </div>}
            </article>
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
