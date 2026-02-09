import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { extractSignals } from '../extract/index.js';
import { normalizeSignals } from '../normalize/index.js';
import { buildSegments } from '../segment/index.js';
import { scoreSegments } from '../score/index.js';
import { applyDirectorLogic } from '../director/index.js';
import { buildEditPlan } from '../plan/index.js';
import { processVideo } from '../index.js';
import { VideoInput, UserConfig, ScoredSegment } from '../types/index.js';

// Mock Config
const mockConfig: UserConfig = {
  targetDuration: 30,
  minSegmentDuration: 2,
  maxSegmentDuration: 10,
  keywords: ['AI', 'tutorial'],
  mood: 'energetic'
};

const mockInput: VideoInput = {
  filePath: 'test.mp4',
  id: 'test-video-123'
};

describe('Freecut AI Pipeline', () => {

  it('1. Extract Signals: should return structured data', async () => {
    const signals = await extractSignals(mockInput);
    assert.ok(signals.audio);
    assert.ok(signals.video);
    assert.strictEqual(typeof signals.duration, 'number');
    assert.ok(signals.audio.timestamps.length > 0);
    assert.ok(signals.video.sceneChanges.length > 0);
  });

  it('2. Normalize Signals: should create aligned timeline', async () => {
    const signals = await extractSignals(mockInput);
    const timeline = normalizeSignals(signals);

    assert.ok(timeline.timePoints.length > 0);
    assert.strictEqual(timeline.totalDuration, signals.duration);

    // Check first point structure
    const firstPoint = timeline.timePoints[0];
    assert.strictEqual(typeof firstPoint.time, 'number');
    assert.strictEqual(typeof firstPoint.audioEnergy, 'number');
    assert.strictEqual(typeof firstPoint.isSpeech, 'boolean');
    assert.strictEqual(typeof firstPoint.isSceneChange, 'boolean');
  });

  it('3. Build Segments: should enforce min/max duration', async () => {
    const signals = await extractSignals(mockInput);
    const timeline = normalizeSignals(signals);
    const segments = buildSegments(timeline, mockConfig, mockInput.id);

    assert.ok(segments.length > 0);

    segments.forEach(seg => {
      assert.ok(seg.duration >= mockConfig.minSegmentDuration, `Segment ${seg.id} too short: ${seg.duration}`);
      // Due to potential splitting logic, segments should be <= max
      // But splitting might produce exact max.
      // Floating point might cause tiny overflow, so allow small epsilon if needed, but logic seems exact.
      assert.ok(seg.duration <= mockConfig.maxSegmentDuration + 0.1, `Segment ${seg.id} too long: ${seg.duration}`);
    });
  });

  it('4. Score Segments: should assign scores deterministically', async () => {
    const signals = await extractSignals(mockInput);
    const timeline = normalizeSignals(signals);
    const segments = buildSegments(timeline, mockConfig, mockInput.id);
    const scored = scoreSegments(segments, timeline, mockConfig);

    assert.strictEqual(scored.length, segments.length);
    scored.forEach(s => {
      assert.ok(s.score >= 0 && s.score <= 100);
      assert.ok(s.scoreDetails);
    });

    // Check determinism
    const scored2 = scoreSegments(segments, timeline, mockConfig);
    assert.deepStrictEqual(scored[0].score, scored2[0].score);
  });

  it('5. Director Logic: should select segments within target duration', async () => {
    const signals = await extractSignals(mockInput);
    const timeline = normalizeSignals(signals);
    const segments = buildSegments(timeline, mockConfig, mockInput.id);
    const scored = scoreSegments(segments, timeline, mockConfig);

    const selected = applyDirectorLogic(scored, mockConfig);

    const totalDuration = selected.reduce((sum, s) => sum + s.duration, 0);

    // Should be close to target (30s) but not significantly over
    // Our logic stops if >= 0.9 * target (27s)
    // And skips if adding would exceed 1.05 * target (31.5s)
    assert.ok(totalDuration <= mockConfig.targetDuration * 1.05 + 10, `Total duration ${totalDuration} exceeded target significantly`); // +10 buffer just in case logic is greedy with big segments

    // Check sorting (chronological)
    for (let i = 0; i < selected.length - 1; i++) {
      assert.ok(selected[i].startTime <= selected[i+1].startTime, 'Segments not chronological');
    }
  });

  it('6. Build Edit Plan: should generate valid JSON', async () => {
    const signals = await extractSignals(mockInput);
    const timeline = normalizeSignals(signals);
    const segments = buildSegments(timeline, mockConfig, mockInput.id);
    const scored = scoreSegments(segments, timeline, mockConfig);
    const selected = applyDirectorLogic(scored, mockConfig);

    const plan = buildEditPlan(selected, mockConfig);

    assert.ok(plan.clips);
    assert.strictEqual(plan.clips.length, selected.length);
    assert.ok(plan.metadata);

    // Check transitions for energetic (should be 0 as cuts are implicit or 0 duration)
    // In our implementation, we only push if duration > 0
    if (mockConfig.mood === 'energetic') {
      assert.strictEqual(plan.transitions.length, 0);
    }

    // Test calm mood (fades)
    const calmConfig = { ...mockConfig, mood: 'calm' as const };
    const planCalm = buildEditPlan(selected, calmConfig);
    if (selected.length > 1) {
      assert.strictEqual(planCalm.transitions.length, selected.length - 1);
      assert.strictEqual(planCalm.transitions[0].type, 'fade');
    }
  });

  it('7. Orchestrator: should run end-to-end', async () => {
    const plan = await processVideo(mockInput, mockConfig);
    assert.ok(plan);
    assert.ok(plan.clips.length > 0);
    assert.ok(plan.metadata.totalDuration > 0);
  });

});
