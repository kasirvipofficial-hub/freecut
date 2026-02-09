import { processVideo } from '../index.js';
import { strict as assert } from 'assert';

async function runTests() {
  console.log('🧪 Running AI Pipeline Tests...');

  const mockFiles = ['video1.mp4', 'audio_track.mp3'];
  const options = { targetDuration: 30 };

  try {
    const plan = await processVideo(mockFiles, options);

    // Basic Structure Assertions
    assert.ok(plan.projectId, 'Project ID should be generated');
    assert.ok(Array.isArray(plan.clips), 'Clips should be an array');
    assert.ok(plan.clips.length > 0, 'Should generate at least one clip from mock data');

    // Duration Assertions
    console.log(`Target Duration: ${options.targetDuration}s, Actual: ${plan.totalDuration.toFixed(2)}s`);
    // Note: Since mock selection is greedy, it might slightly exceed or be under, but should be reasonable.
    // In our mock logic, we stop adding if it exceeds target, so it should be <= target + max_segment_len,
    // BUT the check `if (currentDuration + segmentDuration <= targetDuration)` ensures strictly <= targetDuration.
    assert.ok(plan.totalDuration <= options.targetDuration, 'Total duration should not exceed target');
    assert.ok(plan.totalDuration > 0, 'Total duration should be positive');

    // Content Assertions
    const firstClip = plan.clips[0];
    assert.ok(firstClip.id, 'Clip ID must exist');
    assert.ok(firstClip.sourceId, 'Clip source ID must exist');
    assert.ok(typeof firstClip.duration === 'number', 'Clip duration must be a number');

    console.log('✅ All tests passed successfully!');
  } catch (error) {
    console.error('❌ Tests Failed:', error);
    process.exit(1);
  }
}

runTests();
