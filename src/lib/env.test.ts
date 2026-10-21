import { isLocalHost, parseEnv } from "./env";

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

describe("isLocalHost", () => {
  it.each(["localhost", "LOCALHOST.", "api.localhost", "mac.local", "127.0.0.1", "127.8.9.1", "10.0.2.2", "192.168.0.10", "172.16.0.1", "172.31.255.1", "169.254.1.1", "0.0.0.0", "[::1]", "fd00::1"])(
    "%s is local",
    (host) => expect(isLocalHost(host)).toBe(true),
  );
  it.each(["api.vertice.app", "172.32.0.1", "8.8.8.8", "fdroid.org", "11.0.0.1"])("%s is not", (host) =>
    expect(isLocalHost(host)).toBe(false),
  );
});
