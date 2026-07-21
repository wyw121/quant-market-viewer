import { describe, expect, it } from 'vitest';
import { calculateSnapshot, normalizeMarketRows, parseMarketCsv } from '../src/market-data.js';

describe('parseMarketCsv', () => {
  it('normalizes headers, dates, and numeric values', () => {
    const result = parseMarketCsv(`Date,Open,High,Low,Close,Volume
2026-01-02,100,105,98,103,"1,200"
2026-01-03,103,106,101,104,900`);

    expect(result.bars).toEqual([
      { time: '2026-01-02', open: 100, high: 105, low: 98, close: 103, volume: 1200 },
      { time: '2026-01-03', open: 103, high: 106, low: 101, close: 104, volume: 900 },
    ]);
  });

  it('rejects malformed rows and keeps the valid observations', () => {
    const result = normalizeMarketRows([
      { date: '2026-01-02', open: 100, high: 105, low: 98, close: 103, volume: 1200 },
      { date: 'bad', open: 1, high: 2, low: 0, close: 1, volume: 5 },
      { date: '2026-01-04', open: 100, high: 99, low: 98, close: 101, volume: 5 },
    ]);

    expect(result.bars).toHaveLength(1);
    expect(result.rejectedRows).toHaveLength(2);
  });

  it('requires the OHLC columns', () => {
    expect(() => parseMarketCsv('date,close\n2026-01-02,100')).toThrow(
      'Missing required columns: open, high, low',
    );
  });
});

describe('calculateSnapshot', () => {
  it('calculates return and maximum drawdown', () => {
    const bars = [100, 120, 90, 110].map((close, index) => ({
      time: `2026-01-0${index + 1}`,
      open: close,
      high: close,
      low: close,
      close,
      volume: 100,
    }));

    const snapshot = calculateSnapshot(bars);
    expect(snapshot.totalReturn).toBeCloseTo(0.1);
    expect(snapshot.maxDrawdown).toBeCloseTo(-0.25);
    expect(snapshot.averageVolume).toBe(100);
  });
});
