import { fireEvent, render, screen } from "@testing-library/react-native";

import { VideoThumbnail } from "./VideoThumbnail";

describe("VideoThumbnail", () => {
  it("is one link that opens the video", async () => {
    const onPress = jest.fn();
    await render(<VideoThumbnail imageUri="https://img.youtube.com/vi/x/hqdefault.jpg" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("link", { name: "Abrir vídeo" }));
    expect(onPress).toHaveBeenCalled();
  });

  it("works without a still", async () => {
    await render(<VideoThumbnail imageUri={null} onPress={() => {}} />);
    expect(screen.getByRole("link", { name: "Abrir vídeo" })).toBeOnTheScreen();
  });
});
