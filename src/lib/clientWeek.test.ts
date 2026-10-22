import type { Workout, WorkoutLog } from "@/lib/api/types";

import { clientWeek, finishedCount, homeAction, inProgressLog } from "./clientWeek";

const w = (id: number, dayOfWeek: Workout["dayOfWeek"]): Workout => ({ id, name: `Treino ${id}`, trainingPlanId: 1, dayOfWeek });
const log = (workoutId: number, completedAt = "", startedAt = "2026-10-19T10:00:00Z"): WorkoutLog => ({
  id: workoutId * 10,
  workoutId,
  clientId: 7,
  weekStartDate: "2026-10-19",
  startedAt,
  completedAt,
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

  it("ignores logs that were started and not finished", () => {
    expect(clientWeek(workouts, [log(3)], "2026-10-19", "2026-10-21")[3].state).toBe("pending");
    expect(finishedCount(workouts, [log(3), log(1, "2026-10-19T11:00:00Z")])).toBe(1);
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
