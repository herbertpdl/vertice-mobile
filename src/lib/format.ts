/**
 * Display formatting, and with it the business time zone (P2-02, audit XREPO-006 / REL-API-008).
 *
 * The rule is vertice-api's — its
 * [`README.md`](https://github.com/herbertpdl/vertice-api/blob/main/README.md) ("Dates and times")
 * and [`CLAUDE.md`](https://github.com/herbertpdl/vertice-api/blob/main/CLAUDE.md) ("Time: instants
 * vs. business dates") are the source of truth, and
 * [`vertice-bff/docs/api-contract.md`](https://github.com/herbertpdl/vertice-bff/blob/main/docs/api-contract.md)
 * ("Dates and times") restates it for clients. Every date-ish field the BFF answers is one of
 * exactly two kinds, and they are formatted differently:
 *
 * - An **instant** (`createdAt`, `completedAt`, `recordedAt`, `startedAt`, `lastWorkoutAt`,
 *   `expiresAt`, ...) is an absolute point in time, ISO-8601 with `Z`. Format it *in a zone*, with
 *   `Intl` — never read a clock or a calendar day off the string: `completedAt.slice(11, 16)` is
 *   the UTC clock, about three hours ahead of what the trainer's own clock said.
 * - A **business date** (a plan's `startDate`/`endDate`, a log's `weekStartDate`,
 *   `expiringPlans[].end`) is a local calendar day in `America/Sao_Paulo`: `yyyy-MM-dd`, no time
 *   and no zone. `new Date("2026-10-31")` is UTC *midnight*, which renders as 30/10/2026 in
 *   Brazil, so a business date is never put through a UTC conversion. Split it into its three
 *   numbers instead (`civilDay`) and format that with `timeZone: "UTC"`, which is the pairing that
 *   makes the day come out as written in every host zone.
 *
 * "Today" is therefore a business question too: `todayLocalIso()`, never
 * `new Date().toISOString().slice(0, 10)` — that is the UTC day, so it flips at 21:00 local and
 * for the last three hours of every evening says tomorrow.
 *
 * Every formatter here is explicit about its zone, and none of them trusts the host's: this module
 * runs both in the browser (any traveller's zone) and on the server during SSR (usually UTC).
 * `npm run test:hostile-tz` keeps it that way by running the unit suite again under two zones, and
 * it needs both, because each guards one half of the `civilDay` + `timeZone: "UTC"` pairing:
 * `TZ=Pacific/Honolulu` (UTC-10) is the only one that catches a business-date formatter declared
 * without `timeZone: "UTC"` (a civil date at UTC midnight survives any offset *ahead* of UTC), and
 * `TZ=Pacific/Kiritimati` (UTC+14) is the only one that catches `civilDay` built with the
 * local-midnight `new Date(y, m, d)` instead of `Date.UTC` (which goes wrong only ahead of UTC).
 * Either one alone, and CI's own UTC, lets one of the two ship green. There is no fixed `-03:00`
 * anywhere either — Brazil observed DST until 2019, so an instant from before then resolves at
 * `-02:00`, which only the zone's own rules know.
 */

export const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// --- Business dates (`yyyy-MM-dd`) -------------------------------------------------------------
// Each of these formats a `civilDay()` Date, so each one must say `timeZone: "UTC"`.

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
});

const longDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const numericDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const monthYearFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

// --- Instants (ISO-8601 with `Z`) --------------------------------------------------------------
// Each of these resolves an absolute instant in the business zone, so each one must say
// `timeZone: BUSINESS_TIME_ZONE`.

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** `hour12: false` so midnight reads `00:xx`, not some locale's `24:xx`. */
const timeOfDayFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Today's business date, `yyyy-MM-dd` — the calendar day a person in São Paulo is living right
 * now. `formatToParts` rather than a formatted string, so no locale's ordering or separators can
 * get into the result.
 */
