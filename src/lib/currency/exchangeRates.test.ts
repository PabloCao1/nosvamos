import { afterEach, describe, expect, it, vi } from "vitest";
import { convertToUsd, formatUsd } from "./exchangeRates";

describe("currency conversion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("keeps USD amounts unchanged", async () => {
    await expect(convertToUsd(25, "USD")).resolves.toMatchObject({
      amount: 25,
      rate: 1,
      source: "identity",
    });
  });

  it("converts and caches a live rate", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ date: "2026-07-29", base: "EUR", quote: "USD", rate: 1.17 }),
    }));

    await expect(convertToUsd(100, "EUR")).resolves.toMatchObject({
      amount: 117,
      rate: 1.17,
      source: "live",
    });
    expect(formatUsd(117)).toContain("117");
  });

  it("uses the cached rate while offline", async () => {
    localStorage.setItem(
      "brujula:fx:EUR:USD",
      JSON.stringify({ date: "2026-07-29", base: "EUR", quote: "USD", rate: 1.2 }),
    );
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await expect(convertToUsd(10, "EUR")).resolves.toMatchObject({
      amount: 12,
      source: "cache",
    });
  });
});
