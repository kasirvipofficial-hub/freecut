import { describe, it } from 'node:test';
import assert from 'node:assert';
import { interpolateBetweenKeyframes, interpolatePropertyValue } from '../interpolation';
import type { Keyframe } from '@/types/keyframe';

describe('Keyframe Interpolation', () => {
  describe('interpolateBetweenKeyframes', () => {
    const kf1: Keyframe = {
      id: '1',
      frame: 0,
      value: 100,
      easing: 'linear',
    };

    const kf2: Keyframe = {
      id: '2',
      frame: 10,
      value: 200,
      easing: 'linear',
    };

    it('should interpolate linearly between keyframes (middle)', () => {
      const result = interpolateBetweenKeyframes(kf1, kf2, 5);
      assert.strictEqual(result, 150);
    });

    it('should return start value at start frame', () => {
      const result = interpolateBetweenKeyframes(kf1, kf2, 0);
      assert.strictEqual(result, 100);
    });

    it('should return end value at end frame', () => {
      const result = interpolateBetweenKeyframes(kf1, kf2, 10);
      assert.strictEqual(result, 200);
    });

    it('should handle easing (ease-in)', () => {
      const easeInKf: Keyframe = { ...kf1, easing: 'ease-in' };
      // ease-in is t*t. at 0.5, it should be 0.25.
      // 100 + (200-100) * 0.25 = 125
      const result = interpolateBetweenKeyframes(easeInKf, kf2, 5);
      assert.strictEqual(result, 125);
    });

    it('should handle same-frame keyframes by returning start value', () => {
      const kfSame: Keyframe = { ...kf2, frame: 0 };
      const result = interpolateBetweenKeyframes(kf1, kfSame, 0);
      assert.strictEqual(result, 100);
    });

    it('should clamp out-of-bounds frames to the range', () => {
      // Before start
      assert.strictEqual(interpolateBetweenKeyframes(kf1, kf2, -5), 100);
      // After end
      assert.strictEqual(interpolateBetweenKeyframes(kf1, kf2, 15), 200);
    });
  });

  describe('interpolatePropertyValue', () => {
    const keyframes: Keyframe[] = [
      { id: '1', frame: 10, value: 100, easing: 'linear' },
      { id: '2', frame: 20, value: 200, easing: 'linear' },
      { id: '3', frame: 30, value: 300, easing: 'linear' },
    ];
    const baseValue = 50;

    it('should return baseValue when keyframes array is empty', () => {
      assert.strictEqual(interpolatePropertyValue([], 15, baseValue), baseValue);
    });

    it('should return keyframe value when only one keyframe exists', () => {
      const singleKf = [keyframes[0]!];
      assert.strictEqual(interpolatePropertyValue(singleKf, 0, baseValue), 100);
      assert.strictEqual(interpolatePropertyValue(singleKf, 20, baseValue), 100);
    });

    it('should hold first value before the first keyframe', () => {
      assert.strictEqual(interpolatePropertyValue(keyframes, 0, baseValue), 100);
      assert.strictEqual(interpolatePropertyValue(keyframes, 5, baseValue), 100);
    });

    it('should hold last value after the last keyframe', () => {
      assert.strictEqual(interpolatePropertyValue(keyframes, 40, baseValue), 300);
    });

    it('should return exact value when frame matches a keyframe', () => {
      assert.strictEqual(interpolatePropertyValue(keyframes, 10, baseValue), 100);
      assert.strictEqual(interpolatePropertyValue(keyframes, 20, baseValue), 200);
      assert.strictEqual(interpolatePropertyValue(keyframes, 30, baseValue), 300);
    });

    it('should interpolate between surrounding keyframes', () => {
      // Between kf1 and kf2
      assert.strictEqual(interpolatePropertyValue(keyframes, 15, baseValue), 150);
      // Between kf2 and kf3
      assert.strictEqual(interpolatePropertyValue(keyframes, 25, baseValue), 250);
    });
  });
});
