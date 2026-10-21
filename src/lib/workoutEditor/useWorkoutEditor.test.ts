import { act, renderHook } from "@testing-library/react-native";

import type { Exercise, FullWorkout } from "@/lib/api/types";
import { clearDrafts, peekDraft } from "@/lib/draftStash";

import type { AutosaveTransport } from "./autosave";
import { emptyWorkout, type EditorWorkout } from "./model";
import { editorStashKey, useWorkoutEditor } from "./useWorkoutEditor";

const supino: Exercise = { id: 1, name: "Supino Reto", description: "", videoUrl: "", isStarter: true, muscleGroups: [] };

function deferredTransport() {
  let resolveCreate: (full: FullWorkout) => void = () => {};
  const transport = {
    create: jest.fn(() => new Promise<FullWorkout>((resolve) => (resolveCreate = resolve))),
  } as unknown as AutosaveTransport;
  return { transport, resolveCreate: (full: FullWorkout) => resolveCreate(full) };
}

beforeEach(() => clearDrafts());

describe("useWorkoutEditor's draft stash", () => {
  it("stashes an unmounted dirty draft under the id its in-flight create got, not as new", async () => {
    const { transport, resolveCreate } = deferredTransport();
    const { result, unmount } = await renderHook(() =>
      useWorkoutEditor({ planId: 7, workoutId: null, initial: emptyWorkout("MONDAY"), userId: 1, transport }),
    );
    let saving: Promise<boolean> = Promise.resolve(true);
    await act(async () => {
      result.current.engine.dispatch({ type: "addExercise", exercise: supino });
      saving = result.current.engine.finish();
      result.current.engine.dispatch({ type: "setName", name: "Treino C" });
    });
    await unmount();
    expect(peekDraft(editorStashKey(1, 7, null))).toBeUndefined();

    await act(async () => {
      resolveCreate({ id: 9, name: "Novo treino", trainingPlanId: 7, dayOfWeek: "MONDAY", exercises: [{ id: 90, workoutId: 9, exerciseId: 1, order: 1, restSecondsBetweenSets: 60, notes: "", exercise: supino, sets: [] }] });
      await saving;
    });
    expect(peekDraft(editorStashKey(1, 7, null))).toBeUndefined();
    const stashed = peekDraft<EditorWorkout>(editorStashKey(1, 7, 9));
    expect(stashed?.name).toBe("Treino C");
    expect(stashed?.exercises[0].id).toBe(90);
  });

  it("stashes nothing when the trainer left on purpose", async () => {
    const { transport } = deferredTransport();
    const { result, unmount } = await renderHook(() =>
      useWorkoutEditor({ planId: 7, workoutId: null, initial: emptyWorkout("MONDAY"), userId: 1, transport }),
    );
    await act(async () => {
      result.current.engine.dispatch({ type: "setName", name: "Treino C" });
      result.current.markLeft();
    });
    expect(result.current.isLeaving()).toBe(true);
    await unmount();
    expect(peekDraft(editorStashKey(1, 7, null))).toBeUndefined();
  });
});
