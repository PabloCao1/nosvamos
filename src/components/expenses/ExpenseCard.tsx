import type { Expense, Participant } from "../../types/domain";
import { Icon } from "../ui/Icon";

export function ExpenseCard({
  expense,
  payer,
  onEdit,
}: {
  expense: Expense;
  payer?: Participant;
  onEdit?: () => void;
}) {
  return (
    <button className={`expense-card ${expense.status === "cancelled" ? "cancelled" : ""}`} onClick={onEdit} disabled={!onEdit} aria-label={onEdit ? `Editar ${expense.description}` : undefined}>
      <span className={`expense-icon expense-${expense.category}`}>
        <Icon name={expense.category === "transport" ? "airplane" : expense.category === "lodging" ? "bed" : "receipt"} size={20} />
      </span>
      <div>
        <h3>{expense.description}</h3>
        <p>{expense.categoryLabel ?? ""}{expense.categoryLabel ? " · " : ""}Pagó {payer?.name ?? "Participante"} · {new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(new Date(`${expense.date}T12:00:00`))}</p>
      </div>
      <div className="expense-amount">
        {expense.receiptImageDataUrl && <img src={expense.receiptImageDataUrl} alt="Comprobante" />}
        {expense.status === "cancelled" && <small>Anulado</small>}
        <strong>{new Intl.NumberFormat("es-AR", { style: "currency", currency: expense.originalCurrency, maximumFractionDigits: 0 }).format(expense.originalAmount)}</strong>
      </div>
    </button>
  );
}
