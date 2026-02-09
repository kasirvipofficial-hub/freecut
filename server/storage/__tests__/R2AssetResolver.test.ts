import { expect, test, describe, mock, beforeAll, afterAll, beforeEach } from "bun:test";
import { r2AssetResolver } from "../R2AssetResolver.js";
import { S3Client } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

// Mock S3 send
const mockSend = mock(async (command: any) => {
    if (command.constructor.name === "GetObjectCommand") {
        const stream = new Readable({
            read() {
                this.push("mock file content");
                this.push(null);
            }
        });

        return {
            Body: stream as any
        };
    }
    return {};
});

const jobId = "test-job-id-123";
const tempDir = path.join("/tmp", jobId);

// Mock EditPlan
const mockPlan: any = {
  clips: [],
  transitions: [],
  metadata: { totalDuration: 10, fps: 30, resolution: { width: 1920, height: 1080 } },
  assetMap: {
    "asset1": { type: "video", src: "videos/asset1.mp4" },
    "asset2": { type: "image", src: "https://example.com/images/asset2.png" }
  }
};

describe("R2AssetResolver", () => {
  beforeAll(() => {
    // Mock the S3 client inside resolver
    const mockClient = {
        send: mockSend,
        config: {}
    } as unknown as S3Client;

    r2AssetResolver.setClient(mockClient);
  });

  beforeEach(() => {
      mockSend.mockClear();
  });

  test("resolve should download files to temp directory", async () => {
    const resolved = await r2AssetResolver.resolve(mockPlan, jobId);

    // Check keys
    expect(resolved["asset1"]).toBeDefined();
    expect(resolved["asset2"]).toBeDefined();

    // Check paths
    const path1 = resolved["asset1"];
    const path2 = resolved["asset2"];

    expect(path1).toInclude(jobId);
    expect(path1.endsWith(".mp4")).toBe(true);

    expect(path2).toInclude(jobId);
    expect(path2.endsWith(".png")).toBe(true);

    // Verify file existence (mock wrote to real fs in /tmp)
    expect(fs.existsSync(path1)).toBe(true);
    expect(fs.existsSync(path2)).toBe(true);

    const content = fs.readFileSync(path1, "utf-8");
    expect(content).toBe("mock file content");
  });

  test("cleanup should remove temp directory", async () => {
    // Ensure files exist first (from previous test)
    // Then cleanup
    await r2AssetResolver.cleanup(jobId);
    expect(fs.existsSync(tempDir)).toBe(false);
  });
});
