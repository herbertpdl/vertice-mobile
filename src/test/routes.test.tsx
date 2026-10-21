/**
 * The route tree as files: every route in `src/app` resolves at the URL the screens link to
 * (static segments win over `[id]`, groups don't show in the URL), and every route file has a
 * case here. Screens and layouts are stubbed — this is about the tree, not the screens, so
 * `Stack.Protected` and query parameters are covered by the screen tests, not here.
 */
import { screen } from "@testing-library/react-native";
import { Slot, usePathname, useSegments } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { Text } from "react-native";

// Kept outside `src/app`: Expo Router would bundle a test file there as a route.
const APP = join(__dirname, "..", "app");

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return routeFiles(path);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [relative(APP, path).replace(/\.tsx$/, "")] : [];
  });
}

function Probe() {
  const pathname = usePathname();
  const segments = useSegments();
  return <Text>{`${pathname} -> ${segments.join("/")}`}</Text>;
}

const routes = Object.fromEntries(routeFiles(APP).map((file) => [file, file.endsWith("_layout") ? () => <Slot /> : Probe]));

const cases: [string, string][] = [
  ["/", "(app)/(tabs)"],
  ["/alunos", "(app)/(tabs)/alunos"],
  ["/exercicios", "(app)/(tabs)/exercicios"],
  ["/perfil", "(app)/(tabs)/perfil"],
  ["/alunos/7", "(app)/alunos/[id]"],
  ["/exercicios/novo", "(app)/exercicios/novo"],
  ["/exercicios/4", "(app)/exercicios/[id]"],
  ["/exercicios/4/editar", "(app)/exercicios/[id]/editar"],
  ["/planos/novo", "(app)/planos/novo"],
  ["/planos/3", "(app)/planos/[id]"],
  ["/planos/3/editar", "(app)/planos/[id]/editar"],
  ["/planos/3/treinos/novo", "(app)/planos/[id]/treinos/novo"],
  ["/treinos/5", "(app)/treinos/[id]"],
  ["/perfil/senha", "(app)/perfil/senha"],
  ["/perfil/excluir-conta", "(app)/perfil/excluir-conta"],
  ["/feedbacks", "(app)/feedbacks"],
  ["/login", "login"],
  ["/cadastro", "cadastro"],
];

/** Route files no case above needs to open (the kit gallery is dev-only). */
const UNCOVERED = new Set(["(dev)/kit"]);

describe("route tree", () => {
  it("has a case for every route file, so a new route can't go unchecked", () => {
    const opened = new Set(cases.map(([, segments]) => segments));
    const files = routeFiles(APP)
      .filter((file) => !file.endsWith("_layout") && !UNCOVERED.has(file))
      .map((file) => file.replace(/\/index$/, "").replace(/^index$/, ""));
    expect(files.filter((file) => !opened.has(file))).toEqual([]);
  });

  it.each(cases)("%s opens %s", async (url, segments) => {
    await renderRouter(routes, { initialUrl: url });
    expect(screen.getByText(`${url} -> ${segments}`)).toBeOnTheScreen();
  });
});
