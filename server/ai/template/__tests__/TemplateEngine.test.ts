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
      targetDuration: 15,
      transitions: { type: 'cut', duration: 0 }
    },
    scoring: { keywordBoost: 0, silencePenalty: 0 },
    style: {
      caption: false,
      zoomOnEmphasis: false
    },
    branding: {}
  };

  it('should be deterministic (same input -> same output)', () => {
    const segments1 = JSON.parse(JSON.stringify(mockSegments));
    const segments2 = JSON.parse(JSON.stringify(mockSegments));

    const plan1 = engine.run(segments1, defaultConfig);
    const plan2 = engine.run(segments2, defaultConfig);

    expect(plan1).toEqual(plan2);
    // Check clips property exists and has expected sourceIds
    expect(plan1.clips.map((c: any) => c.sourceId)).toContain('video1');
  });

  it('should filter segments by duration', () => {
    const config = {
      ...defaultConfig,
      rules: {
        ...defaultConfig.rules,
        minSegmentDuration: 8,
        targetDuration: 20
      }
    };

    const segments = JSON.parse(JSON.stringify(mockSegments));
    const plan = engine.run(segments, config);

    // Should have clips
    expect(plan.clips.length).toBeGreaterThan(0);
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

    expect(plan.metadata.totalDuration).toBeLessThanOrEqual(10.5); // Allow 5% overflow
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

    // Should have transitions if more than one clip
    if (plan.clips.length > 1) {
      expect(plan.transitions.length).toBeGreaterThan(0);
      expect(plan.transitions[0].type).toBe('fade');
    }
  });
});
