import type { Exercise } from "@/lib/api/types";

import { MAX_EXERCISES, MAX_SETS, emptyWorkout, type EditorWorkout } from "./model";
import { reduce } from "./reducer";

const exercise = (id: number): Exercise => ({ id, name: `Ex ${id}`, description: "", videoUrl: "", isStarter: false, muscleGroups: [] });

function withExercises(count: number): EditorWorkout {
  let draft = emptyWorkout("MONDAY");
  for (let i = 1; i <= count; i++) draft = reduce(draft, { type: "addExercise", exercise: exercise(i) });
  return draft;
}

describe("reduce", () => {
  it("returns the same object for a no-op, so nothing re-renders or turns dirty", () => {
    const draft = emptyWorkout("MONDAY");
    expect(reduce(draft, { type: "setName", name: "" })).toBe(draft);
    expect(reduce(draft, { type: "setDayOfWeek", dayOfWeek: "MONDAY" })).toBe(draft);
    expect(reduce(draft, { type: "removeExercise", exerciseKey: "nope" })).toBe(draft);
  });

  it("stops adding exercises at the cap", () => {
    const full = withExercises(MAX_EXERCISES);
    expect(reduce(full, { type: "addExercise", exercise: exercise(99) })).toBe(full);
  });

  it("moves an exercise to an insertion index (down by one is index + 2)", () => {
    const draft = withExercises(3);
    const [a, b, c] = draft.exercises;
    const down = reduce(draft, { type: "moveExercise", exerciseKey: a.key, toIndex: 2 });
    expect(down.exercises.map((we) => we.key)).toEqual([b.key, a.key, c.key]);
    const up = reduce(draft, { type: "moveExercise", exerciseKey: c.key, toIndex: 1 });
    expect(up.exercises.map((we) => we.key)).toEqual([a.key, c.key, b.key]);
  });

  it("adds, duplicates (as new, right after) and removes sets, capped at 10", () => {
    let draft = withExercises(1);
    const key = draft.exercises[0].key;
    draft = reduce(draft, { type: "addSet", exerciseKey: key });
    const setKey = draft.exercises[0].sets[0].key;
    draft = reduce(draft, { type: "updateSet", exerciseKey: key, setKey, patch: { reps: 12 } });
    draft = reduce(draft, { type: "duplicateSet", exerciseKey: key, setKey });
    expect(draft.exercises[0].sets.map((s) => s.reps)).toEqual([12, 12]);
    expect(draft.exercises[0].sets[1]).toMatchObject({ id: null });
    expect(draft.exercises[0].sets[1].key).not.toBe(setKey);
    draft = reduce(draft, { type: "removeSet", exerciseKey: key, setKey });
    expect(draft.exercises[0].sets).toHaveLength(1);
    for (let i = 0; i < 20; i++) draft = reduce(draft, { type: "addSet", exerciseKey: key });
    expect(draft.exercises[0].sets).toHaveLength(MAX_SETS);
  });
});
