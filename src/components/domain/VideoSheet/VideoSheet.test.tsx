import { render, screen } from "@testing-library/react-native";

import { EMBED_REFERER, embedUrl, isAllowedNavigation, VideoSheet } from "./VideoSheet";

describe("isAllowedNavigation", () => {
  it("keeps the page on the embed and lets YouTube's own frames load inside it (§3.6)", () => {
    expect(isAllowedNavigation({ url: embedUrl("dQw4w9WgXcQ") })).toBe(true);
    expect(isAllowedNavigation({ url: "about:blank" })).toBe(true);
    expect(isAllowedNavigation({ url: "https://www.youtube.com/embed/x", isTopFrame: false })).toBe(true);
    // The logo's link: youtube.com in the top frame would be browsing all of YouTube in the app.
    expect(isAllowedNavigation({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", isTopFrame: true })).toBe(false);
    expect(isAllowedNavigation({ url: "https://www.youtube-nocookie.com/", isTopFrame: true })).toBe(false);
    expect(isAllowedNavigation({ url: "http://www.youtube-nocookie.com/embed/x" })).toBe(false);
    expect(isAllowedNavigation({ url: "https://evil.example/embed/x", isTopFrame: false })).toBe(false);
    expect(isAllowedNavigation({ url: "not a url" })).toBe(false);
  });
});

describe("VideoSheet", () => {
  it("plays the privacy-enhanced embed with the description", async () => {
    await render(
      <VideoSheet visible onClose={() => {}} title="Remada" videoUrl="https://youtu.be/dQw4w9WgXcQ" description="Costas retas." />,
    );
    expect(screen.getByTestId("webview").props.source).toEqual({ uri: embedUrl("dQw4w9WgXcQ"), headers: { Referer: EMBED_REFERER } });
    expect(screen.getByText("Costas retas.")).toBeOnTheScreen();
  });

  it("shows no player for a link that isn't YouTube's", async () => {
    await render(<VideoSheet visible onClose={() => {}} title="Remada" videoUrl="https://vimeo.com/1" />);
    expect(screen.queryByTestId("webview")).toBeNull();
  });
});
