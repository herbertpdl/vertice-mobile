import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { todayLocalIso } from "@/lib/format";
import { colors } from "@/theme";

import { Calendar } from "./Calendar";

jest.mock("@/lib/format", () => ({
  ...jest.requireActual("@/lib/format"),
  todayLocalIso: jest.fn(() => "2026-10-20"),
}));

const day = (name: RegExp) => screen.getByRole("button", { name });
const textColor = (label: string) =>
  StyleSheet.flatten(screen.getAllByText(label).at(-1)!.props.style).color;

describe("Calendar", () => {
  it("starts each row on Sunday: October 2026's first row runs 27/09 to 03/10", async () => {
    await render(<Calendar value="2026-10-24" onChange={() => {}} />);
    expect(day(/^Domingo, 27 de set de 2026/)).toBeOnTheScreen();
    expect(day(/^Sábado, 03 de out de 2026/)).toBeOnTheScreen();
  });

  it("marks the selected day and today, and dims other months", async () => {
    await render(<Calendar value="2026-10-24" onChange={() => {}} />);
    expect(day(/24 de out de 2026$/)).toBeSelected();
    expect(day(/20 de out de 2026, hoje$/)).not.toBeSelected();
    expect(textColor("24")).toBe(colors.primaryText);
    expect(textColor("27")).toBe(colors.textPrimary); // 27/10, in the month
    expect(StyleSheet.flatten(screen.getAllByText("27")[0].props.style).color).toBe(colors.textTertiary); // 27/09
    expect(jest.mocked(todayLocalIso)).toHaveBeenCalled();
  });

  it("returns the business date of the tapped day", async () => {
    const onChange = jest.fn();
    await render(<Calendar value={null} onChange={onChange} />);
    await fireEvent.press(day(/31 de out de 2026$/));
    expect(onChange).toHaveBeenCalledWith("2026-10-31");
  });

  it("disables days and paging past the bounds", async () => {
    await render(<Calendar value="2026-10-24" min="2026-10-05" max="2026-10-31" onChange={() => {}} />);
    expect(day(/04 de out de 2026$/)).toBeDisabled();
    expect(day(/05 de out de 2026$/)).toBeEnabled();
    expect(day(/01 de nov de 2026$/)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mês anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Próximo mês" })).toBeDisabled();
  });

  it("pages between months", async () => {
    await render(<Calendar value="2026-12-24" onChange={() => {}} />);
    await fireEvent.press(screen.getByRole("button", { name: "Próximo mês" }));
    expect(screen.getByText("Janeiro 2027")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Mês anterior" }));
    await fireEvent.press(screen.getByRole("button", { name: "Mês anterior" }));
    expect(screen.getByText("Novembro 2026")).toBeOnTheScreen();
  });
});
