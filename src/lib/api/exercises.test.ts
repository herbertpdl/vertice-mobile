import { mockBff, type BffMock } from "@/test/bff";

import { exerciseSearch, fetchAllExercises } from "./exercises";

let bff: BffMock;
afterEach(() => bff?.restore());

const row = (id: number) => ({ id, name: `E${id}`, description: "", videoUrl: "", muscleGroups: [], isStarter: true });

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

describe("fetchAllExercises", () => {
  it("follows nextCursor until the last page, 50 at a time", async () => {
    const searches: string[] = [];
    bff = mockBff({
      "GET /api/exercises": ({ url }) => {
        searches.push(url.search);
        return Response.json(
          url.searchParams.get("cursor") === "50"
            ? { exercises: [row(3)], nextCursor: null }
            : { exercises: [row(1), row(2)], nextCursor: "50" },
        );
      },
    });

    const all = await fetchAllExercises();

    expect(all.map((e) => e.id)).toEqual([1, 2, 3]);
    expect(searches).toEqual(["?limit=50", "?cursor=50&limit=50"]);
  });
});
