import { EditPlan } from '../ai/types/index.js';

export class FFmpegRenderService {
  /**
   * Translates an EditPlan into a sequence of FFmpeg commands.
   * This proves that the EditPlan is renderer-agnostic and can drive an FFmpeg process.
   *
   * @param plan - The canonical edit plan
   * @returns string[] - List of FFmpeg commands (simulated)
   */
  translateToFFmpeg(plan: EditPlan): string[] {
    const commands: string[] = [];

    // Filter segments that have video
    const validSegments = plan.segments.filter(s => s.actions.video && s.actions.video.length > 0);
    const uniqueVideos = Array.from(new Set(validSegments.map(s => s.actions.video![0])));

    // 1. Build Inputs
    // We assume video IDs correspond to filenames like {id}.mp4
    const inputArgs = uniqueVideos.map(id => `-i ${id}.mp4`).join(' ');

    // 2. Build Filter Complex parts
    const filterParts: string[] = [];

    validSegments.forEach((segment, index) => {
      const sourceId = segment.actions.video![0];
      const inputIndex = uniqueVideos.indexOf(sourceId);

      // Select video and audio streams, trim them, and reset timestamps
      // [0:v]trim=start=10:end=15,setpts=PTS-STARTPTS[v0]
      // [0:a]atrim=start=10:end=15,asetpts=PTS-STARTPTS[a0]
      filterParts.push(`[${inputIndex}:v]trim=start=${segment.start}:end=${segment.end},setpts=PTS-STARTPTS[v${index}]`);
      filterParts.push(`[${inputIndex}:a]atrim=start=${segment.start}:end=${segment.end},asetpts=PTS-STARTPTS[a${index}]`);
    });

    // Concatenate all segments
    // [v0][a0][v1][a1]concat=n=2:v=1:a=1[outv][outa]
    const concatInputs = validSegments.map((_, i) => `[v${i}][a${i}]`).join('');
    filterParts.push(`${concatInputs}concat=n=${validSegments.length}:v=1:a=1[outv][outa]`);

    // 3. Assemble Command
    // ffmpeg -i source.mp4 -filter_complex "..." -map "[outv]" -map "[outa]" output.mp4
    // Using filter_complex requires careful escaping in shell, here we just show the string
    commands.push(`ffmpeg ${inputArgs} -filter_complex "${filterParts.join(';')}" -map "[outv]" -map "[outa]" output.mp4`);

    return commands;
  }
}
