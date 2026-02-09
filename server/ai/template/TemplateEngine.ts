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
import {
  AnalysisResult,
  TemplateConfig,
  UserConfig,
  EditPlan,
} from '../types/index.js';

interface InternalSegment {
  id: string;
  sourceVideoId: string;
  start: number;
  end: number;
  energy: number;
  keywords: string[];
  silenceBefore?: number;
  score: number;
}

export class TemplateEngine {
  applyTemplate(
    analysis: AnalysisResult,
    template: TemplateConfig,
    config: UserConfig
  ): EditPlan {
    const decisionTrace: NonNullable<EditPlan['decisionTrace']> = [];

    // 1. Initial Filtering & Processing
    let processedSegments = this.processSegments(analysis, template, decisionTrace);

    // 2. Scoring
    processedSegments = this.scoreSegments(processedSegments, template, config, decisionTrace);

    // 3. Selection (Fit to duration)
    const selectedSegments = this.selectSegments(processedSegments, config, decisionTrace);

    // 4. Style Translation & Branding
    return this.buildEditPlan(selectedSegments, template, config, decisionTrace);
  }

  private processSegments(
    analysis: AnalysisResult,
    template: TemplateConfig,
    trace: NonNullable<EditPlan['decisionTrace']>
  ): InternalSegment[] {
    const result: InternalSegment[] = [];
    const sourceVideoId = analysis.videoId || 'unknown';

    for (const seg of analysis.segments) {
      // Rule: minEnergy
      if (template.rules.minEnergy !== undefined && seg.energy < template.rules.minEnergy) {
        trace.push({
          segmentId: seg.id,
          rule: 'minEnergy',
          outcome: 'discarded',
          scoreChange: 0,
        });
        continue;
      }

      // Rule: maxSegmentDuration (Split)
      const maxDur = template.rules.maxSegmentDuration;
      const duration = seg.end - seg.start;

      if (maxDur && duration > maxDur) {
        // Split logic: Divide into chunks of maxDur
        let currentStart = seg.start;
        let chunkIndex = 0;

        while (currentStart < seg.end) {
          const chunkEnd = Math.min(currentStart + maxDur, seg.end);
          // Only keep chunks that are reasonably sized (e.g. >= 0.5s) to avoid tiny fragments
          if (chunkEnd - currentStart >= 0.5) {
            result.push({
              id: `${seg.id}_part${chunkIndex}`,
              sourceVideoId: seg.sourceVideoId || sourceVideoId,
              start: currentStart,
              end: chunkEnd,
              energy: seg.energy,
              keywords: seg.keywords,
              silenceBefore: chunkIndex === 0 ? seg.silenceBefore : 0,
              score: 0,
            });
            trace.push({
              segmentId: seg.id,
              rule: 'maxSegmentDuration',
              outcome: 'split',
            });
          }
          currentStart = chunkEnd;
          chunkIndex++;
        }
      } else {
        result.push({
          id: seg.id,
          sourceVideoId: seg.sourceVideoId || sourceVideoId,
          start: seg.start,
          end: seg.end,
          energy: seg.energy,
          keywords: seg.keywords,
          silenceBefore: seg.silenceBefore,
          score: 0,
        });
      }
    }
    return result;
  }

  private scoreSegments(
    segments: InternalSegment[],
    template: TemplateConfig,
    config: UserConfig,
    trace: NonNullable<EditPlan['decisionTrace']>
  ): InternalSegment[] {
    return segments.map(seg => {
      let score = seg.energy * 100; // Base score (0-100)

      // Rule: keywordsBoost
      const hasKeyword = seg.keywords.some(k =>
        config.keywords.some(uk => k.toLowerCase().includes(uk.toLowerCase()))
      );

      if (hasKeyword && template.rules.keywordsBoost) {
        const boost = template.rules.keywordsBoost * 100;
        score += boost;
        trace.push({
          segmentId: seg.id,
          rule: 'keywordsBoost',
          outcome: 'boosted',
          scoreChange: boost,
        });
      }

      // Rule: silencePenalty
      if (seg.silenceBefore && template.rules.silencePenalty) {
        const penalty = seg.silenceBefore * template.rules.silencePenalty * 100;
        score -= penalty;
        trace.push({
          segmentId: seg.id,
          rule: 'silencePenalty',
          outcome: 'penalized',
          scoreChange: -penalty,
        });
      }

      return { ...seg, score };
    });
  }

  private selectSegments(
    segments: InternalSegment[],
    config: UserConfig,
    trace: NonNullable<EditPlan['decisionTrace']>
  ): InternalSegment[] {
    // Sort by score descending
    const sorted = [...segments].sort((a, b) => b.score - a.score);

    const selected: InternalSegment[] = [];
    let currentDuration = 0;

    for (const seg of sorted) {
        const segDuration = seg.end - seg.start;

        if (segDuration < config.minSegmentDuration) {
             trace.push({
                segmentId: seg.id,
                rule: 'userMinSegmentDuration',
                outcome: 'discarded',
                scoreChange: 0
             });
             continue;
        }

        if (currentDuration + segDuration <= config.targetDuration) {
            selected.push(seg);
            currentDuration += segDuration;
            trace.push({
                segmentId: seg.id,
                rule: 'selection',
                outcome: 'selected',
                scoreChange: seg.score
            });
        } else {
             trace.push({
                segmentId: seg.id,
                rule: 'targetDuration',
                outcome: 'discarded_full',
                scoreChange: 0
             });
        }
    }

    // Sort selected by start time for narrative flow
    return selected.sort((a, b) => a.start - b.start);
  }

  private buildEditPlan(
    segments: InternalSegment[],
    template: TemplateConfig,
    config: UserConfig,
    trace: NonNullable<EditPlan['decisionTrace']>
  ): EditPlan {
    const clips = segments.map(seg => {
       // Apply zoom if score is high (> 70) and template requests it
       const applyZoom = !!(template.style.zoomOnEmphasis && seg.score > 70);

       return {
         sourceId: seg.sourceVideoId,
         start: seg.start,
         end: seg.end,
         volume: 1.0,
         zoom: applyZoom
       };
    });

    const transitions: EditPlan['transitions'] = [];
    let currentTime = 0;

    for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const clipDuration = clip.end - clip.start;

        if (i < clips.length - 1 && template.style.transitions) {
            let duration = 0.5;
            if (template.style.transitions === 'cut') duration = 0;

            transitions.push({
                type: template.style.transitions as any,
                duration: duration,
                atTime: currentTime + clipDuration
            });
        }
        currentTime += clipDuration;
    }

    return {
      clips,
      transitions,
      metadata: {
        totalDuration: currentTime,
        fps: 30,
        resolution: { width: 1920, height: 1080 }
      },
      branding: template.branding,
      captions: template.style.caption,
      decisionTrace: trace
    };
  }
}
