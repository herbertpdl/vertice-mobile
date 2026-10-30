import { mockBff, type BffMock } from "@/test/bff";

import { exerciseSearch, fetchProgressExercises } from "./exercises";

let bff: BffMock;
afterEach(() => bff?.restore());

describe("exerciseSearch", () => {
  it("stays idle with no text and no group, and below 3 letters", () => {
    expect(exerciseSearch("", null)).toEqual({ muscleGroupId: null, q: "", enabled: false });
    expect(exerciseSearch("  su  ", null).enabled).toBe(false);
  });

  it("searches from 3 letters, trimmed", () => {
    expect(exerciseSearch(" sup ", null)).toEqual({ muscleGroupId: null, q: "sup", enabled: true });
  });

  it("a group alone is enough, and drops 1-2 letters rather than sending them", () => {
    expect(exerciseSearch("re", 2)).toEqual({ muscleGroupId: 2, q: "", enabled: true });
    expect(exerciseSearch("rem", 2)).toEqual({ muscleGroupId: 2, q: "rem", enabled: true });
  });
});

describe("fetchProgressExercises", () => {
  it("asks for the student's exercises with progress, one request", async () => {
    const searches: string[] = [];
    bff = mockBff({
      "GET /api/exercises/with-progress": ({ url }) => {
        searches.push(url.search);
        return Response.json([{ id: 9, name: "Supino" }]);
      },
    });

    await expect(fetchProgressExercises(4)).resolves.toEqual([{ id: 9, name: "Supino" }]);
    expect(searches).toEqual(["?clientId=4"]);
  });
});
