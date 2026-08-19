import type { Expense } from "../../types/domain";

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

const normalize = (value?: string) => value?.trim().toLocaleLowerCase("es") ?? "";
const participantKey = (expense: Expense) => expense.splits
  .map((split) => split.participantId)
  .sort()
  .join("|");

export function isRecentDuplicateExpense(candidate: Expense, existing: Expense) {
  const createdApart = Math.abs(new Date(candidate.createdAt).getTime() - new Date(existing.createdAt).getTime());
  return candidate.id !== existing.id
    && candidate.tripId === existing.tripId
    && existing.status !== "cancelled"
    && Number.isFinite(createdApart)
    && createdApart <= DUPLICATE_WINDOW_MS
    && normalize(candidate.description) === normalize(existing.description)
    && candidate.originalAmount === existing.originalAmount
    && candidate.originalCurrency === existing.originalCurrency
    && candidate.date === existing.date
    && candidate.paidBy === existing.paidBy
    && candidate.category === existing.category
    && normalize(candidate.categoryLabel) === normalize(existing.categoryLabel)
    && (candidate.reservationId ?? "") === (existing.reservationId ?? "")
    && participantKey(candidate) === participantKey(existing);
}

export function findRecentDuplicateExpense(candidate: Expense, expenses: Expense[]) {
  return expenses.find((existing) => isRecentDuplicateExpense(candidate, existing));
}
