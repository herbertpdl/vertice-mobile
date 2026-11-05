import { render, screen } from "@testing-library/react-native";
import { KeyboardAvoidingView } from "react-native";

import { Text } from "@/components/ui/Text";
import { sizes } from "@/theme";

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

  it("keeps a screen's footer clear of the keyboard bar", async () => {
    const avoiding = jest.spyOn(KeyboardAvoidingView.prototype, "render");
    await render(<Screen scroll={false} footer={<Text>Rodapé</Text>}>{null}</Screen>);
    expect((avoiding.mock.contexts[0] as KeyboardAvoidingView).props.keyboardVerticalOffset).toBe(sizes.keyboardBarHeight);
    avoiding.mockRestore();
  });
});
