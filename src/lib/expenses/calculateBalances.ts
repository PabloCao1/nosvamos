import type { Expense, Participant, Settlement } from "../../types/domain";

export interface ParticipantBalance {
  participant: Participant;
  paid: number;
  consumed: number;
  net: number;
}

export function calculateBalances(
  participants: Participant[],
  expenses: Expense[],
): ParticipantBalance[] {
  const totals = new Map(participants.map((participant) => [
    participant.id,
    { paid: 0, consumed: 0 },
  ]));

  for (const expense of expenses.filter((item) => item.status !== "cancelled")) {
    const payer = totals.get(expense.paidBy);
    if (payer) payer.paid += expense.convertedAmount;
    for (const split of expense.splits) {
      const participant = totals.get(split.participantId);
      if (participant) participant.consumed += split.amount;
    }
  }

  return participants.map((participant) => {
    const value = totals.get(participant.id) ?? { paid: 0, consumed: 0 };
    return {
      participant,
      paid: value.paid,
      consumed: value.consumed,
      net: value.paid - value.consumed,
    };
  });
}

export function calculateSettlements(
  participants: Participant[],
  expenses: Expense[],
): Settlement[] {
  const balances = calculateBalances(participants, expenses);
  const debtors = balances.filter((item) => item.net < -0.005).map((item) => ({ ...item })).sort((a, b) => a.net - b.net);
  const creditors = balances.filter((item) => item.net > 0.005).map((item) => ({ ...item })).sort((a, b) => b.net - a.net);
  const settlements: Settlement[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(-debtor.net, creditor.net);
    settlements.push({
      fromParticipantId: debtor.participant.id,
      toParticipantId: creditor.participant.id,
      amount: Math.round(amount * 100) / 100,
    });
    debtor.net += amount;
    creditor.net -= amount;
    if (Math.abs(debtor.net) < 0.005) debtorIndex += 1;
    if (Math.abs(creditor.net) < 0.005) creditorIndex += 1;
  }

  return settlements;
}
