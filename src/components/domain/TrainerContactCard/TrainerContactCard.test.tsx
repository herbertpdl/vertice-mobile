import { fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";

import { ToastProvider } from "@/components/ui";

import { TrainerContactCard, trainerContacts } from "./TrainerContactCard";

const trainer = { name: "Rafael Lima", email: "rafael@vertice.fit", whatsapp: "11987654321", instagram: "rafael.treina" };

describe("trainerContacts", () => {
  it("links each shown contact out, and leaves the hidden ones out", () => {
    expect(trainerContacts(trainer).map((c) => [c.label, c.url])).toEqual([
      ["rafael@vertice.fit", "mailto:rafael@vertice.fit"],
      ["WhatsApp · (11) 98765-4321", "https://wa.me/5511987654321"],
      ["@rafael.treina", "https://instagram.com/rafael.treina"],
    ]);
    expect(trainerContacts({ ...trainer, email: "", instagram: "" }).map((c) => c.key)).toEqual(["whatsapp"]);
  });
});

describe("TrainerContactCard", () => {
  it("shows the name always and opens a contact", async () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await render(
      <ToastProvider>
        <TrainerContactCard trainer={{ ...trainer, email: "", instagram: "" }} />
      </ToastProvider>,
    );
    expect(screen.getByText("Rafael Lima")).toBeOnTheScreen();
    expect(screen.queryByRole("link", { name: "rafael@vertice.fit" })).toBeNull();
    await fireEvent.press(screen.getByRole("link", { name: "WhatsApp · (11) 98765-4321" }));
    expect(openURL).toHaveBeenCalledWith("https://wa.me/5511987654321");
    openURL.mockRestore();
  });
});
