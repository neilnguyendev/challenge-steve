import { describe, expect, it } from "vitest";

import { parseSaveError } from "./save-error";

describe("pointing a refusal at the box that caused it", () => {
  it("reads the day and the field out of the message", () => {
    expect(
      parseSaveError("2026-08-14: Labour cost must be greater than or equal to 0"),
    ).toEqual({
      date: "2026-08-14",
      field: "labour_cost",
      message: "Labour cost must be greater than or equal to 0",
    });
  });

  it("recognises every column the editor shows", () => {
    const cases = [
      ["Pos revenue must be greater than or equal to 0", "pos_revenue"],
      ["Eatclub revenue must be greater than or equal to 0", "eatclub_revenue"],
      ["Labour cost must be greater than or equal to 0", "labour_cost"],
      ["Covers must be greater than or equal to 0", "covers"],
    ] as const;

    for (const [detail, field] of cases) {
      expect(parseSaveError(`2026-08-11: ${detail}`)?.field).toBe(field);
    }
  });

  it("keeps the message as a banner when it names no field", () => {
    // Falling back is the point: an unrecognised shape must still be shown,
    // never swallowed because it did not parse.
    expect(
      parseSaveError("these dates fall outside the week beginning 2026-08-10"),
    ).toBeNull();
    expect(parseSaveError("Unauthorized")).toBeNull();
    expect(parseSaveError("2026-08-14: something unfamiliar happened")).toBeNull();
  });
});
