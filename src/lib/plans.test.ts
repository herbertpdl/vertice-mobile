import { planStatus, planStatusLabels, sortPlans, activePlan } from "./plans";

/** 22:00 on Sunday 2026-10-18 in São Paulo (-03:00), which is already Monday in UTC. */
const SUNDAY_EVENING = new Date("2026-10-19T01:00:00Z");

afterEach(() => {
  jest.useRealTimers();
});

describe("planStatus", () => {
  it("is scheduled before the plan starts and completed after it ends", () => {
    expect(planStatus("2026-11-01", "2026-11-30", "2026-10-31")).toBe("scheduled");
    expect(planStatus("2026-11-01", "2026-11-30", "2026-12-01")).toBe("completed");
  });

  it("includes both end dates: a plan is active on its first and last day", () => {
    expect(planStatus("2026-11-01", "2026-11-30", "2026-11-01")).toBe("active");
    expect(planStatus("2026-11-01", "2026-11-30", "2026-11-30")).toBe("active");
  });

  it("is still active late on the evening of the last day", () => {
    // The UTC day is the Monday by now, and a plan ending on the Sunday would have read
    // "Encerrado" to a trainer still looking at Sunday evening (XREPO-006).
    jest.useFakeTimers();
    jest.setSystemTime(SUNDAY_EVENING);
    expect(planStatus("2026-10-01", "2026-10-18")).toBe("active");
    expect(planStatus("2026-10-19", "2026-11-19")).toBe("scheduled");
  });
});

describe("planStatusLabels", () => {
  it("names every status in pt-BR", () => {
    expect(planStatusLabels).toEqual({
      scheduled: "Agendado",
      active: "Ativo",
      completed: "Encerrado",
    });
  });
});

describe("sortPlans", () => {
  it("puts the active plan first, then scheduled soonest, then finished most recent", () => {
    const plans = [
      { name: "old", startDate: "2025-10-07", endDate: "2025-12-20" },
      { name: "next", startDate: "2026-12-01", endDate: "2027-01-31" },
      { name: "recent", startDate: "2026-01-06", endDate: "2026-02-28" },
      { name: "active", startDate: "2026-09-01", endDate: "2026-11-24" },
      { name: "later", startDate: "2027-02-01", endDate: "2027-03-01" },
    ];
    expect(sortPlans(plans, "2026-10-21").map((p) => p.name)).toEqual(["active", "next", "later", "recent", "old"]);
  });
});

describe("activePlan", () => {
  const plan = (id: number, startDate: string, endDate: string) => ({ id, startDate, endDate });

  it("is the plan whose dates include today, the latest started on overlap", () => {
    const plans = [plan(1, "2026-09-01", "2026-11-30"), plan(2, "2026-10-01", "2026-12-31"), plan(3, "2026-12-01", "2027-02-28")];
    expect(activePlan(plans, "2026-10-22")?.id).toBe(2);
    expect(activePlan(plans, "2026-09-15")?.id).toBe(1);
  });

  it("includes both ends and is undefined between plans", () => {
    expect(activePlan([plan(1, "2026-10-22", "2026-10-22")], "2026-10-22")?.id).toBe(1);
    expect(activePlan([plan(1, "2026-09-01", "2026-09-30")], "2026-10-22")).toBeUndefined();
  });
});
