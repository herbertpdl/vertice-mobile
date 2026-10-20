import { diffTokens, mobileTokens, parseLocalArg, parseRootTokens, stripComments } from "./tokens";

const css = (body: string) => `@import "tailwindcss";\n\n:root {\n${body}\n}\n`;

describe("parseRootTokens", () => {
  it("reads the token declarations of :root, lowercased, and ignores other properties", () => {
    const tokens = parseRootTokens(
      css("  --color-bg: #0A0E14;\n  --space-1: 4px;\n  --font-inter: Inter;\n  --radius-md: 10px;"),
    );
    expect([...tokens]).toEqual([
      ["color-bg", "#0a0e14"],
      ["space-1", "4px"],
      ["radius-md", "10px"],
    ]);
  });

  it("is not fooled by comments: a `}` inside one, or a commented-out declaration", () => {
    const tokens = parseRootTokens(
      css("  /* the } brace */\n  --color-bg: #0a0e14;\n  /* --color-old: #fff; */\n  --text-xs: 12px;"),
    );
    expect([...tokens.keys()]).toEqual(["color-bg", "text-xs"]);
  });

  it("merges every top-level :root block", () => {
    const tokens = parseRootTokens(
      `:root { --color-bg: #000000; }\n.x { color: red; }\n:root { --space-2: 8px; }`,
    );
    expect([...tokens.keys()]).toEqual(["color-bg", "space-2"]);
  });

  it("rejects a token declared outside :root (an @theme block), which would go unchecked", () => {
    expect(() =>
      parseRootTokens(`:root { --color-bg: #000000; }\n@theme { --color-brand: #ff0000; }`),
    ).toThrow(/--color-brand is declared outside/);
  });

  it("rejects a token declared twice with different values", () => {
    expect(() =>
      parseRootTokens(`:root { --space-1: 4px; }\n:root { --space-1: 5px; }`),
    ).toThrow(/declared twice/);
  });

  it("rejects a token nested in a block inside :root, and one under a :root-like selector", () => {
    expect(() =>
      parseRootTokens(`:root { --color-bg: #000000; @media (x) { --color-bg2: #111111; } }`),
    ).toThrow(/--color-bg2 is declared outside/);
    expect(() =>
      parseRootTokens(`:root { --color-bg: #000000; }\n:root.light { --color-bg: #ffffff; }`),
    ).toThrow(/--color-bg is declared outside/);
  });

  it("fails when there are no tokens at all", () => {
    expect(() => parseRootTokens("body { color: red; }")).toThrow(/no :root design tokens/);
  });
});

describe("stripComments", () => {
  it("removes multi-line comments", () => {
    expect(stripComments("a /* x\n y */ b")).toBe("a  b");
  });
});

describe("diffTokens", () => {
  it("is empty when both sides match", () => {
    const tokens = new Map([["color-bg", "#000000"]]);
    expect(diffTokens(tokens, new Map(tokens))).toEqual([]);
  });

  it("reports missing, different and extra tokens", () => {
    const web = new Map([
      ["color-bg", "#000000"],
      ["space-1", "4px"],
    ]);
    const mobile = new Map([
      ["color-bg", "#000001"],
      ["radius-sm", "6px"],
    ]);
    expect(diffTokens(web, mobile)).toEqual([
      "differs  --color-bg: web #000000, mobile #000001",
      "missing  --space-1: 4px",
      "extra    --radius-sm: 6px (not in the web)",
    ]);
  });
});

describe("mobileTokens", () => {
  it("spells tokens.ts the way the web's CSS does", () => {
    const tokens = mobileTokens();
    expect(tokens.get("color-surface-hover")).toBe("#1c2430");
    expect(tokens.get("space-4")).toBe("16px");
    expect(tokens.get("radius-full")).toBe("999px");
    expect(tokens.get("text-2xl")).toBe("28px");
  });
});

describe("parseLocalArg", () => {
  it("maps the flag forms to a path", () => {
    expect(parseLocalArg(undefined, "../web")).toBeNull();
    expect(parseLocalArg("--local", "../web")).toBe("../web");
    expect(parseLocalArg("--local=/a/b=c", "../web")).toBe("/a/b=c");
  });

  it("rejects an empty --local=", () => {
    expect(() => parseLocalArg("--local=", "../web")).toThrow(/needs a path/);
  });
});
