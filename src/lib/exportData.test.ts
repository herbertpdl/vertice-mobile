import * as Sharing from "expo-sharing";

import { shareExport } from "./exportData";

const mockWrite = jest.fn();
const mockCreate = jest.fn();
jest.mock("expo-file-system", () => ({
  Paths: { cache: "file:///cache/" },
  File: jest.fn().mockImplementation((dir: string, name: string) => ({ uri: `${dir}${name}`, create: mockCreate, write: mockWrite })),
}));
jest.mock("expo-sharing", () => ({ shareAsync: jest.fn() }));

describe("shareExport", () => {
  it("writes the file under the BFF's name and opens the share sheet", async () => {
    await shareExport({ text: '{"a":1}', filename: "vertice-1.json" });
    expect(mockCreate).toHaveBeenCalledWith({ overwrite: true });
    expect(mockWrite).toHaveBeenCalledWith('{"a":1}');
    expect(Sharing.shareAsync).toHaveBeenCalledWith("file:///cache/vertice-1.json", expect.objectContaining({ mimeType: "application/json" }));
  });
});
