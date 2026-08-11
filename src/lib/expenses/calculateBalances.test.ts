import { describe, expect, it } from "vitest";
import type { Expense, Participant } from "../../types/domain";
import { calculateBalances, calculateSettlements } from "./calculateBalances";

describe("shared expense balances", () => {
  it("settles correctly with four participants and different splits", () => {
    const participants = ["Ana", "Beto", "Carla", "Damián"].map((name, index): Participant => ({
      id: `person-${index}`,
      name,
      initials: name.slice(0, 1),
      color: "#456",
      role: index === 0 ? "owner" : "member",
      status: "active",
    }));
    const syncable = {
      clientId: "test",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      version: 1,
      syncStatus: "synced" as const,
    };
    const expense = (
      id: string,
      amount: number,
      paidBy: string,
      splits: Expense["splits"],
    ): Expense => ({
      ...syncable,
      id,
      tripId: "multi-person-trip",
      description: id,
      category: "other",
      originalAmount: amount,
      originalCurrency: "USD",
      exchangeRate: 1,
      convertedAmount: amount,
      paidBy,
      splits,
      date: "2026-01-01",
      status: "active",
    });
    const expenses = [
      expense("shared-by-four", 120, participants[0].id, participants.map((person) => ({
        participantId: person.id,
        amount: 30,
      }))),
      expense("shared-by-two", 60, participants[1].id, [
        { participantId: participants[1].id, amount: 30 },
        { participantId: participants[2].id, amount: 30 },
      ]),
      expense("another-pair", 40, participants[2].id, [
        { participantId: participants[2].id, amount: 20 },
        { participantId: participants[3].id, amount: 20 },
      ]),
    ];

    const balances = calculateBalances(participants, expenses);
    const settlements = calculateSettlements(participants, expenses);

    expect(balances.map((item) => item.net)).toEqual([90, 0, -40, -50]);
    expect(settlements).toEqual([
      { fromParticipantId: participants[3].id, toParticipantId: participants[0].id, amount: 50 },
      { fromParticipantId: participants[2].id, toParticipantId: participants[0].id, amount: 40 },
    ]);
    expect(settlements.reduce((total, item) => total + item.amount, 0)).toBe(90);
  });
});
