import { fireEvent, render, screen } from "@testing-library/react-native";

import { SegmentedTabs } from "./SegmentedTabs";

describe("SegmentedTabs", () => {
  it("selects a tab and speaks the count", async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedTabs
        value="plans"
        onChange={onChange}
        tabs={[
          { key: "plans", label: "Planos" },
          { key: "feedback", label: "Feedbacks", count: 6 },
          { key: "progress", label: "Progresso", count: 0 },
        ]}
      />,
    );
    expect(screen.getByRole("tab", { name: "Planos" })).toBeSelected();
    expect(screen.queryByText("0")).toBeNull();
    await fireEvent.press(screen.getByRole("tab", { name: "Feedbacks, 6" }));
    expect(onChange).toHaveBeenCalledWith("feedback");
  });
});
