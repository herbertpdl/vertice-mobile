import { ApiError } from "@/lib/api/client";

import { shouldRetry } from "./query-client";

const error = (status: number) => new ApiError({ code: "X", message: "x" }, status);

describe("shouldRetry", () => {
  it("never retries a 4xx", () => {
    for (const status of [400, 401, 403, 404, 409, 429]) expect(shouldRetry(0, error(status))).toBe(false);
  });

  it("retries network failures and 5xx once", () => {
    expect(shouldRetry(0, error(0))).toBe(true);
    expect(shouldRetry(0, error(503))).toBe(true);
    expect(shouldRetry(1, error(503))).toBe(false);
    expect(shouldRetry(0, new TypeError("x"))).toBe(true);
  });
});
