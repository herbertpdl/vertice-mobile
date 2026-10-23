import { screen } from "@testing-library/react-native";

import { addDays } from "@/lib/calendar";
import { todayLocalIso } from "@/lib/format";
import { mockBff, type BffMock } from "@/test/bff";
import { renderScreen } from "@/test/render";

import { ProgressSheet, progressDelta } from "./ProgressSheet";

let bff: BffMock;
afterEach(() => bff?.restore());

describe("progressDelta", () => {
  it("is the change from the first week shown to the last, none with one week", () => {
    expect(progressDelta([{ weekStartDate: "2026-10-05", weight: 40 }])).toBeUndefined();
    expect(
      progressDelta([
        { weekStartDate: "2026-10-05", weight: 40 },
        { weekStartDate: "2026-10-19", weight: 47.5 },
      ]),
    ).toEqual({ value: "+7,5 kg", helper: "em 2 semanas" });
    expect(
      progressDelta([
        { weekStartDate: "2026-10-05", weight: 40 },
        { weekStartDate: "2026-10-12", weight: 40 },
      ])?.value,
    ).toBe("0 kg");
  });
});

describe("ProgressSheet", () => {
  it("shows the heaviest weight of the latest week", async () => {
    const today = todayLocalIso();
    bff = mockBff({
      "GET /api/exercises/3/progress": [
        { weekStartDate: addDays(today, -14), weight: 40 },
        { weekStartDate: addDays(today, -7), weight: 42.5 },
      ],
    });
    await renderScreen(<ProgressSheet visible onClose={() => {}} exerciseId={3} exerciseName="Remada" clientId={7} />);
    expect(await screen.findByText("42,5 kg")).toBeOnTheScreen();
    expect(screen.getByText("+2,5 kg")).toBeOnTheScreen();
  });

  it("explains an empty history", async () => {
    bff = mockBff({ "GET /api/exercises/3/progress": [] });
    await renderScreen(<ProgressSheet visible onClose={() => {}} exerciseId={3} exerciseName="Remada" clientId={7} />);
    expect(await screen.findByText("Sem progresso ainda")).toBeOnTheScreen();
  });
});
