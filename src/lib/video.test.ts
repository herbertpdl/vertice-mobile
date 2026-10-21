import * as WebBrowser from "expo-web-browser";

import { isOpenableVideoUrl, openVideo, videoThumbnailUrl, youtubeVideoId } from "./video";

jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));

describe("youtubeVideoId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("%s → %s", (url, id) => {
    expect(youtubeVideoId(url)).toBe(id);
  });

  it.each([
    "",
    "not a url",
    "https://vimeo.com/123456",
    "https://www.youtube.com/channel/UC123",
    "https://youtu.be/short",
    "javascript:alert(1)//youtu.be/dQw4w9WgXcQ",
    "https://evil.example/watch?v=dQw4w9WgXcQ",
  ])("%j → null", (url) => {
    expect(youtubeVideoId(url)).toBeNull();
  });
});

describe("videoThumbnailUrl", () => {
  it("builds the public still for YouTube links only", () => {
    expect(videoThumbnailUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
    expect(videoThumbnailUrl("https://vimeo.com/1")).toBeNull();
    expect(videoThumbnailUrl("")).toBeNull();
  });
});

describe("isOpenableVideoUrl", () => {
  it("allows http(s) only", () => {
    expect(isOpenableVideoUrl("https://vimeo.com/1")).toBe(true);
    expect(isOpenableVideoUrl("http://example.com/v.mp4")).toBe(true);
    expect(isOpenableVideoUrl("javascript:alert(1)")).toBe(false);
    expect(isOpenableVideoUrl("intent://x")).toBe(false);
    expect(isOpenableVideoUrl("")).toBe(false);
  });
});

describe("openVideo", () => {
  it("opens http(s) links in the in-app browser and ignores anything else", async () => {
    await openVideo("javascript:alert(1)");
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
    await openVideo("https://youtu.be/dQw4w9WgXcQ");
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith("https://youtu.be/dQw4w9WgXcQ");
  });
});
