import { setupLink } from "@/lib/api/students";
import type { ClientSummary, PasswordSetup } from "@/lib/api/types";
import { env } from "@/lib/env";
import { daysUntil, formatDayMonth, formatTimeOfDay, todayLocalIso } from "@/lib/format";

export type RosterFilter = "all" | "withPlan" | "withoutPlan";

export const ROSTER_FILTER_LABELS: Record<RosterFilter, string> = {
  all: "Todos",
  withPlan: "Com plano ativo",
  withoutPlan: "Sem plano",
};

/** Lowercase without accents, so "julia" finds "Júlia". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
}

/** The roster as shown: the filter chip (a current plan or not, like the web), then the name search. */
export function filterRoster(students: ClientSummary[], filter: RosterFilter, query: string): ClientSummary[] {
  const needle = fold(query.trim());
  return students.filter((student) => {
    if (filter === "withPlan" && student.currentPlan === null) return false;
    if (filter === "withoutPlan" && student.currentPlan !== null) return false;
    return needle === "" || fold(student.name).includes(needle);
  });
}

const FILTER_SUBTITLES: Record<Exclude<RosterFilter, "all">, [string, string]> = {
  withPlan: ["aluno com plano ativo", "alunos com plano ativo"],
  withoutPlan: ["aluno sem plano", "alunos sem plano"],
};

/**
 * "32 alunos cadastrados"; "0 resultados para a busca" while searching; "3 alunos sem plano"
 * when only a filter chip narrows the list.
 */
export function rosterSubtitle(total: number, shown: number, filter: RosterFilter, query: string): string {
  if (query.trim() !== "") return `${shown} ${shown === 1 ? "resultado" : "resultados"} para a busca`;
  if (filter !== "all") {
    const [one, many] = FILTER_SUBTITLES[filter];
    return `${shown} ${shown === 1 ? one : many}`;
  }
  return `${total} ${total === 1 ? "aluno cadastrado" : "alunos cadastrados"}`;
}

/** The first-access link a trainer shares: the web's `/definir-senha` page (students set their password there). */
export function studentAccessLink(token: string): string {
  return setupLink(env.EXPO_PUBLIC_WEB_URL, token);
}

/** "Expira em 3 dias · 23 de out, 14:30" — the link's expiry instant, in São Paulo time. */
export function accessLinkExpiry({ expiresAt }: PasswordSetup, now: Date = new Date()): string {
  const day = todayLocalIso(new Date(expiresAt));
  const days = daysUntil(day, todayLocalIso(now));
  const when = `${formatDayMonth(day)}, ${formatTimeOfDay(expiresAt)}`;
  if (new Date(expiresAt).getTime() <= now.getTime()) return `Expirado · ${when}`;
  const relative = days <= 0 ? "Expira hoje" : days === 1 ? "Expira amanhã" : `Expira em ${days} dias`;
  return `${relative} · ${when}`;
}
