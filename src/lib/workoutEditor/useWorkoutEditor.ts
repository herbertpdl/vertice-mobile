import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { createExerciseSet, deleteExerciseSet, updateExerciseSet } from "@/lib/api/exerciseSets";
import { addWorkoutExercise, deleteWorkoutExercise, updateWorkoutExercise } from "@/lib/api/workoutExercises";
import { createWorkout, fetchFullWorkout, replaceWorkoutExercises, updateWorkout } from "@/lib/api/workouts";
import { peekDraft, stashDraft, takeDraft } from "@/lib/draftStash";

import { createAutosaveEngine, type AutosaveEngine, type AutosaveState, type AutosaveTransport } from "./autosave";
import { rekeyFrom, type EditorWorkout } from "./model";

/** The real BFF-backed transport; everything goes through `src/lib/api`. */
export const bffTransport: AutosaveTransport = {
  create: createWorkout,
  getFull: (id) => fetchFullWorkout(id),
  replace: replaceWorkoutExercises,
  patchWorkout: updateWorkout,
  addExercise: addWorkoutExercise,
  updateExercise: updateWorkoutExercise,
  deleteExercise: deleteWorkoutExercise,
  addSet: createExerciseSet,
  updateSet: updateExerciseSet,
  deleteSet: deleteExerciseSet,
};

/** The draft stash key of one editor: per user, plan and workout (`new` until it's created). */
export function editorStashKey(userId: number, planId: number, workoutId: number | null) {
  return `workout-editor:${userId}:${planId}:${workoutId ?? "new"}`;
}

type Options = {
  planId: number;
  workoutId: number | null;
  initial: EditorWorkout;
  /** Who is signed in: the draft stash is per user. Unknown → no stash. */
  userId: number | undefined;
  onSaved?: (info: { workoutId: number; created: boolean }) => void;
  transport?: AutosaveTransport;
};

export type WorkoutEditor = {
  state: AutosaveState;
  engine: AutosaveEngine;
  /** The draft was restored from the stash (an expired session unmounted the editor). */
  restored: boolean;
  /** The trainer is leaving on purpose (saved, discarded, deleted): no stash, no leave guard. */
  markLeft: () => void;
  /** `markLeft` was called: the leave guard lets the navigation through, whatever the draft. */
  isLeaving: () => boolean;
};

/**
 * One save engine per editor session, with saving left to the trainer (`delayMs: null`: edits only
 * mark the draft dirty; "Salvar treino" calls `finish`). `initial` is read once, at mount, so a
 * refetch can never overwrite an edit in progress.
 *
 * An expired token signs out, and signing out unmounts every `(app)` screen: an editor unmounted
 * with unsaved changes it wasn't told to drop (`markLeft`) puts its draft in the stash, and the same
 * editor opened again by the same user takes it back (`restored`), re-keyed onto what the server
 * has now. The engine isn't torn down on unmount: a save already in flight completes.
 */
export function useWorkoutEditor({ planId, workoutId, initial, userId, onSaved, transport = bffTransport }: Options): WorkoutEditor {
  const [{ engine, restored }] = useState(() => {
    const created = createAutosaveEngine({ planId, workoutId, initial, transport, delayMs: null, onSaved });
    // Peek, not take: the stash entry is dropped by the mount effect below, so a double-invoked
    // initializer (StrictMode) restores the same draft both times.
    const key = userId === undefined ? null : editorStashKey(userId, planId, workoutId);
    const stashed = key === null ? undefined : peekDraft<EditorWorkout>(key);
    if (stashed !== undefined) {
      created.dispatch({ type: "seed", workout: workoutId === null ? stashed : rekeyFrom(stashed, initial) });
    }
    return { engine: created, restored: created.getState().dirty };
  });

  useEffect(() => {
    engine.setOnSaved(onSaved);
  }, [engine, onSaved]);

  const left = useRef(false);
  useEffect(() => {
    if (userId === undefined) return;
    // This session owns the draft now; whatever the stash held for it was restored above.
    takeDraft(editorStashKey(userId, planId, workoutId));
    return () => {
      if (left.current) return;
      const stash = () => {
        const { dirty, draft, workoutId: savedId } = engine.getState();
        if (dirty) stashDraft(editorStashKey(userId, planId, savedId), draft);
      };
      // A save in flight still lands (the engine outlives the screen): stash what it leaves behind,
      // with the ids it got — stashing now would keep a created workout as "new" and create it twice.
      if (engine.getState().status !== "saving") return stash();
      const unsubscribe = engine.subscribe(() => {
        if (engine.getState().status === "saving") return;
        unsubscribe();
        stash();
      });
    };
  }, [engine, userId, planId, workoutId]);

  const state = useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);
  return {
    state,
    engine,
    restored,
    markLeft: () => {
      left.current = true;
    },
    isLeaving: () => left.current,
  };
}
