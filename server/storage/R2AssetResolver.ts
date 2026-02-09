import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { EditPlan, AssetMap } from '../ai/types/index.js';

export class R2AssetResolver {
  private s3Client: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor() {
    this.bucket = process.env.R2_BUCKET || 'kasirvip';
    this.endpoint = process.env.R2_ENDPOINT || 'https://f8657947dd6a84828084d219ceda0596.r2.cloudflarestorage.com';

    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    // Use default credentials or empty strings (will fail on actual calls if missing)
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  // Allow injecting a mock client for testing
  public setClient(client: S3Client) {
    this.s3Client = client;
  }

  /**
   * Resolve EditPlan AssetMap entries into local temp files
   * Download assets from R2 to /tmp/{jobId}/{assetId}.{ext}
   * Return resolved local file paths map { [assetId]: localPath }
   */
  async resolve(plan: EditPlan, jobId: string): Promise<Record<string, string>> {
    const assetMap = plan.assetMap || {};
    const resolvedPaths: Record<string, string> = {};
    const tempDir = path.join('/tmp', jobId);

    // Create temp directory
    await fs.promises.mkdir(tempDir, { recursive: true });

    const downloads: Promise<void>[] = [];

    for (const [assetId, asset] of Object.entries(assetMap)) {
      if (!asset.src) continue;

      // If it's a local file (starts with /), just verify and return path
      if (asset.src.startsWith('/')) {
        resolvedPaths[assetId] = asset.src;
        continue;
      }

      // If it's a remote URL/Key, download it
      const key = this.getKeyFromSrc(asset.src);

      // Determine extension
      let ext = path.extname(key);
      if (!ext || ext.length < 2) {
          if (asset.type === 'video') ext = '.mp4';
          else if (asset.type === 'audio') ext = '.mp3';
          else if (asset.type === 'image') ext = '.png';
          else ext = '.bin';
      }

      const localPath = path.join(tempDir, `${assetId}${ext}`);

      // Store promise to download concurrently
      // We wrap it to catch individual errors if needed, but for now allow fail-fast
      downloads.push(this.downloadFile(key, localPath).then(() => {
          resolvedPaths[assetId] = localPath;
      }));
    }

    try {
        await Promise.all(downloads);
        return resolvedPaths;
    } catch (error) {
        // Cleanup on failure
        console.error('Resolution failed, cleaning up:', error);
        await this.cleanup(jobId);
        throw error;
    }
  }

  private getKeyFromSrc(src: string): string {
    // If it's a full URL, try to extract path
    if (src.startsWith('http')) {
        try {
            const url = new URL(src);
            // Remove leading slash from pathname to get key
            return url.pathname.substring(1);
        } catch (e) {
            return src;
        }
    }
    return src;
  }

  private async downloadFile(key: string, localPath: string): Promise<void> {
    console.log(`[R2] Downloading ${key} to ${localPath}`);
    try {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key
        });
        const response = await this.s3Client.send(command);

        if (!response.Body) {
            throw new Error(`Empty body for key: ${key}`);
        }

        // Stream to file
        const writeStream = fs.createWriteStream(localPath);
        // @ts-ignore - ReadableStream type mismatch
        await pipeline(response.Body as Readable, writeStream);
    } catch (error) {
        console.error(`[R2] Failed to download ${key}: ${error}`);
        throw error;
    }
  }

  /**
   * Upload a local file to R2
   * Returns the public URL
   */
  async upload(filePath: string, key: string): Promise<string> {
    console.log(`[R2] Uploading ${filePath} to ${key}`);

    try {
        const fileStream = fs.createReadStream(filePath);
        const contentType = this.getContentType(filePath);

        const upload = new Upload({
            client: this.s3Client,
            params: {
                Bucket: this.bucket,
                Key: key,
                Body: fileStream,
                ContentType: contentType
            }
        });

        await upload.done();

        // Return public URL
        const publicBase = process.env.R2_PUBLIC_URL || `${this.endpoint}/${this.bucket}`;
        return `${publicBase}/${key}`;
    } catch (error) {
        console.error(`[R2] Failed to upload ${key}: ${error}`);
        throw error;
    }
  }

  async cleanup(jobId: string): Promise<void> {
     const tempDir = path.join('/tmp', jobId);
     console.log(`[R2] Cleaning up ${tempDir}`);
     try {
         await fs.promises.rm(tempDir, { recursive: true, force: true });
     } catch (error) {
         console.warn(`[R2] Failed to cleanup ${tempDir}: ${error}`);
     }
  }

  private getContentType(filePath: string): string {
      const ext = path.extname(filePath).toLowerCase();
      const map: Record<string, string> = {
          '.mp4': 'video/mp4',
          '.mov': 'video/quicktime',
          '.webm': 'video/webm',
          '.json': 'application/json',
          '.txt': 'text/plain',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.mp3': 'audio/mpeg'
      };
      return map[ext] || 'application/octet-stream';
  }
}

export const r2AssetResolver = new R2AssetResolver();
