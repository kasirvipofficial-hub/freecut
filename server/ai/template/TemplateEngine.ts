import { ScoredSegment, EditPlan, TemplateConfig, EditSegment } from '../types/index.js';

export class TemplateEngine {
  /**
   * Deterministically converts scored segments into an EditPlan based on TemplateConfig.
   *
   * @param segments - List of scored segments from the analysis phase
   * @param config - Template configuration defining rules and style
   * @returns EditPlan - The canonical edit plan
   */
  run(segments: ScoredSegment[], config: TemplateConfig): EditPlan {
    console.log(`[TemplateEngine] Running template: ${config.name}`);

    // 1. Filter segments based on template rules
    const filtered = this.filterSegments(segments, config);

    // 2. Select segments to fill target duration (Deterministic selection)
    const selected = this.selectSegments(filtered, config);

    // 3. Sort selected segments chronologically for the final edit
    const sortedSelected = [...selected].sort((a, b) => a.startTime - b.startTime);

    // 4. Build EditPlan
    return this.buildPlan(sortedSelected, config);
  }

  private filterSegments(segments: ScoredSegment[], config: TemplateConfig): ScoredSegment[] {
    return segments.filter(segment => {
      const duration = segment.duration;
      // Use template rules if defined, otherwise fallback to lenient defaults
      const min = config.rules.minSegmentDuration || 0;
      const max = config.rules.maxSegmentDuration || Infinity;
      return duration >= min && duration <= max;
    });
  }

  private selectSegments(segments: ScoredSegment[], config: TemplateConfig): ScoredSegment[] {
    const targetDuration = config.rules.targetDuration;

    // Deterministic Sort: Primary = Score (desc), Secondary = StartTime (asc)
    const sorted = [...segments].sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
      return a.startTime - b.startTime;
    });

    const selected: ScoredSegment[] = [];
    let currentDuration = 0;

    for (const segment of sorted) {
      if (currentDuration + segment.duration <= targetDuration * 1.05) { // Allow 5% overflow for better fit
        selected.push(segment);
        currentDuration += segment.duration;

        // Add explanation to trace (mutating clone ideally, but here we modify in place for trace)
        segment.explain.reasons.push(`Selected by TemplateEngine (accumulated: ${currentDuration.toFixed(1)}s)`);
      } else {
        segment.explain.rejectedBecause = segment.explain.rejectedBecause || [];
        segment.explain.rejectedBecause.push(`Skipped by TemplateEngine: would exceed target duration`);
      }

      // Stop if we are close enough (e.g., within 95% of target)
      if (currentDuration >= targetDuration * 0.95) break;
    }

    return selected;
  }

  private buildPlan(segments: ScoredSegment[], config: TemplateConfig): EditPlan {
    const editSegments: EditSegment[] = segments.map((segment, index) => {
      const isLast = index === segments.length - 1;

      return {
        id: segment.id,
        start: segment.startTime,
        end: segment.endTime,
        score: segment.score,
        actions: {
          video: [segment.sourceVideoId],
          audio: [segment.sourceVideoId],
          transition: !isLast && config.rules.transitions ? config.rules.transitions.type : undefined
        },
        explain: segment.explain
      };
    });

    return {
      meta: {
        template: config.name,
        targetDuration: config.rules.targetDuration,
        mood: 'custom', // Derived from template
        fps: 30,
        resolution: { width: 1920, height: 1080 }
      },
      segments: editSegments,
      branding: config.branding
    };
  }
}
