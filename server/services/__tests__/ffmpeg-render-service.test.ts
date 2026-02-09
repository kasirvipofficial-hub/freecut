import { expect, test, describe, mock, beforeAll } from "bun:test";
import { ffmpegRenderService } from "../ffmpeg-render-service.js";
import { r2AssetResolver } from "../../storage/R2AssetResolver.js";
import fs from "fs";
import path from "path";

// Mock R2 resolver methods
r2AssetResolver.resolve = mock(async () => ({ "asset1": "/tmp/mock/asset1.mp4" }));
r2AssetResolver.upload = mock(async () => "https://r2.example.com/renders/final.mp4");
r2AssetResolver.cleanup = mock(async () => {
    // console.log("Mock cleanup called");
});

// Mock fs if needed, but ffmpegRenderService uses real fs to check dir/write files
// We should probably allow it to write to real /tmp but use a unique job id
const mockJobId = "test-job-ffmpeg-123";
const tempDir = path.join("/tmp", mockJobId);

// Clean up temp dir before test
if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
}

const mockPlan = {
  clips: [],
  transitions: [],
  metadata: { totalDuration: 10, fps: 30, resolution: { width: 1920, height: 1080 } },
  assetMap: { "asset1": { type: "video", src: "videos/asset1.mp4" } },
  debug: true
};

describe("FFmpegRenderService", () => {
  test("render flow executes successfully", async () => {
    const url = await ffmpegRenderService.render(mockPlan as any, mockJobId);

    expect(r2AssetResolver.resolve).toHaveBeenCalled();
    // Should upload result + debug artifacts (editplan.json, ffmpeg-command.txt) = 3 uploads
    expect(r2AssetResolver.upload).toHaveBeenCalledTimes(3);
    expect(r2AssetResolver.cleanup).toHaveBeenCalled();
    expect(url).toBe("https://r2.example.com/renders/final.mp4");

    // Check if cleanup was called with jobId
    expect(r2AssetResolver.cleanup).toHaveBeenCalledWith(mockJobId);
  });
});
