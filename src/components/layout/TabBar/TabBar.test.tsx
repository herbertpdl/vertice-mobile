import { fireEvent, render, screen } from "@testing-library/react-native";
import type { BottomTabBarProps } from "expo-router/tabs";
import { House, Users } from "lucide-react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { TabBar, tabScreenBottomPadding } from "./TabBar";

function props(index: number) {
  const navigation = {
    emit: jest.fn(() => ({ defaultPrevented: false })),
    navigate: jest.fn(),
  };
  const routes = [
    { key: "index-1", name: "index", params: undefined },
    { key: "alunos-1", name: "alunos", params: undefined },
  ];
  const descriptors = {
    "index-1": { options: { title: "Início", tabBarIcon: ({ color }: { color: string }) => <House color={color} /> } },
    "alunos-1": { options: { title: "Alunos", tabBarIcon: ({ color }: { color: string }) => <Users color={color} /> } },
  };
  return {
    navigation,
    all: { state: { index, routes }, descriptors, navigation, insets: { top: 0, bottom: 0, left: 0, right: 0 } } as unknown as BottomTabBarProps,
  };
}

describe("TabBar", () => {
  it("marks the focused tab and navigates to another one", async () => {
    const { all, navigation } = props(0);
    await render(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } }}>
        <TabBar {...all} />
      </SafeAreaProvider>,
    );
    expect(screen.getByRole("tab", { name: "Início" })).toBeSelected();
    await fireEvent.press(screen.getByRole("tab", { name: "Alunos" }));
    expect(navigation.emit).toHaveBeenCalledWith(expect.objectContaining({ type: "tabPress", target: "alunos-1" }));
    expect(navigation.navigate).toHaveBeenCalledWith("alunos", undefined);
  });

  it("doesn't navigate to the tab already focused", async () => {
    const { all, navigation } = props(0);
    await render(<TabBar {...all} />);
    await fireEvent.press(screen.getByRole("tab", { name: "Início" }));
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it("insets tab content past the floating capsule", () => {
    expect(tabScreenBottomPadding(34)).toBeGreaterThan(34 + 12 + 69);
  });

  it("leaves out routes hidden with href: null", async () => {
    const { all } = props(0);
    (all.descriptors["alunos-1"].options as { tabBarItemStyle?: object }).tabBarItemStyle = { display: "none" };
    await render(<TabBar {...all} />);
    expect(screen.queryByRole("tab", { name: "Alunos" })).toBeNull();
  });
});
