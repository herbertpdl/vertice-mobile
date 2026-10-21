import * as Sentry from "@sentry/react-native";
import type { Breadcrumb, ErrorEvent } from "@sentry/react-native";

import { env } from "@/lib/env";

/**
 * Crash and error reporting (Sentry), with the app's data kept out of it (audit P2-05 step 5).
 * The app holds students' names, e-mails, CPFs, training loads and feedback: none of it may
 * leave the device in a report. So reports carry no user, no request bodies or headers, no
 * screenshots or view hierarchy, no touch/console breadcrumbs, URLs without their query string,
 * and every string is scrubbed of e-mails, CPFs and bearer tokens before it's sent.
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

function scrubDeep<T>(value: T, depth = 0): T {
  if (typeof value === "string") return scrubText(value) as T;
  if (depth > 6 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => scrubDeep(item, depth + 1)) as T;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, scrubDeep(item, depth + 1)])) as T;
}

/** `beforeSend`: no user, no request payloads, scrubbed messages, stack frames and extras. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const scrubbed: ErrorEvent = { ...event };
  delete scrubbed.user;
  if (scrubbed.request) scrubbed.request = { url: scrubbed.request.url && scrubUrl(scrubbed.request.url), method: scrubbed.request.method };
  if (scrubbed.message) scrubbed.message = scrubText(scrubbed.message);
  if (scrubbed.exception) scrubbed.exception = scrubDeep(scrubbed.exception);
  if (scrubbed.extra) scrubbed.extra = scrubDeep(scrubbed.extra);
  if (scrubbed.contexts) scrubbed.contexts = scrubDeep(scrubbed.contexts);
  if (scrubbed.breadcrumbs) scrubbed.breadcrumbs = scrubbed.breadcrumbs.map(scrubBreadcrumb).filter((b): b is Breadcrumb => b !== null);
  return scrubbed;
}

const DROPPED_CATEGORIES = new Set(["touch", "ui.click", "ui.input", "console", "navigation.params"]);

/** `beforeBreadcrumb`: no touches (they carry labels: names), no console; http without query or bodies. */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category !== undefined && DROPPED_CATEGORIES.has(breadcrumb.category)) return null;
  const data = breadcrumb.data === undefined ? undefined : { ...breadcrumb.data };
  if (data) {
    if (typeof data.url === "string") data.url = scrubUrl(data.url);
    for (const key of ["to", "from"]) if (typeof data[key] === "string") data[key] = scrubUrl(data[key] as string);
    delete data.body;
    delete data.request_body;
    delete data.response_body;
  }
  return { ...breadcrumb, message: breadcrumb.message === undefined ? undefined : scrubText(breadcrumb.message), data };
}

/**
 * Starts Sentry in release builds that have a DSN (`EXPO_PUBLIC_SENTRY_DSN`); a development build
 * or one without a DSN reports nothing. Called once, at module scope, by the root layout.
 */
export function initMonitoring() {
  if (__DEV__ || env.EXPO_PUBLIC_SENTRY_DSN === undefined) return;
  Sentry.init({
    dsn: env.EXPO_PUBLIC_SENTRY_DSN,
    environment: env.EXPO_PUBLIC_APP_ENV,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableUserInteractionTracing: false,
    tracesSampleRate: 0,
    maxBreadcrumbs: 50,
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSend: scrubEvent,
  });
}

/** Reports an error a boundary caught (render errors don't reach the global handler). */
export function reportError(error: unknown) {
  if (__DEV__ || env.EXPO_PUBLIC_SENTRY_DSN === undefined) return;
  Sentry.captureException(error);
}
