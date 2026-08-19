import { useState } from "react";
import { ExpenseCard } from "../components/expenses/ExpenseCard";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Icon } from "../components/ui/Icon";
import { Button } from "../components/ui/Button";
import { ParticipantAvatar } from "../components/ui/AvatarGroup";
import { ErrorState, LoadingState } from "../components/ui/PageState";
import { calculateBalances, calculateSettlements } from "../lib/expenses/calculateBalances";
import { useTrip } from "../hooks/useTrips";
import { formatUsd } from "../lib/currency/exchangeRates";

const categoryLabels: Record<string, string> = {
  transport: "Transporte",
  lodging: "Alojamiento",
  food: "Comidas",
  activities: "Actividades",
  shopping: "Compras",
  insurance: "Seguros",
  other: "Otros",
};

export function ExpensesPage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { data: trip, isLoading, isError, refetch } = useTrip(tripId);
  if (isLoading) return <LoadingState />;
  if (isError || !trip) return <ErrorState onRetry={() => void refetch()} />;
  const balances = calculateBalances(trip.participants, trip.expenses);
  const settlements = calculateSettlements(trip.participants, trip.expenses);
  const spent = trip.expenses.filter((item) => item.status !== "cancelled").reduce((sum, item) => sum + item.convertedAmount, 0);
  const byId = new Map(trip.participants.map((person) => [person.id, person]));
  const expenseFilterKey = (expense: (typeof trip.expenses)[number]) =>
    expense.categoryLabel ? `custom:${expense.categoryLabel}` : expense.category;
  const categoryFilters = Array.from(
    new Map(trip.expenses.map((expense) => [
      expenseFilterKey(expense),
      expense.categoryLabel ?? categoryLabels[expense.category] ?? expense.category,
    ])).entries(),
  );
  const visibleExpenses = [...trip.expenses]
    .filter((expense) =>
      selectedFilter === "all"
      || (selectedFilter === "cancelled"
        ? expense.status === "cancelled"
        : expenseFilterKey(expense) === selectedFilter))
    .sort((first, second) =>
      second.createdAt.localeCompare(first.createdAt)
      || second.date.localeCompare(first.date),
    );
  const activeFilterLabel = selectedFilter === "all"
    ? undefined
    : selectedFilter === "cancelled"
      ? "Anulados"
      : categoryFilters.find(([value]) => value === selectedFilter)?.[1];

  return (
    <>
      <PageHeader eyebrow={trip.name} title="Gastos" />
      <section className="expense-summary">
        <p>Total del viaje</p>
        <strong>{formatUsd(spent)}</strong>
        <div className="summary-badges">
          <span><Icon name="receipt" size={16} /> {trip.expenses.filter((item) => item.status !== "cancelled").length} gastos</span>
          <span><Icon name="users" size={16} /> {trip.participants.length} personas</span>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><h2>Quién debe a quién</h2></div></div>
        <div className="settlements-card">
          {settlements.map((settlement) => {
            const fromParticipant = byId.get(settlement.fromParticipantId);
            const toParticipant = byId.get(settlement.toParticipantId);
            if (!fromParticipant || !toParticipant) return null;
            return <div className="settlement-row" key={`${settlement.fromParticipantId}-${settlement.toParticipantId}`}>
              <div className="settlement-people" aria-hidden="true">
                <ParticipantAvatar participant={fromParticipant} className="mini-avatar" />
                <Icon name="chevronRight" size={17} />
                <ParticipantAvatar participant={toParticipant} className="mini-avatar" />
              </div>
              <div className="settlement-copy">
                <p><strong>{fromParticipant.name}</strong> le debe a <strong>{toParticipant.name}</strong></p>
                <b>{formatUsd(settlement.amount)}</b>
              </div>
            </div>
          })}
          {settlements.length === 0 && (
            <div className="settlements-empty">
              <Icon name="check" size={24} weight="Filled" />
              <div><strong>Todos están al día</strong><p>No hay saldos pendientes entre integrantes.</p></div>
            </div>
          )}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><h2>Por persona</h2></div></div>
        <div className="balance-grid">
          {balances.map((balance) => (
            <article key={balance.participant.id}>
              <ParticipantAvatar participant={balance.participant} className="mini-avatar" />
              <div>
                <strong>{balance.participant.name}</strong>
              </div>
              <b>{formatUsd(balance.paid)}</b>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">Movimientos</p><h2>Historial de gastos</h2></div>
          <Button variant="secondary" size="small" onClick={() => setFiltersOpen((open) => !open)}>
            {activeFilterLabel ?? "Filtrar"}
          </Button>
        </div>
        {filtersOpen && (
          <div className="filter-row expense-filter-row" aria-label="Filtrar historial de gastos">
            <button className={selectedFilter === "all" ? "active" : ""} onClick={() => setSelectedFilter("all")}>Todos</button>
            {categoryFilters.map(([value, label]) => (
              <button className={selectedFilter === value ? "active" : ""} onClick={() => setSelectedFilter(value)} key={value}>
                {label}
              </button>
            ))}
            {trip.expenses.some((expense) => expense.status === "cancelled") && (
              <button className={selectedFilter === "cancelled" ? "active" : ""} onClick={() => setSelectedFilter("cancelled")}>Anulados</button>
            )}
          </div>
        )}
        <div className="card-stack">
          {visibleExpenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} payer={byId.get(expense.paidBy)} onEdit={() => navigate(`/viaje/${trip.id}/editar/expense/${expense.id}`)} />
          ))}
          {visibleExpenses.length === 0 && <p className="no-results">No hay gastos que coincidan con este filtro.</p>}
        </div>
      </section>
    </>
  );
}
