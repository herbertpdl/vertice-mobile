import { env } from "@/lib/env";

type Handler = (request: { body: unknown; url: URL; headers: Record<string, string> }) => Response | Promise<Response>;

export type BffRoutes = Record<string, Handler | Response | object>;

export type BffMock = {
  /** Every request the app sent, in order: `"POST /api/auth/login"` plus its parsed JSON body. */
  calls: { route: string; body: unknown; headers: Record<string, string> }[];
  restore: () => void;
};

const realFetch = global.fetch;

/**
 * Replaces `fetch` with a table of BFF routes for screen tests: keys are `"METHOD /path"` (no
 * query string); a value is a handler, a `Response`, or a plain object answered as JSON 200.
 * An unmatched request fails the test with a 404 naming the route, so a screen calling something
 * unexpected is caught. Call `restore()` in `afterEach`.
 */
export function mockBff(routes: BffRoutes): BffMock {
  const calls: BffMock["calls"] = [];
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const path = url.href.startsWith(env.EXPO_PUBLIC_BFF_URL) ? url.pathname : url.href;
    const route = `${init?.method ?? "GET"} ${path}`;
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ route, body, headers });
    if (!(route in routes)) {
      return Response.json({ error: { code: "NOT_FOUND", message: `unmocked ${route}` } }, { status: 404 });
    }
    const answer = routes[route];
    if (answer instanceof Response) return answer.clone();
    if (typeof answer === "function") return (answer as Handler)({ body, url, headers });
    return Response.json(answer);
  }) as typeof fetch;
  return { calls, restore: () => (global.fetch = realFetch) };
}

/** A BFF error response: `{ error: { code, message } }` with `status`. */
export function bffError(status: number, code: string, headers?: Record<string, string>): Response {
  return Response.json({ error: { code, message: code } }, { status, headers });
}