const businessDayParts = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayLocalIso(now: Date = new Date()): string {
  const parts = businessDayParts.formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/**
 * A business date as the same civil date at UTC midnight, for the `timeZone: "UTC"` formatters
 * above and for calendar arithmetic. Going through `Date.UTC` keeps it a pure civil-date
 * computation: the three numbers go in and come out, and no zone is consulted.
 */
function civilDay(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** A full timestamp in the business zone, e.g. "16 de out. de 2026, 22:00". */
export function formatDateTime(isoTimestamp: string): string {
  return dateTimeFormatter.format(new Date(isoTimestamp));
}

/** The `HH:MM` clock an instant showed in the business zone, e.g. "22:00". */
export function formatTimeOfDay(isoTimestamp: string): string {
  return timeOfDayFormatter.format(new Date(isoTimestamp));
}

/** A business date without its year, e.g. "31 de out". */
export function formatDateShort(isoDate: string): string {
  return shortDateFormatter.format(civilDay(isoDate)).replace(".", "");
}

/** A business date with its year, e.g. "31 de out de 2026". */
export function formatDateLong(isoDate: string): string {
  return longDateFormatter.format(civilDay(isoDate)).replace(".", "");
}

/** A business date all in digits, e.g. "31/10/2026". */
export function formatDateNumeric(isoDate: string): string {
  return numericDateFormatter.format(civilDay(isoDate));
}

/** The month a business date falls in, as a calendar's header shows it, e.g. "outubro de 2026". */
export function formatMonthYear(isoDate: string): string {
  return monthYearFormatter.format(civilDay(isoDate));
}

/**
 * The calendar header's title, e.g. "Outubro 2026" (M Calendar): the month capitalized, no "de".
 * Built from the same `timeZone: "UTC"` formatter as `formatMonthYear`.
 */
export function formatMonthTitle(isoDate: string): string {
  const text = formatMonthYear(isoDate).replace(" de ", " ");
  return text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1);
}

export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDateShort(startDate)} – ${formatDateLong(endDate)}`;
}

export function formatRelativeTime(isoTimestamp: string): string {
  if (!isoTimestamp) return "";
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes}min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  return `há ${diffDays}d`;
}


/**
 * Whole calendar days from today to a business date (negative once it has passed). Counting
 * between two *dates*, rather than milliseconds from "now" to a midnight, is what keeps
 * "termina em 0 dias" from turning into -1 during the afternoon of the last day — the same
 * change the BFF made to `GET /dashboard`'s `daysLeft`, which is this value computed upstream.
 */
export function daysUntil(isoDate: string, today: string = todayLocalIso()): number {
  return Math.round((civilDay(isoDate).getTime() - civilDay(today).getTime()) / MS_PER_DAY);
}

export function daysLeftLabel(daysLeft: number): string {
  if (daysLeft <= 0) return "vence hoje";
  if (daysLeft === 1) return "1 dia";
  return `${daysLeft} dias`;
}

// --- Mobile-only helpers ---------------------------------------------------------------------

const businessHourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIME_ZONE,
  hour: "2-digit",
  hour12: false,
});

const weekdayShortFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  weekday: "short",
});

/** The dashboard greeting for the business-zone hour: "Bom dia" (< 12), "Boa tarde" (< 18), "Boa noite". */
export function greetingFor(now: Date = new Date()): string {
  // Read the hour from the parts with `hour12: false` (as `timeOfDayFormatter` does), not by
  // parsing the formatted string: some ICUs render midnight as "24".
  const part = businessHourFormatter.formatToParts(now).find((p) => p.type === "hour")?.value ?? "0";
  const hour = Number(part) % 24;
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * A recent instant as the feedback rows show it, counted in business days: today → "07:40"
 * (`"Hoje, 07:40"` with `withDay`), yesterday → "Ontem" (`"Ontem, 19:12"`), within the last
 * week → "Ter" (`"Ter, 18:40"`), older → "24 mai" (`"24 mai, 08:02"`). An empty or invalid
 * instant (the BFF passes a missing proto timestamp through as `""`) gives `""`.
 */
export function formatRecentInstant(
  isoTimestamp: string,
  { withDay = false, now = new Date() }: { withDay?: boolean; now?: Date } = {},
): string {
  const instant = new Date(isoTimestamp);
  if (isoTimestamp === "" || Number.isNaN(instant.getTime())) return "";
  const time = formatTimeOfDay(isoTimestamp);
  const day = todayLocalIso(instant);
  const age = daysUntil(todayLocalIso(now), day);
  let label: string;
  if (age <= 0) return withDay ? `Hoje, ${time}` : time;
  if (age === 1) label = "Ontem";
  else if (age < 7) {
    const weekday = weekdayShortFormatter.format(instant).replace(".", "");
    label = weekday.charAt(0).toLocaleUpperCase("pt-BR") + weekday.slice(1);
  } else label = formatDayMonth(day);
  return withDay ? `${label}, ${time}` : label;
}

/** A business date as the mobile designs write it, without "de": "24 mai". */
export function formatDayMonth(isoDate: string): string {
  return formatDateShort(isoDate).replace(" de ", " ");
}

/**
 * A plan's period as the mobile cards show it: "01 mar – 24 mai", with the end's year only when it
 * isn't the current one ("07 out – 20 dez 2025").
 */
export function formatPlanRange(startDate: string, endDate: string, today: string = todayLocalIso()): string {
  const startYear = startDate.slice(0, 4);
  const endYear = endDate.slice(0, 4);
  if (startYear !== endYear) return formatPlanPeriod(startDate, endDate);
  const suffix = endYear === today.slice(0, 4) ? "" : ` ${endYear}`;
  return `${formatDayMonth(startDate)} – ${formatDayMonth(endDate)}${suffix}`;
}

/**
 * A plan's period with its year, as the plan detail's Info Card shows it: "01 mar – 24 mai 2026",
 * or both years when it crosses one ("01 dez 2026 – 24 fev 2027").
 */
export function formatPlanPeriod(startDate: string, endDate: string): string {
  const startYear = startDate.slice(0, 4);
  const endYear = endDate.slice(0, 4);
  const start = startYear === endYear ? formatDayMonth(startDate) : `${formatDayMonth(startDate)} ${startYear}`;
  return `${start} – ${formatDayMonth(endDate)} ${endYear}`;
}

/** A decimal weight as pt-BR text without trailing zeros: 42.5 → "42,5", 40 → "40". */
export function formatWeight(weight: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(weight);
}

