import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { colors } from "@/theme";

import { Text } from "./Text";

function styleOf(text: string) {
  return StyleSheet.flatten(screen.getByText(text).props.style);
}

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
      <Text variant="body" weight="semibold">
        Ver todos
      </Text>,
    );
    expect(styleOf("Ver todos").fontFamily).toBe("Inter_600SemiBold");
  });

  it("converts ratio line heights to points and uppercases tracked presets", async () => {
    await render(
      <>
        <Text variant="lead">Entre para gerenciar</Text>
        <Text variant="overline">Período</Text>
      </>,
    );
    expect(styleOf("Entre para gerenciar").lineHeight).toBe(22);
    expect(styleOf("Período")).toMatchObject({ letterSpacing: 1, textTransform: "uppercase" });
  });
});
