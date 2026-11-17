import { ApiError } from "@/lib/api/client";

import { isRenewalDue, RENEWAL_FAILURE_BACKOFF_MS, RENEWAL_INTERVAL_MS, retryNotBefore } from "./renewal";

const NOW = 1_800_000_000_000;

describe("isRenewalDue", () => {
  it("is due a day after the last renewal, not before", () => {
    expect(isRenewalDue(NOW - RENEWAL_INTERVAL_MS + 1, NOW)).toBe(false);
    expect(isRenewalDue(NOW - RENEWAL_INTERVAL_MS, NOW)).toBe(true);
    expect(isRenewalDue(NOW - 89 * RENEWAL_INTERVAL_MS, NOW)).toBe(true);
  });

  it("is due when the clock was set back past the last renewal", () => {
    expect(isRenewalDue(NOW + 1, NOW)).toBe(true);
  });
});

describe("retryNotBefore", () => {
  it("retries on the next trigger when no answer came", () => {
    expect(retryNotBefore(new ApiError({ code: "NETWORK_ERROR", message: "x" }, 0), NOW)).toBe(0);
    expect(retryNotBefore(new ApiError({ code: "TIMEOUT", message: "x" }, 0), NOW)).toBe(0);
    expect(retryNotBefore(new Error("aborted"), NOW)).toBe(0);
  });

  it("waits a 429's Retry-After, and an hour after any other answer", () => {
    expect(retryNotBefore(new ApiError({ code: "RATE_LIMITED", message: "x" }, 429, 120), NOW)).toBe(NOW + 120_000);
    expect(retryNotBefore(new ApiError({ code: "UPSTREAM_UNAVAILABLE", message: "x" }, 503), NOW)).toBe(
      NOW + RENEWAL_FAILURE_BACKOFF_MS,
    );
  });
});
