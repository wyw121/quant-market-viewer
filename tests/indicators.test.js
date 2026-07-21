import { describe, expect, it } from 'vitest';
import { bollingerBands, simpleMovingAverage } from '../src/indicators.js';

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

describe('bollingerBands', () => {
  it('calculates population-standard-deviation bands', () => {
    const bars = [1, 2, 3, 4].map((close, index) => ({ time: `2026-01-0${index + 1}`, close }));
    const values = bollingerBands(bars, 3, 2);

    expect(values).toHaveLength(2);
    expect(values[0].middle).toBe(2);
    expect(values[0].upper).toBeCloseTo(3.632993);
    expect(values[0].lower).toBeCloseTo(0.367007);
    expect(values[1].middle).toBe(3);
  });

  it('returns no points until the first window is complete', () => {
    expect(bollingerBands([{ time: '2026-01-01', close: 10 }], 5)).toEqual([]);
  });

  it('validates period and deviation parameters', () => {
    expect(() => bollingerBands([], 1)).toThrow('Period must be an integer of at least 2.');
    expect(() => bollingerBands([], 20, 0)).toThrow('Deviations must be a positive number.');
  });
});
