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

/**
 * What each strategy asks of the client, shown when a set's strategy is opened during a workout
 * (the trainer's own description, the set's `notes`, replaces it). Isometria's names the hold
 * button, which only a timed set has: `strategyDescription` words it for a set with reps.
 */
export const SET_STRATEGY_DESCRIPTIONS: Record<SetStrategy, string> = {
  STRAIGHT: "Série tradicional: faça as repetições indicadas com a mesma carga e descanse normalmente.",
  WARM_UP: "Série leve para preparar músculos e articulações. Use carga baixa e não vá até a falha.",
  BACKOFF: "Feita depois das séries mais pesadas, com carga menor, para somar volume mantendo a boa técnica.",
  DROPSET:
    "Ao terminar as repetições, reduza a carga (cerca de 20–30%) e continue na hora, sem descanso, até não conseguir mais.",
  REST_PAUSE:
    "Vá até perto da falha, descanse de 10 a 20 segundos e continue com a mesma carga por mais algumas repetições.",
  CLUSTER: "Divida a série em blocos curtos de repetições, com pausas de 10 a 30 segundos entre eles, mantendo a carga.",
  AMRAP: "“As many reps as possible”: faça o máximo de repetições que conseguir com boa técnica.",
  ISOMETRIC_HOLD: "Segure a posição parada pelo tempo indicado. Use o botão ▶ para cronometrar.",
  FAILURE: "Faça repetições até não conseguir completar mais nenhuma com boa técnica.",
};

/** Isometria on a set prescribed in reps: no time to hold for, no hold button. */
export const ISOMETRIC_REPS_DESCRIPTION = "Segure a posição parada por alguns segundos em cada repetição, sem mover.";

export const ROLES: Record<Role, string> = {
  ADMIN: "Administrador(a)",
  TRAINER: "Treinador(a)",
  CLIENT: "Aluno(a)",
};

/** How a client rates a finished workout (the client app's feedback step). */
export type FeedbackRating = components["schemas"]["FeedbackRating"];

/** Easiest first, as the scale is shown. */
export const RATING_ORDER: FeedbackRating[] = ["VERY_EASY", "EASY", "JUST_RIGHT", "HARD", "VERY_HARD"];

export const RATINGS: Record<FeedbackRating, string> = {
  VERY_HARD: "Muito difícil",
  HARD: "Difícil",
  JUST_RIGHT: "Na medida",
  EASY: "Fácil",
  VERY_EASY: "Muito fácil",
};
