import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("defaults to the local BFF in development and trims a trailing slash", () => {
    expect(parseEnv({}, { release: false }).EXPO_PUBLIC_BFF_URL).toBe("http://localhost:3000");
    expect(parseEnv({ EXPO_PUBLIC_BFF_URL: "http://192.168.0.10:3000/" }, { release: false }).EXPO_PUBLIC_BFF_URL).toBe(
      "http://192.168.0.10:3000",
    );
  });

  it("rejects something that isn't an http(s) URL", () => {
    expect(() => parseEnv({ EXPO_PUBLIC_BFF_URL: "localhost:3000" }, { release: false })).toThrow();
    expect(() => parseEnv({ EXPO_PUBLIC_BFF_URL: "ftp://bff.vertice.app" }, { release: false })).toThrow();
  });

  it("requires https and a non-local host in a release build", () => {
    expect(parseEnv({ EXPO_PUBLIC_BFF_URL: "https://api.vertice.app" }, { release: true }).EXPO_PUBLIC_BFF_URL).toBe(
      "https://api.vertice.app",
    );
    expect(() => parseEnv({ EXPO_PUBLIC_BFF_URL: "http://api.vertice.app" }, { release: true })).toThrow(/https/);
    expect(() => parseEnv({ EXPO_PUBLIC_BFF_URL: "https://localhost:3000" }, { release: true })).toThrow(/local/);
    expect(() => parseEnv({}, { release: true })).toThrow();
  });
});
