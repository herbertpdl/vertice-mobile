import { render, screen } from "@testing-library/react-native";

import { ExerciseThumb } from "./ExerciseThumb";

const tree = () => JSON.stringify(screen.toJSON());

describe("ExerciseThumb", () => {
  it("shows the placeholder without an image", async () => {
    await render(<ExerciseThumb imageUri={null} hasVideo />);
    expect(tree()).not.toContain("hqdefault");
  });

  it("shows the image for a still", async () => {
    await render(<ExerciseThumb imageUri="https://img.youtube.com/vi/x/hqdefault.jpg" hasVideo />);
    expect(tree()).toContain("https://img.youtube.com/vi/x/hqdefault.jpg");
  });
});
