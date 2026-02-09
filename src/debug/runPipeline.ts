import { processVideo } from '../../server/ai/index.ts';
import { VideoInput, UserConfig } from '../../server/ai/types/index.ts';

const input: VideoInput = {
  filePath: 'debug_video.mp4',
  id: 'debug-video-1'
};

const config: UserConfig = {
  targetDuration: 30,
  minSegmentDuration: 2,
  maxSegmentDuration: 10,
  keywords: ['AI', 'debug'],
  mood: 'energetic'
};

async function run() {
  console.log('Running debug pipeline...');
  try {
    const result = await processVideo(input, config);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error running pipeline:', err);
    process.exit(1);
  }
}

run();
