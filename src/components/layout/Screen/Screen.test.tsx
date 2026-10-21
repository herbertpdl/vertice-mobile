import { render, screen } from "@testing-library/react-native";

import { Text } from "@/components/ui/Text";

import { Screen } from "./Screen";

describe("Screen", () => {
  it("renders header, content and footer", async () => {
    await render(
      <Screen header={<Text>Topo</Text>} footer={<Text>Rodapé</Text>}>
        <Text>Conteúdo</Text>
      </Screen>,
    );
    expect(screen.getByText("Topo")).toBeOnTheScreen();
    expect(screen.getByText("Conteúdo")).toBeOnTheScreen();
    expect(screen.getByText("Rodapé")).toBeOnTheScreen();
  });
});
