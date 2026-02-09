import { TemplateEngine } from '../TemplateEngine.js';
import { AnalysisResult, TemplateConfig, UserConfig } from '../../types/index.js';
import { describe, it, expect, beforeEach } from 'bun:test';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;

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
