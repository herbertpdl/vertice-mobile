import type { z } from "zod";

import type { DayOfWeek, PlanLevel, SetStrategy } from "@/lib/api/types";

import { setStrategySchema } from "./exerciseSets";
import { planLevelSchema } from "./trainingPlans";
import { dayOfWeekSchema } from "./workouts";

/** `true` only when `A` and `B` are the same type (both directions assignable, no `any`). */
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/**
 * The enums the forms validate against are written out by hand (Zod needs the members at
 * runtime; `src/lib/api/schema.ts` is types only). These assertions tie each list to the
 * generated contract union, so a member added, removed or renamed in vertice-bff's OpenAPI
 * document fails `npm run typecheck` (XREPO-013). The `true` annotations are what `tsc` checks;
 * the runtime test only keeps Jest from reporting an empty file.
 */
const dayOfWeek: Equals<z.infer<typeof dayOfWeekSchema>, DayOfWeek> = true;
const setStrategy: Equals<z.infer<typeof setStrategySchema>, SetStrategy> = true;
const planLevel: Equals<z.infer<typeof planLevelSchema>, PlanLevel> = true;

describe("the form enums cover exactly the contract's enums", () => {
  it("is checked by the type checker", () => {
    expect([dayOfWeek, setStrategy, planLevel]).toEqual([true, true, true]);
  });
});
