import * as Sentry from "@sentry/react-native";
import type { Breadcrumb, ErrorEvent } from "@sentry/react-native";

import { env } from "@/lib/env";

/**
 * Crash and error reporting (Sentry), with the app's data kept out of it (audit P2-05 step 5).
 * The app holds students' names, e-mails, CPFs, training loads and feedback: none of it may
 * leave the device in a report. So reports carry no user, no request bodies or headers, no
 * screenshots or view hierarchy, no touch/console breadcrumbs, URLs without their query string,
 * and every string is scrubbed of e-mails, CPFs and bearer tokens before it's sent.
 *
 * Limits: native crashes and hangs are sent by the native SDKs without going through these hooks
 * (hang tracking is off for that reason), and a name inside an error message can't be told apart
 * from any other word. Both are covered server-side: the Sentry project must have Advanced Data
 * Scrubbing rules for e-mails, CPFs and `http.query`, and "Prevent storing IP addresses" on
 * (spec PR 14, owner checklist).
 */

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const BEARER = /Bearer\s+[\w.~+/=-]+/gi;
const JWT = /\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g;

/** A string with personal data and credentials replaced. */
export function scrubText(text: string): string {
  return text.replace(BEARER, "Bearer [token]").replace(JWT, "[token]").replace(EMAIL, "[email]").replace(CPF, "[cpf]");
}

/** A URL without its query string or fragment (a search term is a student's name). */
export function scrubUrl(url: string): string {
  return scrubText(url.split(/[?#]/)[0]);
}

/** Every string inside `value`, at any depth, scrubbed (cycles are cut, not followed). */
function scrubDeep<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value === "string") return scrubText(value) as T;
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[cycle]" as T;
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => scrubDeep(item, seen)) as T;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, scrubDeep(item, seen)])) as T;
}

/**
 * `beforeSend`: no user, no request payloads, breadcrumbs reduced (native ones arrive here without
 * having been through `beforeBreadcrumb`), and every string left in the event scrubbed.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const { user: _user, request, breadcrumbs, ...rest } = event;
  const scrubbed: ErrorEvent = scrubDeep(rest);
  if (request) scrubbed.request = { url: request.url && scrubUrl(request.url), method: request.method };
  if (breadcrumbs) scrubbed.breadcrumbs = breadcrumbs.map(scrubBreadcrumb).filter((b): b is Breadcrumb => b !== null);
  return scrubbed;
}

const DROPPED_CATEGORIES = new Set(["touch", "ui.click", "ui.input", "console", "navigation.params"]);

/** Breadcrumb data that may be kept: where, how and the outcome — never a query, body or label. */
const KEPT_DATA = new Set(["url", "method", "status_code", "to", "from", "reason"]);
const URL_DATA = new Set(["url", "to", "from"]);

/** `beforeBreadcrumb`: no touches (they carry labels: names), no console; data reduced to an allowlist. */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category !== undefined && DROPPED_CATEGORIES.has(breadcrumb.category)) return null;
  const data =
    breadcrumb.data === undefined
      ? undefined
      : Object.fromEntries(
          Object.entries(breadcrumb.data)
            .filter(([key]) => KEPT_DATA.has(key))
            .map(([key, value]) => [key, typeof value === "string" ? (URL_DATA.has(key) ? scrubUrl(value) : scrubText(value)) : value]),
        );
  return { ...breadcrumb, message: breadcrumb.message === undefined ? undefined : scrubText(breadcrumb.message), data };
}

/** Release builds with a DSN report; a development build or one without a DSN reports nothing. */
const enabled = !__DEV__ && env.EXPO_PUBLIC_SENTRY_DSN !== undefined;

/** Starts Sentry (when `enabled`). Called once, at module scope, by the root layout. */
export function initMonitoring() {
  if (!enabled) return;
  Sentry.init({
    dsn: env.EXPO_PUBLIC_SENTRY_DSN,
    environment: env.EXPO_PUBLIC_APP_ENV,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableUserInteractionTracing: false,
    // No performance data: no `tracesSampleRate` (even 0 turns tracing on), no auto tracing, and
    // no app-hang events (native, so they skip the scrubbers above).
    enableAutoPerformanceTracing: false,
    enableAppHangTracking: false,
    maxBreadcrumbs: 50,
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSend: scrubEvent,
  });
}

/** Reports an error a boundary caught (render errors don't reach the global handler). */
export function reportError(error: unknown) {
  if (!enabled) return;
  Sentry.captureException(error);
}
