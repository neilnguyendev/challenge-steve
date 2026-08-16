import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, fetchVenues } from "./api";

function mockFetch(response: Partial<Response> & { json: () => Promise<unknown> }) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchVenues", () => {
  it("returns the parsed payload on success", async () => {
    mockFetch({
      ok: true,
      status: 200,
      json: async () => ({
        venues: [
          {
            id: 1,
            name: "Harbourside Kitchen",
            timezone: "Australia/Melbourne",
            trading_days_recorded: 21,
          },
        ],
      }),
    });

    const { venues } = await fetchVenues();

    expect(venues).toHaveLength(1);
    expect(venues[0].name).toBe("Harbourside Kitchen");
  });

  it("raises ApiError carrying the message the API sent", async () => {
    mockFetch({
      ok: false,
      status: 404,
      json: async () => ({ error: "Venue not found" }),
    });

    await expect(fetchVenues()).rejects.toThrow(ApiError);
    await expect(fetchVenues()).rejects.toThrow("Venue not found");
  });

  it("falls back to a generic message when the body is not JSON", async () => {
    mockFetch({
      ok: false,
      status: 500,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });

    await expect(fetchVenues()).rejects.toThrow("Request failed with status 500");
  });
});
