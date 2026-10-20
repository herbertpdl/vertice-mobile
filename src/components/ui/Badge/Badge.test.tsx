import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { colors } from "@/theme";

import { Badge, CountPill, Tag } from "./Badge";

describe("Badge", () => {
  it.each([
    ["neutral", colors.surfaceHover, colors.textSecondary],
    ["success", "#2ed5731f", colors.success],
    ["warning", "#ffb0201f", colors.warning],
    ["danger", "#ff5c5c1f", colors.danger],
    ["info", "#4da6ff1f", colors.info],
    ["outline", "transparent", colors.textSecondary],
  ] as const)("%s: fill %s, label %s (the design's values)", async (tone, fill, label) => {
    await render(<Badge label="Ativo" tone={tone} />);
    const text = screen.getByText("Ativo");
    expect(StyleSheet.flatten(text.props.style).color).toBe(label);
    expect(StyleSheet.flatten(screen.root?.props.style).backgroundColor).toBe(fill);
  });
});

describe("CountPill", () => {
  it("renders the count with a spoken label", async () => {
    await render(<CountPill count={6} accessibilityLabel="6 feedbacks" />);
    expect(screen.getByLabelText("6 feedbacks")).toBeOnTheScreen();
    expect(screen.getByText("6")).toBeOnTheScreen();
  });
});

describe("Tag", () => {
  it("is static without onRemove and a remove button with it", async () => {
    const onRemove = jest.fn();
    const { rerender } = await render(<Tag label="Peito" />);
    expect(screen.queryByRole("button")).toBeNull();
    await rerender(<Tag label="Peito" onRemove={onRemove} />);
    await fireEvent.press(screen.getByRole("button", { name: "Remover Peito" }));
    expect(onRemove).toHaveBeenCalled();
  });
});
