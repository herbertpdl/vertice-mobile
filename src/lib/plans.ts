import { todayLocalIso } from "@/lib/format";

/**
 * Where a training plan sits relative to today. The BFF doesn't answer a status field — it answers
 * the two business dates — so this is the one place that derives it, and `planStatusLabels` the one
 * place that names it in pt-BR (one label map per concept, keyed by the union it labels).
 */
export type PlanStatus = "scheduled" | "active" | "completed";

export const planStatusLabels: Record<PlanStatus, string> = {
  scheduled: "Agendado",
  active: "Ativo",
  // "Encerrado" on mobile (pen.dev mobile screens); the web says "Concluído". Labels are per app.
  completed: "Encerrado",
};

/**
 * `startDate`, `endDate` and `today` are business dates (`yyyy-MM-dd`), which compare and sort as
 * plain strings — no `Date` anywhere, so nothing can drift into the host's time zone. Both ends are
 * inclusive: a plan is active on its last day. "Today" is the business day (`todayLocalIso`), not
 * the UTC one, which from 21:00 local would have called a plan ending today "Encerrado" while the
 * trainer was still looking at Friday evening.
 */
export function planStatus(
  startDate: string,
  endDate: string,
  today: string = todayLocalIso(),
): PlanStatus {
  if (today < startDate) return "scheduled";
  if (today > endDate) return "completed";
  return "active";
}

/** The status badge's tone per status (pen.dev: Ativo = success, Agendado = info, Encerrado = neutral). */
export const planStatusTone = {
  active: "success",
  scheduled: "info",
  completed: "neutral",
} as const satisfies Record<PlanStatus, "success" | "info" | "neutral">;

type DatedPlan = { startDate: string; endDate: string };

/**
 * A student's plans as the Planos tab lists them: active first, then scheduled (soonest first),
 * then finished (most recent first). Business-date string comparisons only.
 */
export function sortPlans<P extends DatedPlan>(plans: P[], today: string = todayLocalIso()): P[] {
  const rank: Record<PlanStatus, number> = { active: 0, scheduled: 1, completed: 2 };
  return [...plans].sort((a, b) => {
    const sa = planStatus(a.startDate, a.endDate, today);
    const sb = planStatus(b.startDate, b.endDate, today);
    if (sa !== sb) return rank[sa] - rank[sb];
    if (sa === "scheduled") return a.startDate.localeCompare(b.startDate);
    return b.endDate.localeCompare(a.endDate);
  });
}

/**
 * A client's current plan (PRD R1, R2): the one whose dates include today; when several do, the one
 * that started last. `undefined` when none runs today.
 */
export function activePlan<P extends DatedPlan>(plans: P[], today: string = todayLocalIso()): P | undefined {
  return plans
    .filter((plan) => planStatus(plan.startDate, plan.endDate, today) === "active")
    .reduce<P | undefined>((latest, plan) => (latest === undefined || plan.startDate > latest.startDate ? plan : latest), undefined);
}
