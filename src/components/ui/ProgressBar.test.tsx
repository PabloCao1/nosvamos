import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("exposes its value to assistive technologies", () => {
    render(<ProgressBar value={78} label="Planificación completada" />);
    expect(screen.getByRole("progressbar", { name: "Planificación completada" })).toHaveAttribute("aria-valuenow", "78");
  });

  it("clamps invalid visual values", () => {
    render(<ProgressBar value={140} label="Presupuesto" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});
