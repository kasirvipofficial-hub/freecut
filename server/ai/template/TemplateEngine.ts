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
