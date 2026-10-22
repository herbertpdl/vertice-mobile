import { render, screen } from "@testing-library/react-native";

import { WeekStrip, weekStripSummary, type WeekStripDay } from "./WeekStrip";

const days: WeekStripDay[] = [
  { label: "SEG", dayNumber: "20", name: "Segunda", state: "done" },
  { label: "TER", dayNumber: "21", name: "Terça", state: "rest" },
  { label: "QUA", dayNumber: "22", name: "Quarta", state: "today" },
  { label: "QUI", dayNumber: "23", name: "Quinta", state: "pending" },
];

describe("WeekStrip", () => {
  it("reads the week as one sentence", async () => {
    await render(<WeekStrip days={days} />);
    expect(
      screen.getByLabelText("Esta semana: Segunda concluído, Terça descanso, Quarta hoje, Quinta pendente"),
    ).toBeOnTheScreen();
  });

  it("shows a check instead of the number on a done day", async () => {
    await render(<WeekStrip days={days} />);
    expect(screen.queryByText("20")).toBeNull();
    expect(screen.getByText("22")).toBeOnTheScreen();
  });

  it("summarises", () => {
    expect(weekStripSummary(days.slice(0, 1))).toBe("Esta semana: Segunda concluído");
  });
});
