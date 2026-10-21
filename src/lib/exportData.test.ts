import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { clearExports, shareExport } from "./exportData";

const mockFiles = new Map<string, string>();
let mockDirExists = false;
jest.mock("expo-file-system", () => ({
  Paths: { cache: "file:///cache" },
  Directory: jest.fn().mockImplementation(() => ({
    get exists() {
      return mockDirExists;
    },
    create: () => {
      mockDirExists = true;
    },
    delete: () => {
      mockDirExists = false;
      mockFiles.clear();
    },
  })),
  File: jest.fn().mockImplementation((_dir: unknown, name: string) => ({
    uri: `file:///cache/exports/${name}`,
    create: jest.fn(),
    write: (text: string) => mockFiles.set(name, text),
  })),
}));
jest.mock("expo-sharing", () => ({ shareAsync: jest.fn() }));

beforeEach(() => {
  mockFiles.clear();
  mockDirExists = false;
});

describe("shareExport", () => {
  it("writes the file under the BFF's name in the exports folder and opens the share sheet", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    await shareExport({ text: '{"a":1}', filename: "vertice-1.json" });
    expect(mockFiles.get("vertice-1.json")).toBe('{"a":1}');
    expect(Sharing.shareAsync).toHaveBeenCalledWith("file:///cache/exports/vertice-1.json", expect.objectContaining({ mimeType: "application/json" }));
    // Android keeps it until the next export or a sign-out…
    expect(mockDirExists).toBe(true);
    clearExports();
    expect(mockFiles.size).toBe(0);
  });

  it("deletes it once the iOS share sheet is done", async () => {
    jest.replaceProperty(Platform, "OS", "ios");
    await shareExport({ text: "{}", filename: "vertice-1.json" });
    expect(mockDirExists).toBe(false);
  });
});
