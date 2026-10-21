import { render, screen } from "@testing-library/react-native";
import { Calendar, Gauge } from "lucide-react-native";

import { InfoCard } from "./InfoCard";

describe("InfoCard", () => {
  it("reads each row as label: value", async () => {
    await render(
      <InfoCard
        rows={[
          { icon: Calendar, label: "PERÍODO", value: "01 mar – 24 mai 2026" },
          { icon: Gauge, label: "NÍVEL", value: "Intermediário" },
        ]}
      />,
    );
    expect(screen.getByLabelText("PERÍODO: 01 mar – 24 mai 2026")).toBeOnTheScreen();
    expect(screen.getByLabelText("NÍVEL: Intermediário")).toBeOnTheScreen();
  });
});
