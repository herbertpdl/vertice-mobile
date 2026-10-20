import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { colors, textPresets, textStyle, type TextVariant } from "@/theme";

import { Text } from "./Text";

function styleOf(text: string) {
  return StyleSheet.flatten(screen.getByText(text).props.style);
}

describe("textStyle", () => {
  it.each(Object.keys(textPresets) as TextVariant[])(
    "%s resolves to a loaded family, its size, and a points line height",
    (variant) => {
      const preset: { size: number; lineHeight?: number; letterSpacing?: number } =
        textPresets[variant];
      const style = textStyle(variant);
      expect(style.fontFamily).toMatch(/^(Inter|SpaceGrotesk)_[5-7]00|^Inter_400Regular$/);
      expect(style.fontSize).toBe(preset.size);
      expect(style.fontWeight).toBeUndefined();
      expect(style.lineHeight).toBe(
        preset.lineHeight === undefined ? undefined : Math.round(preset.size * preset.lineHeight),
      );
      expect(style.letterSpacing).toBe(preset.letterSpacing);
    },
  );

  it("never uses Space Grotesk 400, which is not loaded", () => {
    for (const variant of Object.keys(textPresets) as TextVariant[]) {
      expect(textStyle(variant).fontFamily).not.toBe("SpaceGrotesk_400Regular");
    }
  });
});

describe("Text", () => {
  it("defaults to the body preset in the primary text color", async () => {
    await render(<Text>Olá</Text>);
    expect(styleOf("Olá")).toMatchObject({
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: colors.textPrimary,
    });
  });

  it("selects the weight by font family and never sets fontWeight", async () => {
    await render(
      <Text variant="title" color="primary">
        Alunos
      </Text>,
    );
    const style = styleOf("Alunos");
    expect(style).toMatchObject({
      fontFamily: "SpaceGrotesk_700Bold",
      fontSize: 26,
      color: colors.primary,
    });
    expect(style.fontWeight).toBeUndefined();
  });

  it("overrides the weight within the preset's family", async () => {
    await render(
      <>
        <Text variant="body" weight="semibold">
          Ver todos
        </Text>
        <Text variant="headingSm" weight="semibold">
          Outubro 2026
        </Text>
      </>,
    );
    expect(styleOf("Ver todos").fontFamily).toBe("Inter_600SemiBold");
    expect(styleOf("Outubro 2026").fontFamily).toBe("SpaceGrotesk_600SemiBold");
  });

  it("keeps the copy's own case and applies tracking", async () => {
    await render(
      <>
        <Text variant="micro">Início</Text>
        <Text variant="overline">PERÍODO</Text>
      </>,
    );
    expect(styleOf("Início").textTransform).toBeUndefined();
    expect(styleOf("PERÍODO")).toMatchObject({ fontSize: 12, letterSpacing: 0.5 });
  });

  it("aligns, and applies `style` last", async () => {
    await render(
      <Text align="center" style={{ marginTop: 8, textAlign: "right" }}>
        Centro
      </Text>,
    );
    expect(styleOf("Centro")).toMatchObject({ marginTop: 8, textAlign: "right" });
  });
});
