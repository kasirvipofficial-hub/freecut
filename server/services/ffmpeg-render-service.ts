import { r2AssetResolver } from '../storage/R2AssetResolver.js';
import { EditPlan } from '../ai/types/index.js';
import fs from 'fs';
import path from 'path';

export class FFmpegRenderService {
  /**
   * Translates EditPlan into FFmpeg commands and executes render.
   * Uploads final output to R2.
   * Handles debug artifacts if enabled.
   */
  async render(plan: EditPlan, jobId: string): Promise<string> {
    console.log(`[FFmpeg] Starting render for job ${jobId}`);

    // We create a temporary directory for output (same as resolver uses)
    const tempDir = path.join('/tmp', jobId);

    // Ensure temp dir exists (R2 resolver creates it, but good to be safe)
    if (!fs.existsSync(tempDir)) {
      await fs.promises.mkdir(tempDir, { recursive: true });
    }

    try {
      // 1. Resolve Assets
      // This downloads all necessary files from R2 to local temp
      console.log(`[FFmpeg] Resolving assets...`);
      const resolvedAssets = await r2AssetResolver.resolve(plan, jobId);
      console.log(`[FFmpeg] Resolved ${Object.keys(resolvedAssets).length} assets`);

      // 2. Build FFmpeg Command
      // (Stub: In real implementation, this would construct complex filter graph)
      const command = this.buildFFmpegCommand(plan, resolvedAssets);

      // 3. Execute Render
      // (Stub: Create a dummy output file since ffmpeg is not available in environment)
      const outputFilename = `final.mp4`;
      const outputPath = path.join(tempDir, outputFilename);

      await this.executeRender(command, outputPath);

      // 4. Upload Result
      // Target path: renders/{projectId}/final.mp4
      // We don't have projectId in EditPlan currently, using jobId as fallback or checking custom field
      const projectId = (plan as any).projectId || jobId;
      const uploadKey = `renders/${projectId}/final.mp4`;

      console.log(`[FFmpeg] Uploading result to ${uploadKey}...`);
      const publicUrl = await r2AssetResolver.upload(outputPath, uploadKey);

      // 5. Debug Mode Support
      if (plan.debug) {
        console.log(`[FFmpeg] Uploading debug artifacts...`);
        await this.uploadDebugArtifacts(jobId, plan, command, tempDir);
      }

      console.log(`[FFmpeg] Job ${jobId} completed successfully. URL: ${publicUrl}`);
      return publicUrl;

    } catch (error) {
      console.error(`[FFmpeg] Render failed for job ${jobId}: ${error}`);
      throw error;
    } finally {
      // 6. Cleanup
      // Ensure /tmp/{jobId} is deleted
      await r2AssetResolver.cleanup(jobId);
    }
  }

  private buildFFmpegCommand(plan: EditPlan, assets: Record<string, string>): string {
    // Stub: Generate a fake command string for debugging
    let cmd = `ffmpeg`;

    // Add inputs
    for (const [id, path] of Object.entries(assets)) {
      cmd += ` -i "${path}"`;
    }

    // Add filter complex stub
    cmd += ` -filter_complex "[0:v]...[outv]" -map "[outv]" output.mp4`;

    return cmd;
  }

  private async executeRender(command: string, outputPath: string): Promise<void> {
    console.log(`[FFmpeg] Executing command: ${command}`);
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create dummy file
    await fs.promises.writeFile(outputPath, Buffer.from('dummy video content'));
  }

  private async uploadDebugArtifacts(jobId: string, plan: EditPlan, command: string, tempDir: string) {
    // Create debug files in temp dir
    const planPath = path.join(tempDir, 'editplan.json');
    const cmdPath = path.join(tempDir, 'ffmpeg-command.txt');

    await fs.promises.writeFile(planPath, JSON.stringify(plan, null, 2));
    await fs.promises.writeFile(cmdPath, command);

    // Upload to debug/{jobId}/
    await r2AssetResolver.upload(planPath, `debug/${jobId}/editplan.json`);
    await r2AssetResolver.upload(cmdPath, `debug/${jobId}/ffmpeg-command.txt`);
  }
}

export const ffmpegRenderService = new FFmpegRenderService();
