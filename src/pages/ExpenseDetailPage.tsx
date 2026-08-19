import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { ErrorState, LoadingState } from "../components/ui/PageState";
import { EntitySyncStatus } from "../components/sync/EntitySyncStatus";
import { formatUsd } from "../lib/currency/exchangeRates";
import { useTrip } from "../hooks/useTrips";
import { tripRepository } from "../repositories";

const categoryLabels: Record<string, string> = {
  transport: "Transporte", lodging: "Alojamiento", food: "Comida", activities: "Actividades",
  shopping: "Compras", insurance: "Seguro", other: "Otros",
};

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return <div className="event-detail-row"><span>{label}</span><strong>{value}</strong></div>;
}

export function ExpenseDetailPage() {
  const { tripId, expenseId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { data: trip, isLoading, isError, refetch } = useTrip(tripId);
  const expense = trip?.expenses.find((item) => item.id === expenseId);
  const deletion = useMutation({
    mutationFn: () => expense ? tripRepository.deleteExpense(expense) : Promise.reject(new Error("Gasto no encontrado")),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trips"] });
      navigate(`/viaje/${tripId}/gastos`, { replace: true });
    },
  });

  if (isLoading) return <LoadingState />;
  if (isError || !trip || !expense) return <ErrorState onRetry={() => void refetch()} />;

  const payer = trip.participants.find((person) => person.id === expense.paidBy);
  const participants = expense.splits
    .map((split) => trip.participants.find((person) => person.id === split.participantId)?.name)
    .filter((name): name is string => Boolean(name));
  const reservation = trip.reservations.find((item) => item.id === expense.reservationId);
  const formattedDate = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${expense.date}T12:00:00`));
  const originalAmount = new Intl.NumberFormat("es-AR", { style: "currency", currency: expense.originalCurrency })
    .format(expense.originalAmount);

  return <>
    <PageHeader eyebrow={trip.name} title="Detalle del gasto" />
    <section className="event-detail-hero">
      <span className={`event-detail-icon expense-${expense.category}`}><Icon name="receipt" size={28} /></span>
      <div><p>{expense.categoryLabel ?? categoryLabels[expense.category]}</p><h2>{expense.description}</h2></div>
      {expense.status === "cancelled" && <span className="event-status cancelled">Anulado</span>}
    </section>

    <section className="event-detail-section">
      <h2>Movimiento</h2>
      <div className="event-detail-card">
        <DetailRow label="Importe" value={originalAmount} />
        {expense.originalCurrency !== "USD" && <DetailRow label="Equivalente" value={formatUsd(expense.convertedAmount)} />}
        <DetailRow label="Fecha" value={formattedDate} />
        <DetailRow label="PagÃ³" value={payer?.name ?? "Integrante"} />
        <DetailRow label="Dividido entre" value={participants.join(", ")} />
        <DetailRow label="Reserva asociada" value={reservation?.title} />
      </div>
    </section>

    {expense.receiptImageDataUrl && <section className="event-detail-section">
      <h2>Comprobante</h2>
      <button type="button" className="expense-detail-receipt" onClick={() => setPreviewOpen(true)}>
        <img src={expense.receiptImageDataUrl} alt="Comprobante del gasto" />
        <span>Ver imagen completa</span>
      </button>
    </section>}

    <EntitySyncStatus entity={expense} />

    <section className="section-block expense-detail-actions">
      {expense.status !== "cancelled" && <Button variant="primary" icon="edit" fullWidth onClick={() => navigate(`/viaje/${trip.id}/editar/expense/${expense.id}`)}>Editar</Button>}
      {expense.status !== "cancelled" && <Button variant="danger" icon="trash" fullWidth onClick={() => setConfirming(true)}>Anular</Button>}
    </section>

    {previewOpen && expense.receiptImageDataUrl && <div className="receipt-lightbox" role="dialog" aria-modal="true" aria-label="Comprobante del gasto">
      <button type="button" className="receipt-lightbox-backdrop" onClick={() => setPreviewOpen(false)} aria-label="Cerrar comprobante" />
      <div className="receipt-lightbox-content">
        <img src={expense.receiptImageDataUrl} alt="Comprobante del gasto ampliado" />
        <Button variant="secondary" fullWidth onClick={() => setPreviewOpen(false)}>Cerrar</Button>
      </div>
    </div>}

    {confirming && <div className="confirm-layer" role="presentation">
      <button type="button" className="confirm-backdrop" onClick={() => setConfirming(false)} aria-label="Cancelar anulaciÃ³n" />
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cancel-expense-title">
        <div className="confirm-icon">!</div>
        <h2 id="cancel-expense-title">Â¿Anular gasto?</h2>
        <p>SeguirÃ¡ visible en el historial, pero no afectarÃ¡ los balances.</p>
        <div className="confirm-actions">
          <Button variant="secondary" onClick={() => setConfirming(false)}>Cancelar</Button>
          <Button variant="danger" icon="trash" disabled={deletion.isPending} onClick={() => deletion.mutate()}>{deletion.isPending ? "Anulandoâ€¦" : "Anular"}</Button>
        </div>
      </section>
    </div>}
  </>;
}
