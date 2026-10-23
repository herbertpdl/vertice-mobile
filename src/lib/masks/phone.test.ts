import { maskPhone } from "./phone";

describe("maskPhone", () => {
  it("formats as the digits come in", () => {
    expect(maskPhone("")).toBe("");
    expect(maskPhone("1")).toBe("(1");
    expect(maskPhone("119")).toBe("(11) 9");
    expect(maskPhone("1198765")).toBe("(11) 9876-5");
    expect(maskPhone("1134567890")).toBe("(11) 3456-7890");
    expect(maskPhone("11987654321")).toBe("(11) 98765-4321");
    expect(maskPhone("(11) 98765-43219")).toBe("(11) 98765-4321");
  });
});
