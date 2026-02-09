import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { EditPlan, EditPlanClip, AssetMap, VideoAction, AudioAction, TextAction, BrandingOptions } from '../ai/types/index.js';

export type RenderResult = {
  outputPath: string;
  duration: number;
};

interface RenderOptions {
  debug?: boolean;
}

export class FFmpegRenderService {
  private tempDir: string;

  constructor(tempDir: string = path.join(process.cwd(), 'server', 'temp')) {
    this.tempDir = tempDir;
  }

  async render(editPlan: EditPlan, assets: AssetMap, options: RenderOptions = {}): Promise<RenderResult> {
    const debug = options.debug || false;
    const jobId = `job_${Date.now()}_r${Math.floor(Math.random() * 1000)}`;
    const jobDir = path.join(this.tempDir, jobId);

    try {
      // 1. Check FFmpeg availability
      await this.checkFFmpeg();

      // 2. Create job directory
      await fs.mkdir(jobDir, { recursive: true });
      if (debug) console.log(`[Render] Job ${jobId} started in ${jobDir}`);

      // 3. Process each segment independently
      const segmentFiles: string[] = [];
      const segmentDurations: number[] = [];

      for (let i = 0; i < editPlan.clips.length; i++) {
        const clip = editPlan.clips[i];
        const segmentFile = path.join(jobDir, `segment_${i}.mp4`);

        // Resolve source path
        let sourcePath = assets[clip.sourceId] as string;
        if (!sourcePath && clip.sourceId === 'sourceVideo') sourcePath = assets.sourceVideo;
        if (!sourcePath && Object.keys(assets).length === 1 && assets.sourceVideo) sourcePath = assets.sourceVideo;

        if (!sourcePath) {
          throw new Error(`Source video not found for ID: ${clip.sourceId}`);
        }

        if (debug) console.log(`[Render] Processing segment ${i} from ${sourcePath}`);

        await this.processSegment(clip, sourcePath, segmentFile, debug);
        segmentFiles.push(segmentFile);

        // Duration of segment
        segmentDurations.push(clip.end - clip.start);
      }

      // 4. Concatenate segments (handling transitions if any)
      const hasCrossfade = editPlan.transitions.some(t => t.type === 'fade');
      const concatFile = path.join(jobDir, 'concat.mp4');

      if (hasCrossfade) {
        await this.concatWithTransitions(segmentFiles, editPlan.transitions, concatFile, debug);
      } else {
        await this.simpleConcat(segmentFiles, concatFile, jobDir, debug);
      }

      // 5. Apply Branding (Intro/Outro/Watermark/Music)
      const finalFile = path.join(jobDir, 'final.mp4');
      await this.applyBranding(concatFile, editPlan.branding, assets, finalFile, debug);

      // 6. Get duration of final file
      const finalDuration = await this.getVideoDuration(finalFile);

      // 7. Move/Return result
      const outputDir = path.join(this.tempDir, 'output');
      await fs.mkdir(outputDir, { recursive: true });
      const finalOutputPath = path.join(outputDir, `${jobId}_final.mp4`);
      await fs.copyFile(finalFile, finalOutputPath);

      if (!debug) {
        await fs.rm(jobDir, { recursive: true, force: true });
      }

      return {
        outputPath: finalOutputPath,
        duration: finalDuration,
      };

    } catch (error) {
      if (debug) console.error(`[Render] Job ${jobId} failed:`, error);
      if (!debug) {
        await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {});
      }
      throw error;
    }
  }

  private async checkFFmpeg(): Promise<void> {
    try {
      await this.runCommand('ffmpeg', ['-version']);
    } catch (e) {
      throw new Error('FFmpeg is not available in the system PATH.');
    }
  }

  private async processSegment(clip: EditPlanClip, sourcePath: string, outputFile: string, debug: boolean): Promise<void> {
    const args: string[] = [];

    // Input seeking (fast seek)
    args.push('-ss', clip.start.toString());
    args.push('-to', clip.end.toString());
    args.push('-i', sourcePath);

    // Filter complex builder
    const filters: string[] = [];
    let vStream = '0:v';
    let aStream = '0:a';

    // Video Actions
    if (clip.videoActions) {
      for (const action of clip.videoActions) {
        if (action.type === 'zoom_in') {
            const scale = action.params?.scale || 1.5;
            filters.push(`crop=iw/${scale}:ih/${scale},scale=iw*${scale}:ih*${scale}`);
        } else if (action.type === 'fade_in') {
           const dur = action.params?.duration || 0.5;
           filters.push(`fade=t=in:st=0:d=${dur}`);
        } else if (action.type === 'fade_out') {
           const clipDur = clip.end - clip.start;
           const dur = action.params?.duration || 0.5;
           const st = clipDur - dur;
           filters.push(`fade=t=out:st=${st}:d=${dur}`);
        } else if (action.type === 'opacity') {
            const val = action.params?.value ?? 1.0;
            if (val < 1.0) {
               filters.push(`colorchannelmixer=aa=${val}`);
            }
        }
      }
    }

    // Text Actions (Captions, Lower Thirds)
    if (clip.textActions) {
      for (const action of clip.textActions) {
         if (action.type === 'caption') {
             const fontFile = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
             const text = action.text.replace(/:/g, '\\:').replace(/'/g, "");
             const x = "(w-text_w)/2";
             const y = "h-th-10";
             const color = action.params?.color || "white";
             const size = action.params?.fontSize || 24;
             filters.push(`drawtext=text='${text}':fontcolor=${color}:fontsize=${size}:x=${x}:y=${y}`);
         }
      }
    }

    // Audio Actions
    const aFilters: string[] = [];
    if (clip.audioActions) {
        for (const action of clip.audioActions) {
            if (action.type === 'normalize') {
                aFilters.push('loudnorm');
            } else if (action.type === 'fade_in') {
                const dur = action.params?.duration || 0.5;
                aFilters.push(`afade=t=in:st=0:d=${dur}`);
            } else if (action.type === 'fade_out') {
                const clipDur = clip.end - clip.start;
                const dur = action.params?.duration || 0.5;
                const st = clipDur - dur;
                aFilters.push(`afade=t=out:st=${st}:d=${dur}`);
            }
        }
    }
    // Apply volume from clip prop
    if (clip.volume !== 1.0) {
        aFilters.push(`volume=${clip.volume}`);
    }

    // Assemble filters
    if (filters.length > 0) {
        args.push('-vf', filters.join(','));
    }
    if (aFilters.length > 0) {
        args.push('-af', aFilters.join(','));
    }

    // Output settings
    args.push('-c:v', 'libx264');
    args.push('-preset', 'fast');
    args.push('-c:a', 'aac');
    args.push('-y');
    args.push(outputFile);

    if (debug) console.log(`[Render] Segment command: ffmpeg ${args.join(' ')}`);
    await this.runCommand('ffmpeg', args);
  }

  private async simpleConcat(segmentFiles: string[], outputFile: string, jobDir: string, debug: boolean): Promise<void> {
      const listFile = path.join(jobDir, 'files.txt');
      const fileContent = segmentFiles.map(f => `file '${f}'`).join('\n');
      await fs.writeFile(listFile, fileContent);

      const args = [
          '-f', 'concat',
          '-safe', '0',
          '-i', listFile,
          '-c', 'copy',
          '-y',
          outputFile
      ];

      if (debug) console.log(`[Render] Concat command: ffmpeg ${args.join(' ')}`);
      await this.runCommand('ffmpeg', args);
  }

  private async concatWithTransitions(segmentFiles: string[], transitions: EditPlan['transitions'], outputFile: string, debug: boolean): Promise<void> {
      // Simplified xfade implementation - see comments in first iteration
      // Falling back to simpleConcat for reliability in this scope unless we need full xfade graph
      console.warn('[Render] Complex transition graph not fully implemented, falling back to simple concat.');
      await this.simpleConcat(segmentFiles, outputFile, path.dirname(outputFile), debug);
  }

  private async applyBranding(inputFile: string, branding: BrandingOptions | undefined, assets: AssetMap, outputFile: string, debug: boolean): Promise<void> {
      if (!branding || (!branding.intro && !branding.outro && !branding.watermark && !branding.backgroundMusic)) {
          await fs.copyFile(inputFile, outputFile);
          return;
      }

      let currentFile = inputFile;
      const workDir = path.dirname(outputFile);
      let step = 0;

      // 1. Intro/Outro
      const introPath = branding.intro?.assetId ? assets[branding.intro.assetId] as string || assets.intro : undefined;
      const outroPath = branding.outro?.assetId ? assets[branding.outro.assetId] as string || assets.outro : undefined;

      if (introPath || outroPath) {
          const filesToConcat: string[] = [];
          if (introPath) filesToConcat.push(introPath);
          filesToConcat.push(currentFile);
          if (outroPath) filesToConcat.push(outroPath);

          const stepFile = path.join(workDir, `branding_concat_${step}.mp4`);
          await this.simpleConcat(filesToConcat, stepFile, workDir, debug);
          currentFile = stepFile;
          step++;
      }

      // 2. Watermark/Music
      const watermarkPath = branding.watermark?.assetId ? assets[branding.watermark.assetId] as string || assets.watermark : undefined;
      const musicPath = branding.backgroundMusic?.assetId ? assets[branding.backgroundMusic.assetId] as string || assets.music : undefined;

      if (watermarkPath || musicPath) {
          const args = ['-i', currentFile];
          let inputIdx = 1;
          const filters: string[] = [];
          let vLabel = '0:v';
          let aLabel = '0:a';

          if (watermarkPath) {
              args.push('-i', watermarkPath);
              const wmIdx = inputIdx++;
              let overlayXY = "10:10";
              const pos = branding.watermark?.position || 'top-left';
              if (pos === 'top-right') overlayXY = "main_w-overlay_w-10:10";
              if (pos === 'bottom-left') overlayXY = "10:main_h-overlay_h-10";
              if (pos === 'bottom-right') overlayXY = "main_w-overlay_w-10:main_h-overlay_h-10";

              const opacity = branding.watermark?.opacity ?? 1.0;
              filters.push(`[${wmIdx}]format=rgba,colorchannelmixer=aa=${opacity}[wm];[${vLabel}][wm]overlay=${overlayXY}[v_out]`);
              vLabel = 'v_out';
          }

          if (musicPath) {
              args.push('-stream_loop', '-1', '-i', musicPath);
              const musicIdx = inputIdx++;
              const vol = branding.backgroundMusic?.volume ?? 0.5;
              filters.push(`[${musicIdx}]volume=${vol}[music];[${aLabel}][music]amix=inputs=2:duration=first:dropout_transition=2[a_out]`);
              aLabel = 'a_out';
          }

          if (filters.length > 0) {
              args.push('-filter_complex', filters.join(';'));
              args.push('-map', `[${vLabel}]`, '-map', `[${aLabel}]`);
          }

          args.push('-c:v', 'libx264', '-c:a', 'aac', '-y', outputFile);
          if (debug) console.log(`[Render] Branding command: ffmpeg ${args.join(' ')}`);
          await this.runCommand('ffmpeg', args);
      } else {
          await fs.copyFile(currentFile, outputFile);
      }
  }

  private async getVideoDuration(filePath: string): Promise<number> {
    try {
      const { stdout } = await this.runCommand('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        filePath
      ]);
      return parseFloat(stdout.trim());
    } catch (e) {
      return 0;
    }
  }

  private runCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data; });
      proc.stderr.on('data', (data) => { stderr += data; });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command ${command} ${args.join(' ')} failed with code ${code}. Stderr: ${stderr}`));
        }
      });

      proc.on('error', (err) => {
          reject(err);
      });
    });
  }
}
