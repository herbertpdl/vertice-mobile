/**
 * The role guard in `(app)/_layout`: the real layout over stub screens, `useSessionGate` mocked to
 * a ready session of each role. Each role must land on its own home from `/`, and a client's link
 * to a trainer route must fall back to the client app (and the other way round).
 */
import { screen } from "@testing-library/react-native";
import { Slot, usePathname } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Text } from "react-native";

import AppLayout from "@/app/(app)/_layout";

let mockRole: "TRAINER" | "CLIENT" = "TRAINER";
jest.mock("@/lib/auth", () => ({
  useAuth: () => ({ signOut: jest.fn() }),
  useSessionGate: () => ({ kind: "ready", me: { role: mockRole } }),
}));

function Probe() {
  return <Text>{`at ${usePathname()}`}</Text>;
}

const routes = {
  _layout: () => <Slot />,
  "(app)/_layout": AppLayout,
  "(app)/(tabs)/_layout": () => <Slot />,
  "(app)/(tabs)/index": Probe,
  "(app)/alunos/[id]": Probe,
  "(app)/planos/[id]/editar": Probe,
  "(app)/feedbacks": Probe,
  "(app)/perfil/senha": Probe,
  "(app)/aluno/_layout": () => <Slot />,
  "(app)/aluno/(tabs)/_layout": () => <Slot />,
  "(app)/aluno/(tabs)/index": Probe,
  "(app)/aluno/planos/[id]": Probe,
};

async function landOn(role: typeof mockRole, initialUrl: string) {
  mockRole = role;
  await renderRouter(routes, { initialUrl });
  return (await screen.findByText(/^at /)).props.children as string;
}

describe("role routing", () => {
  it("lands a trainer on the trainer app", async () => {
    expect(await landOn("TRAINER", "/")).toBe("at /");
  });

  it("lands a client on the client app", async () => {
    expect(await landOn("CLIENT", "/")).toBe("at /aluno");
  });

  it("sends a client's link to a trainer screen to the client app", async () => {
    expect(await landOn("CLIENT", "/alunos/7")).toBe("at /aluno");
    expect(await landOn("CLIENT", "/planos/3/editar")).toBe("at /aluno");
  });

  it("sends a trainer's link to the client app back to the trainer app", async () => {
    expect(await landOn("TRAINER", "/aluno")).toBe("at /");
  });

  it("keeps the shared account screens open to a client", async () => {
    expect(await landOn("CLIENT", "/perfil/senha")).toBe("at /perfil/senha");
  });
});
