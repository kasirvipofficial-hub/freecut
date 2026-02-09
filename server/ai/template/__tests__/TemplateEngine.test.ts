import { describe, it, expect, beforeEach } from 'bun:test';
import { TemplateEngine } from '../TemplateEngine.js';
import { ScoredSegment, TemplateConfig } from '../../types/index.js';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  const mockSegments: ScoredSegment[] = [
    {
      id: '1',
      sourceVideoId: 'video1',
      startTime: 0,
      endTime: 10,
      duration: 10,
      score: 80,
      explain: { reasons: [], weights: {} }
    },
    {
      id: '2',
      sourceVideoId: 'video1',
      startTime: 10,
      endTime: 20,
      duration: 10,
      score: 90, // Higher score
      explain: { reasons: [], weights: {} }
    },
    {
      id: '3',
      sourceVideoId: 'video1',
      startTime: 20,
      endTime: 25,
      duration: 5,
      score: 50,
      explain: { reasons: [], weights: {} }
    }
  ];

  const defaultConfig: TemplateConfig = {
    name: 'test',
    rules: {
      minSegmentDuration: 2,
      maxSegmentDuration: 20,
      targetDuration: 15, // Should pick segment 2 (10s) + segment 3 (5s) = 15s? Or segment 2 + segment 1?
      // Segment 2 (90) + Segment 1 (80) = 20s > 15 * 1.05 = 15.75. So it will pick 2, then try 1.
      // 10 + 10 = 20. Too long.
      // Then try 3. 10 + 5 = 15. Fits.
      transitions: { type: 'cut', duration: 0 }
    },
    scoring: { keywordBoost: 0, silencePenalty: 0 }
  };

  it('should be deterministic (same input -> same output)', () => {
    const segments1 = JSON.parse(JSON.stringify(mockSegments));
    const segments2 = JSON.parse(JSON.stringify(mockSegments));

    const plan1 = engine.run(segments1, defaultConfig);
    const plan2 = engine.run(segments2, defaultConfig);

    expect(plan1).toEqual(plan2);
    // Specifically check segments order and content
    // Sorted by time: 2 comes before 3? No, 2 starts at 10, 3 starts at 20.
    // Wait, segment 1 starts at 0. But it's skipped because it doesn't fit?
    // Let's trace:
    // Sorted by score: 2 (90), 1 (80), 3 (50).
    // Try 2: duration 10. Accum 10. Fits.
    // Try 1: duration 10. Accum 20. > 15.75. Skip.
    // Try 3: duration 5. Accum 15. Fits.
    // Selected: [2, 3].
    // Sort by time: 2 (start 10), 3 (start 20).
    expect(plan1.segments.map(s => s.id)).toEqual(['2', '3']);
  });

  it('should filter segments by duration', () => {
    const config = {
      ...defaultConfig,
      rules: {
        ...defaultConfig.rules,
        minSegmentDuration: 8, // Excludes segment 3 (5s)
        targetDuration: 20 // Should try to fit 2 and 1
      }
    };

    const segments = JSON.parse(JSON.stringify(mockSegments));
    const plan = engine.run(segments, config);

    // Segment 3 should be filtered out before selection
    // Segments available: 1 (10s, 80), 2 (10s, 90).
    // Sorted: 2, 1.
    // Select 2: 10s.
    // Select 1: 20s. Fits target 20.
    // Sort by time: 1 (0s), 2 (10s).
    expect(plan.segments.map(s => s.id)).toEqual(['1', '2']);
  });

  it('should respect target duration', () => {
    const config = {
      ...defaultConfig,
      rules: {
        ...defaultConfig.rules,
        targetDuration: 10
      }
    };

    const segments = JSON.parse(JSON.stringify(mockSegments));
    const plan = engine.run(segments, config);

    // Should select only segment 2 (score 90, duration 10)
    expect(plan.segments.length).toBe(1);
    expect(plan.segments[0].id).toBe('2');
  });

  it('should apply transitions from config', () => {
    const config = {
      ...defaultConfig,
      rules: {
        ...defaultConfig.rules,
        transitions: { type: 'fade', duration: 1 }
      }
    };

    const segments = JSON.parse(JSON.stringify(mockSegments));
    const plan = engine.run(segments, config);

    // Should select 2 and 3 (15s total)
    expect(plan.segments.length).toBeGreaterThan(1);
    // First segment should have transition
    expect(plan.segments[0].actions.transition).toBe('fade');
    // Last segment should not
    expect(plan.segments[plan.segments.length - 1].actions.transition).toBeUndefined();
  });
});
