/**
 * This app's pt-BR labels for the contract's enums — the one hand-written label file per client
 * (plan item P2-01 / XREPO-013): the transport types are generated (`src/lib/api/schema.ts`), the
 * user-facing words are not, and they are deliberately not shared with `vertice-web-react`.
 *
 * Every map is keyed by the generated enum, so a member added or renamed in vertice-bff's spec
 * fails `npm run typecheck` here until it has a label. The ported validation schemas
 * (`src/lib/validation/*`) carry no labels of their own: forms read these. The wording matches the web app's
 * (`src/lib/days.ts`, `src/lib/validation/*.ts`) so the two products read the same.
 */
import type { components } from "@/lib/api/schema";

type DayOfWeek = components["schemas"]["DayOfWeek"];
type PlanLevel = components["schemas"]["PlanLevel"];
type Role = components["schemas"]["Role"];
type SetStrategy = components["schemas"]["SetStrategy"];

/** Monday first, as the week is shown. */
export const DAY_ORDER: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

/**
 * Sunday first: the column order of the date picker's month grid (`monthGrid` in `calendar.ts`,
 * whose test pins the two together).
 */
export const CALENDAR_DAY_ORDER: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

/** One letter per day, for the calendar header and the roster's week dots. */
export const DAY_INITIAL: Record<DayOfWeek, string> = {
  MONDAY: "S",
  TUESDAY: "T",
  WEDNESDAY: "Q",
  THURSDAY: "Q",
  FRIDAY: "S",
  SATURDAY: "S",
  SUNDAY: "D",
};

export const DAY_NAMES: Record<DayOfWeek, string> = {
  MONDAY: "Segunda",
  TUESDAY: "Terça",
  WEDNESDAY: "Quarta",
  THURSDAY: "Quinta",
  FRIDAY: "Sexta",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

/** Three letters, for a weekday strip where the full name does not fit. */
export const DAY_ABBR: Record<DayOfWeek, string> = {
  MONDAY: "SEG",
  TUESDAY: "TER",
  WEDNESDAY: "QUA",
  THURSDAY: "QUI",
  FRIDAY: "SEX",
  SATURDAY: "SAB",
  SUNDAY: "DOM",
};

export const PLAN_LEVELS: Record<PlanLevel, string> = {
  BEGINNER: "Iniciante",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado",
};

export const SET_STRATEGIES: Record<SetStrategy, string> = {
  STRAIGHT: "Direta",
  WARM_UP: "Aquecimento",
  BACKOFF: "Backoff",
  DROPSET: "Dropset",
  REST_PAUSE: "Rest-Pause",
  CLUSTER: "Cluster",
  AMRAP: "AMRAP",
  ISOMETRIC_HOLD: "Isometria",
  FAILURE: "Falha",
};

export const ROLES: Record<Role, string> = {
  ADMIN: "Administrador(a)",
  TRAINER: "Treinador(a)",
  CLIENT: "Aluno(a)",
};

/**
 * How a client rates a finished workout (the client app's feedback step). Local until vertice-bff
 * ships the rating enum on feedback; then this becomes `components["schemas"]["FeedbackRating"]`
 * and the map below keeps compiling only if the members match.
 */
export type FeedbackRating = "VERY_HARD" | "HARD" | "JUST_RIGHT" | "EASY" | "VERY_EASY";

/** Hardest first, as the scale is shown. */
export const RATING_ORDER: FeedbackRating[] = ["VERY_HARD", "HARD", "JUST_RIGHT", "EASY", "VERY_EASY"];

export const RATINGS: Record<FeedbackRating, string> = {
  VERY_HARD: "Muito difícil",
  HARD: "Difícil",
  JUST_RIGHT: "Na medida",
  EASY: "Fácil",
  VERY_EASY: "Muito fácil",
};
