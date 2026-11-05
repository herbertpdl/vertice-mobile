import { fireEvent, render, screen } from "@testing-library/react-native";

import { Text } from "@/components/ui/Text";
import { sizes, space } from "@/theme";

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

  /** The rendered tree as text (a `refreshControl` element can't be serialized). */
  const tree = () => JSON.stringify(screen.toJSON(), (key, value) => (key === "refreshControl" ? "RefreshControl" : value));

  it("keeps a focused field clear of the keyboard bar", async () => {
    await render(<Screen>{null}</Screen>);
    expect(tree()).toContain(`"bottomOffset":${sizes.keyboardBarHeight + space[4]}`);
  });

  it("keeps a focused field clear of the footer too, once measured", async () => {
    await render(<Screen footer={<Text>Rodapé</Text>}>{null}</Screen>);
    await fireEvent(screen.getByText("Rodapé"), "layout", { nativeEvent: { layout: { height: 100 } } });
    // The footer's bottom padding (the 16 pt minimum here) sinks behind the bar.
    expect(tree()).toContain(`"bottomOffset":${sizes.keyboardBarHeight + 100 - space[4] + space[4]}`);
  });

  it("still pulls to refresh", async () => {
    await render(<Screen onRefresh={jest.fn()}>{null}</Screen>);
    expect(tree()).toContain("RefreshControl");
  });

  it("leaves a screen that manages its own list without the aware scroll view", async () => {
    await render(<Screen scroll={false}>{null}</Screen>);
    expect(tree()).not.toContain("bottomOffset");
  });
});
