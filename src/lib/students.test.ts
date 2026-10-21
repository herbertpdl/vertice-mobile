import type { ClientSummary } from "@/lib/api/types";

import { accessLinkExpiry, filterRoster, rosterSubtitle, studentAccessLink } from "./students";

const student = (name: string, plan: string | null): ClientSummary => ({
  id: name.length,
  name,
  activePlanCount: plan === null ? 0 : 1,
  currentPlan: plan === null ? null : { id: 1, name: plan, endDate: "2026-12-01" },
  lastWorkoutAt: null,
  weekActivity: [],
});

const roster = [student("Júlia Prado", "Full Body"), student("Diego Martins", null), student("Marina Costa", "Hipertrofia")];

describe("filterRoster", () => {
  it("filters by plan, like the web's chips", () => {
    expect(filterRoster(roster, "withPlan", "").map((s) => s.name)).toEqual(["Júlia Prado", "Marina Costa"]);
    expect(filterRoster(roster, "withoutPlan", "").map((s) => s.name)).toEqual(["Diego Martins"]);
  });

  it("searches names ignoring case and accents", () => {
    expect(filterRoster(roster, "all", "  JULIA ").map((s) => s.name)).toEqual(["Júlia Prado"]);
    expect(filterRoster(roster, "withPlan", "diego")).toEqual([]);
  });
});

describe("rosterSubtitle", () => {
  it("counts the roster, or the results while narrowed", () => {
    expect(rosterSubtitle(32, 32, false)).toBe("32 alunos cadastrados");
    expect(rosterSubtitle(1, 1, false)).toBe("1 aluno cadastrado");
    expect(rosterSubtitle(32, 0, true)).toBe("0 resultados para a busca");
    expect(rosterSubtitle(32, 1, true)).toBe("1 resultado para a busca");
  });
});

describe("studentAccessLink", () => {
  it("points at the web's set-password page with the token encoded", () => {
    expect(studentAccessLink("a+b/c")).toBe("http://localhost:5173/definir-senha?token=a%2Bb%2Fc");
  });
});

describe("accessLinkExpiry", () => {
  const now = new Date("2026-10-20T17:30:00Z"); // 14:30 in São Paulo
  it("counts business days to the expiry and shows it in São Paulo time", () => {
    expect(accessLinkExpiry({ token: "t", expiresAt: "2026-10-23T17:30:00Z" }, now)).toBe("Expira em 3 dias · 23 de out, 14:30");
    expect(accessLinkExpiry({ token: "t", expiresAt: "2026-10-21T12:00:00Z" }, now)).toBe("Expira amanhã · 21 de out, 09:00");
    expect(accessLinkExpiry({ token: "t", expiresAt: "2026-10-20T23:00:00Z" }, now)).toBe("Expira hoje · 20 de out, 20:00");
    expect(accessLinkExpiry({ token: "t", expiresAt: "2026-10-19T10:00:00Z" }, now)).toBe("Expirado · 19 de out, 07:00");
  });
});
