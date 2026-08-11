export const BASE_CURRENCY = "USD";

export const SUPPORTED_CURRENCIES = [
  ["USD", "Dólar estadounidense"],
  ["EUR", "Euro"],
  ["ARS", "Peso argentino"],
  ["BRL", "Real brasileño"],
  ["GBP", "Libra esterlina"],
  ["CLP", "Peso chileno"],
  ["UYU", "Peso uruguayo"],
  ["MXN", "Peso mexicano"],
  ["CAD", "Dólar canadiense"],
  ["AUD", "Dólar australiano"],
  ["CHF", "Franco suizo"],
  ["JPY", "Yen japonés"],
] as const;

interface FrankfurterRate {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

export interface ConversionResult {
  amount: number;
  rate: number;
  rateDate: string;
  source: "live" | "cache" | "identity";
}

const cacheKey = (currency: string) => `brujula:fx:${currency}:USD`;

export async function convertToUsd(
  amount: number,
  currency: string,
  signal?: AbortSignal,
): Promise<ConversionResult> {
  const normalized = currency.toUpperCase();
  if (normalized === BASE_CURRENCY) {
    return {
      amount: Math.round(amount * 100) / 100,
      rate: 1,
      rateDate: new Date().toISOString().slice(0, 10),
      source: "identity",
    };
  }

  try {
    const response = await fetch(
      `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(normalized)}/USD`,
      { signal },
    );
    if (!response.ok) throw new Error("Cotización no disponible");
    const data = (await response.json()) as FrankfurterRate;
    if (!Number.isFinite(data.rate) || data.rate <= 0) throw new Error("Cotización inválida");
    localStorage.setItem(cacheKey(normalized), JSON.stringify(data));
    return {
      amount: Math.round(amount * data.rate * 100) / 100,
      rate: data.rate,
      rateDate: data.date,
      source: "live",
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    const cached = localStorage.getItem(cacheKey(normalized));
    if (!cached) throw new Error(`No pudimos obtener la cotización ${normalized}/USD.`);
    const data = JSON.parse(cached) as FrankfurterRate;
    return {
      amount: Math.round(amount * data.rate * 100) / 100,
      rate: data.rate,
      rateDate: data.date,
      source: "cache",
    };
  }
}

export const formatUsd = (amount: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: BASE_CURRENCY,
    maximumFractionDigits: 2,
  }).format(amount);
