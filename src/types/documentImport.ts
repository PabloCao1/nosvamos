export interface DocumentImportDraft {
  attachment?: {
    dataUrl: string;
    fileName: string;
    mimeType: string;
    size: number;
  };
  kind: "flight" | "hotel" | "apartment" | "car" | "train" | "bus" | "ferry" | "expense" | "other";
  title: string | null;
  providerName: string | null;
  providerReference: string | null;
  confirmationCode: string | null;
  startAt: string | null;
  endAt: string | null;
  city: string | null;
  country: string | null;
  originCity: string | null;
  destinationCity: string | null;
  originPlace: string | null;
  destinationPlace: string | null;
  serviceNumber: string | null;
  address: string | null;
  amount: number | null;
  currency: string | null;
  paid: boolean | null;
  expenseCategory: "transport" | "lodging" | "food" | "activities" | "shopping" | "insurance" | "other" | null;
  expenseDate: string | null;
  confidence: number;
}
