import { describe, it, expect, beforeEach } from 'bun:test';
import { TemplateEngine } from '../TemplateEngine.js';
import { ScoredSegment, TemplateConfig } from '../../types/index.js';
import { TemplateEngine } from '../TemplateEngine.js';
import { AnalysisResult, TemplateConfig, UserConfig } from '../../types/index.js';
import { describe, it, expect, beforeEach } from 'bun:test';

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
  const mockAnalysis: AnalysisResult = {
    videoId: 'video1',
    segments: [
      { id: 's1', start: 0, end: 10, energy: 0.8, keywords: ['hello'], silenceBefore: 0, sourceVideoId: 'video1' },
      { id: 's2', start: 10, end: 20, energy: 0.4, keywords: [], silenceBefore: 0.5, sourceVideoId: 'video1' },
      { id: 's3', start: 20, end: 40, energy: 0.9, keywords: ['important'], silenceBefore: 0, sourceVideoId: 'video1' }, // 20s long
    ]
  };

  const mockConfig: UserConfig = {
    targetDuration: 30,
    minSegmentDuration: 2,
    maxSegmentDuration: 100, // User config max is high
    keywords: ['important'],
    mood: 'energetic'
  };

  const mockTemplate: TemplateConfig = {
    id: 'test_template',
    rules: {
      minEnergy: 0.5,
      maxSegmentDuration: 15, // Template max is 15
      keywordsBoost: 0.2,
      silencePenalty: 0.1
    },
    style: {
      transitions: 'crossfade',
      caption: true,
      zoomOnEmphasis: true
    },
    branding: {
      watermark: 'logo.png'
    }
  };

  beforeEach(() => {
    engine = new TemplateEngine();
  });

  it('filters segments with low energy', () => {
    const plan = engine.applyTemplate(mockAnalysis, mockTemplate, mockConfig);

    // s2 has energy 0.4, minEnergy is 0.5. Should be discarded.
    // Check decision trace
    const discardTrace = plan.decisionTrace?.find(d => d.segmentId === 's2' && d.outcome === 'discarded');
    expect(discardTrace).toBeDefined();

    // Ensure s2 is not in clips (10-20)
    const s2Clip = plan.clips.find(c => c.start === 10 && c.end === 20);
    expect(s2Clip).toBeUndefined();
  });

  it('splits long segments according to maxSegmentDuration', () => {
    // s3 is 20s (20-40). Template limit is 15s.
    // Should be split into 20-35 and 35-40.
    const plan = engine.applyTemplate(mockAnalysis, mockTemplate, mockConfig);

    const s3Parts = plan.clips.filter(c => c.start >= 20 && c.end <= 40);
    expect(s3Parts.length).toBeGreaterThanOrEqual(2);

    // First part should be max 15s
    expect(s3Parts[0].end - s3Parts[0].start).toBeLessThanOrEqual(15);
  });

  it('boosts segments with keywords', () => {
    // s3 has "important", mockConfig has "important".
    const plan = engine.applyTemplate(mockAnalysis, mockTemplate, mockConfig);

    // Check traces for parts of s3 (s3_part0, s3_part1)
    // Note: Splitting happens before scoring, so traces will be for s3_part0 etc.
    // Wait, let's verify my implementation.
    // processSegments does splitting and adds new IDs.
    // scoreSegments processes those new IDs.

    const boostTrace = plan.decisionTrace?.find(d => d.segmentId.startsWith('s3') && d.rule === 'keywordsBoost');
    expect(boostTrace).toBeDefined();
    expect(boostTrace?.outcome).toBe('boosted');
  });

  it('penalizes segments with silence', () => {
    const silenceAnalysis: AnalysisResult = {
      videoId: 'v1',
      segments: [
        { id: 's_quiet', start: 0, end: 5, energy: 0.8, keywords: [], silenceBefore: 1.0, sourceVideoId: 'v1' }
      ]
    };

    const plan = engine.applyTemplate(silenceAnalysis, mockTemplate, mockConfig);
    const trace = plan.decisionTrace?.find(d => d.rule === 'silencePenalty');

    expect(trace).toBeDefined();
    expect(trace?.outcome).toBe('penalized');
    expect(trace?.scoreChange).toBeLessThan(0);
  });

  it('applies branding and style', () => {
    const plan = engine.applyTemplate(mockAnalysis, mockTemplate, mockConfig);

    expect(plan.branding?.watermark).toBe('logo.png');
    expect(plan.captions).toBe(true);

    // Check transition
    // We should have at least 2 clips (s1 and s3 split parts)
    expect(plan.clips.length).toBeGreaterThan(1);
    expect(plan.transitions.length).toBeGreaterThan(0);
    expect(plan.transitions[0].type).toBe('crossfade');
  });

  it('respects target duration', () => {
     // Set target to 5s. s1 is 10s. Should ideally not pick s1 fully?
     // My logic: discard if full.
     // s1 (10s), s3_p1 (15s), s3_p2 (5s).
     // If target is 5s.
     // s1 duration 10 > 5 -> discarded_full.
     // s3_p2 duration 5 <= 5 -> selected?
     // Let's see score.
     // s3 has higher energy (0.9) + boost. s1 (0.8).
     // So s3 parts should be sorted first.
     // s3_p1 (15s) > 5 -> discarded.
     // s3_p2 (5s) <= 5 -> selected.

     const shortConfig = { ...mockConfig, targetDuration: 5 };
     const plan = engine.applyTemplate(mockAnalysis, mockTemplate, shortConfig);

     const totalDuration = plan.metadata.totalDuration;
     expect(totalDuration).toBeLessThanOrEqual(5);
     expect(totalDuration).toBeGreaterThan(0);
  });
});
