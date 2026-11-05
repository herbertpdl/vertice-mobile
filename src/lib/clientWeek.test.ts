import type { Workout, WorkoutLog } from "@/lib/api/types";

import { clientWeek, homeAction, inProgressLog, weekProgress } from "./clientWeek";

const w = (id: number, dayOfWeek: Workout["dayOfWeek"]): Workout => ({ id, name: `Treino ${id}`, trainingPlanId: 1, dayOfWeek });
const log = (workoutId: number, completedAt = "", startedAt = "2026-10-19T10:00:00Z"): WorkoutLog => ({
  id: workoutId * 10,
  workoutId,
  clientId: 7,
  weekStartDate: "2026-10-19",
  startedAt,
  completedAt,
  status: completedAt === "" ? "IN_PROGRESS" : "COMPLETED",
  completionKind: completedAt === "" ? "" : "CLIENT",
});

const workouts = [w(1, "MONDAY"), w(2, "WEDNESDAY"), w(3, "THURSDAY"), w(4, "FRIDAY")];
const counts = new Map([
  [1, 5],
  [2, 6],
  [3, 6],
  [4, 0],
]);

describe("clientWeek", () => {
  it("marks done, today, pending and rest days, Monday first", () => {
    const week = clientWeek(workouts, [log(1, "2026-10-19T11:00:00Z")], "2026-10-19", "2026-10-21");
    expect(week.map((d) => [d.day, d.date, d.state])).toEqual([
      ["MONDAY", "2026-10-19", "done"],
      ["TUESDAY", "2026-10-20", "rest"],
      ["WEDNESDAY", "2026-10-21", "today"],
      ["THURSDAY", "2026-10-22", "pending"],
      ["FRIDAY", "2026-10-23", "pending"],
      ["SATURDAY", "2026-10-24", "rest"],
      ["SUNDAY", "2026-10-25", "rest"],
    ]);
  });

  it("calls a rest day today 'today', and a finished today 'done'", () => {
    expect(clientWeek(workouts, [], "2026-10-19", "2026-10-20")[1].state).toBe("today");
    expect(clientWeek(workouts, [log(2, "2026-10-21T11:00:00Z")], "2026-10-19", "2026-10-21")[2].state).toBe("done");
  });

  it("marks the day the workout was done on, not the weekday it belongs to", () => {
    // Monday's workout, done on Friday (São Paulo) — Friday is done, Monday isn't.
    const week = clientWeek(workouts, [log(1, "2026-10-23T21:00:00Z", "2026-10-23T20:00:00Z")], "2026-10-19", "2026-10-23");
    expect(week[0].state).toBe("pending");
    expect(week[4].state).toBe("done");
    // Wednesday's workout, done on Saturday — a rest day turns done.
    expect(clientWeek(workouts, [log(2, "2026-10-24T13:00:00Z")], "2026-10-19", "2026-10-25")[5].state).toBe("done");
  });

  it("dates a finish by São Paulo's calendar", () => {
    // 01:30 UTC on Tuesday is still Monday 22:30 in São Paulo.
    const week = clientWeek(workouts, [log(1, "2026-10-20T01:30:00Z")], "2026-10-19", "2026-10-21");
    expect(week[0].state).toBe("done");
    expect(week[1].state).toBe("rest");
  });

  it("dates a rollover-closed session by the day it was started", () => {
    const auto: WorkoutLog = { ...log(3, "2026-10-26T03:00:00Z", "2026-10-22T10:00:00Z"), completionKind: "AUTO" };
    expect(clientWeek(workouts, [auto], "2026-10-19", "2026-10-25")[3].state).toBe("done");
  });

  it("ignores logs that were started and not finished", () => {
    expect(clientWeek(workouts, [log(3)], "2026-10-19", "2026-10-21")[3].state).toBe("pending");
  });
});

describe("weekProgress", () => {
  const progress = (plan: Workout[], logs: WorkoutLog[]) => weekProgress(plan, clientWeek(plan, logs, "2026-10-19", "2026-10-23"));

  it("counts days, not workouts: two on one day are one day", () => {
    expect(progress(workouts, [log(1, "2026-10-19T11:00:00Z"), log(2, "2026-10-19T12:00:00Z")])).toEqual({ done: 1, total: 4 });
  });

  it("counts every day trained, whichever workout it was", () => {
    const redo = { ...log(1, "2026-10-21T11:00:00Z"), id: 11 };
    expect(progress(workouts, [log(1, "2026-10-19T11:00:00Z"), redo])).toEqual({ done: 2, total: 4 });
  });

  it("takes workouts sharing a weekday as one training day", () => {
    expect(progress([w(1, "MONDAY"), w(2, "MONDAY"), w(3, "FRIDAY")], [])).toEqual({ done: 0, total: 2 });
  });

  it("ignores a session not finished", () => {
    expect(progress(workouts, [log(3), log(1, "2026-10-19T11:00:00Z")])).toEqual({ done: 1, total: 4 });
  });

  it("raises the total when the client trains more days than the plan has", () => {
    const plan = [w(1, "MONDAY")];
    expect(progress(plan, [log(1, "2026-10-19T11:00:00Z"), { ...log(1, "2026-10-20T11:00:00Z"), id: 11 }])).toEqual({ done: 2, total: 2 });
  });
});

describe("inProgressLog", () => {
  it("is the latest started, unfinished log", () => {
    expect(inProgressLog([log(1, "x"), log(2, "", "2026-10-19T09:00:00Z"), log(3, "", "2026-10-20T09:00:00Z")])?.workoutId).toBe(3);
    expect(inProgressLog([log(1, "2026-10-19T11:00:00Z")])).toBeUndefined();
  });
});

describe("homeAction", () => {
  it("continues a session in progress first", () => {
    expect(homeAction(workouts, [log(3)], "2026-10-21", counts)).toMatchObject({ kind: "continue", log: { workoutId: 3 } });
  });

  it("starts today's single workout", () => {
    expect(homeAction(workouts, [], "2026-10-21", counts)).toMatchObject({ kind: "start", workout: { id: 2 } });
  });

  it("offers another workout when today's is finished", () => {
    expect(homeAction(workouts, [log(2, "2026-10-21T11:00:00Z")], "2026-10-21", counts)).toMatchObject({ kind: "done" });
  });

  it("opens the picker with no workout today", () => {
    expect(homeAction(workouts, [], "2026-10-20", counts)).toEqual({ kind: "pick", today: [] });
  });

  it("opens the picker limited to today's when there are several", () => {
    const two = [...workouts, w(5, "WEDNESDAY")];
    const action = homeAction(two, [], "2026-10-21", counts);
    expect(action.kind).toBe("pick");
    expect(action.kind === "pick" && action.today.map((x) => x.id)).toEqual([2, 5]);
  });

  it("doesn't start a workout with no exercises", () => {
    expect(homeAction(workouts, [], "2026-10-23", counts)).toMatchObject({ kind: "pick" });
  });

  it("is empty when the plan has no workouts", () => {
    expect(homeAction([], [], "2026-10-21", counts)).toEqual({ kind: "empty" });
  });
});
