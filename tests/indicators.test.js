import { describe, expect, it } from 'vitest';
import { simpleMovingAverage } from '../src/indicators.js';

describe('simpleMovingAverage', () => {
  it('returns rolling averages aligned to the end of each window', () => {
    const bars = [1, 2, 3, 4].map((close, index) => ({ time: `2026-01-0${index + 1}`, close }));
    expect(simpleMovingAverage(bars, 3)).toEqual([
      { time: '2026-01-03', value: 2 },
      { time: '2026-01-04', value: 3 },
    ]);
  });

  it('rejects invalid periods', () => {
    expect(() => simpleMovingAverage([], 0)).toThrow('Period must be a positive integer.');
  });
});
