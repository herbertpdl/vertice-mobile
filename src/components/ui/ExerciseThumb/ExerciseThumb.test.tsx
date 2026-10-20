import { fireEvent, render, screen } from "@testing-library/react-native";

import { ExerciseThumb } from "./ExerciseThumb";

const URI = "https://img.youtube.com/vi/x/hqdefault.jpg";
const tree = () => JSON.stringify(screen.toJSON());
const image = () => screen.queryByTestId("exercise-thumb-image", { includeHiddenElements: true });

describe("ExerciseThumb", () => {
  it("shows the placeholder without an image, and no play badge", async () => {
    await render(<ExerciseThumb imageUri={null} hasVideo />);
    expect(tree()).not.toContain(URI);
    expect(image()).toBeNull();
  });

  it("shows the still with a play badge only for a video", async () => {
    const { rerender } = await render(<ExerciseThumb imageUri={URI} hasVideo />);
    expect(image()).not.toBeNull();
    const withBadge = tree().length;
    await rerender(<ExerciseThumb imageUri={URI} />);
    expect(tree().length).toBeLessThan(withBadge);
  });

  it("falls back to the placeholder when the still fails, and retries a new URI", async () => {
    const { rerender } = await render(<ExerciseThumb imageUri={URI} hasVideo />);
    await fireEvent(image()!, "error", { nativeEvent: { error: "404" } });
    expect(image()).toBeNull();
    await rerender(<ExerciseThumb imageUri={`${URI}?v=2`} hasVideo />);
    expect(image()).not.toBeNull();
  });
});
