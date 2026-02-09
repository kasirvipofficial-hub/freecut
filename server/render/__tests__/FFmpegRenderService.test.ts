import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { FFmpegRenderService } from '../FFmpegRenderService.js';
import { EditPlan, AssetMap } from '../../ai/types/index.js';
import fs from 'fs/promises';
import path from 'path';

// Subclass to mock execution
class TestFFmpegRenderService extends FFmpegRenderService {
  public executedCommands: { command: string, args: string[] }[] = [];

  // @ts-ignore
  async checkFFmpeg() {
    return Promise.resolve();
  }

  // @ts-ignore
  async runCommand(command: string, args: string[]) {
    this.executedCommands.push({ command, args });
    if (command === 'ffprobe') {
      return { stdout: '10.0', stderr: '' };
    }

    // For ffmpeg, simulate output file creation
    if (command === 'ffmpeg') {
        const lastArg = args[args.length - 1];
        if (lastArg && (lastArg.endsWith('.mp4') || lastArg.endsWith('.mkv'))) {
            await fs.writeFile(lastArg, 'dummy content');
        }
    }

    return { stdout: '', stderr: '' };
  }
}

const TEST_TEMP_DIR = path.join(process.cwd(), 'server', 'temp', 'test_run');

describe('FFmpegRenderService', () => {
  let service: TestFFmpegRenderService;

  beforeEach(async () => {
    await fs.rm(TEST_TEMP_DIR, { recursive: true, force: true }).catch(() => {});
    await fs.mkdir(TEST_TEMP_DIR, { recursive: true });
    service = new TestFFmpegRenderService(TEST_TEMP_DIR);
  });

  afterEach(async () => {
    await fs.rm(TEST_TEMP_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('generates correct commands for basic render', async () => {
    const plan: EditPlan = {
      clips: [{ sourceId: 'vid1', start: 0, end: 5, volume: 1 }],
      transitions: [],
      metadata: { totalDuration: 5, fps: 30, resolution: { width: 1920, height: 1080 } }
    };
    const assets: AssetMap = { vid1: '/path/to/vid1.mp4', sourceVideo: '/path/to/vid1.mp4' };

    await service.render(plan, assets);

    const cmds = service.executedCommands;
    expect(cmds.length).toBeGreaterThan(0);

    const segCmd = cmds.find(c => c.args.some(a => a.endsWith('segment_0.mp4')));
    expect(segCmd).toBeDefined();
    if (segCmd) {
      expect(segCmd.args).toContain('-ss');
      expect(segCmd.args).toContain('0');
      expect(segCmd.args).toContain('-to');
      expect(segCmd.args).toContain('5');
    }

    const concatCmd = cmds.find(c => c.args.includes('concat') && c.args.includes('-f'));
    expect(concatCmd).toBeDefined();
  });

  it('generates correct commands for video actions (zoom, fade)', async () => {
    const plan: EditPlan = {
      clips: [{
        sourceId: 'vid1', start: 0, end: 5, volume: 1,
        videoActions: [
            { type: 'zoom_in', params: { scale: 1.5 } },
            { type: 'fade_in', params: { duration: 1 } }
        ]
      }],
      transitions: [],
      metadata: { totalDuration: 5, fps: 30, resolution: { width: 1920, height: 1080 } }
    };
    const assets: AssetMap = { vid1: '/path/to/vid1.mp4', sourceVideo: '' };

    await service.render(plan, assets);

    const segCmd = service.executedCommands.find(c => c.args.some(a => a.endsWith('segment_0.mp4')));

    expect(segCmd).toBeDefined();
    if (segCmd) {
      expect(segCmd.args).toContain('-vf');
      const vfIdx = segCmd.args.indexOf('-vf');
      const vf = segCmd.args[vfIdx + 1];
      expect(vf).toContain('crop=iw/1.5');
      expect(vf).toContain('scale=iw*1.5');
      expect(vf).toContain('fade=t=in:st=0:d=1');
    }
  });

  it('generates correct commands for branding', async () => {
    const plan: EditPlan = {
      clips: [{ sourceId: 'vid1', start: 0, end: 5, volume: 1 }],
      transitions: [],
      metadata: { totalDuration: 5, fps: 30, resolution: { width: 1920, height: 1080 } },
      branding: {
        intro: { assetId: 'intro1' },
        watermark: { assetId: 'wm1', position: 'top-right' }
      }
    };
    const assets: AssetMap = {
        vid1: '/path/to/vid1.mp4',
        intro1: '/path/to/intro.mp4',
        wm1: '/path/to/wm.png',
        sourceVideo: ''
    };

    await service.render(plan, assets);

    const cmds = service.executedCommands;

    const brandingCmd = cmds.find(c => c.args.includes('-filter_complex') && c.args.some(a => a.includes('overlay=')));
    expect(brandingCmd).toBeDefined();
    if (brandingCmd) {
      expect(brandingCmd.args.some(a => a.includes('wm.png'))).toBe(true);
      const fcIdx = brandingCmd.args.indexOf('-filter_complex');
      const fc = brandingCmd.args[fcIdx + 1];
      expect(fc).toContain('main_w-overlay_w-10:10');
    }
  });
});
