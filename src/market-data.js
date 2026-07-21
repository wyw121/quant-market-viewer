import Papa from 'papaparse';

const REQUIRED_FIELDS = ['date', 'open', 'high', 'low', 'close'];

function parseDate(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const timestamp = Date.parse(`${text}T00:00:00Z`);
    return Number.isNaN(timestamp) ? null : text;
  }

  const timestamp = Date.parse(text);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString().slice(0, 10);
}

function parseNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(String(value).replaceAll(',', '').trim());
  return Number.isFinite(number) ? number : null;
}

export function normalizeMarketRows(rows) {
  const byDate = new Map();
  const rejectedRows = [];
  const duplicateDates = [];

  rows.forEach((row, index) => {
    const line = index + 2;
    const time = parseDate(row.date);
    const open = parseNumber(row.open);
    const high = parseNumber(row.high);
    const low = parseNumber(row.low);
    const close = parseNumber(row.close);
    const volume = parseNumber(row.volume) ?? 0;

    if (!time || [open, high, low, close, volume].some((value) => value === null)) {
      rejectedRows.push({ line, reason: 'Invalid date or numeric value' });
      return;
    }

    if (high < Math.max(open, close, low) || low > Math.min(open, close, high) || volume < 0) {
      rejectedRows.push({ line, reason: 'Inconsistent OHLCV range' });
      return;
    }

    if (byDate.has(time)) duplicateDates.push(time);
    byDate.set(time, { time, open, high, low, close, volume });
  });

  const bars = [...byDate.values()].sort((left, right) => left.time.localeCompare(right.time));
  if (bars.length === 0) throw new Error('No valid market rows were found.');

  return { bars, rejectedRows, duplicateDates: [...new Set(duplicateDates)] };
}

export function parseMarketCsv(csvText) {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  const fields = parsed.meta.fields ?? [];
  const missing = REQUIRED_FIELDS.filter((field) => !fields.includes(field));
  if (missing.length > 0) throw new Error(`Missing required columns: ${missing.join(', ')}`);
  if (parsed.errors.some((error) => error.type === 'Quotes')) {
    throw new Error('The CSV contains an unterminated quoted field.');
  }

  return normalizeMarketRows(parsed.data);
}

export function calculateSnapshot(bars) {
  if (bars.length === 0) return null;

  const closes = bars.map((bar) => bar.close);
  const logReturns = closes.slice(1).map((close, index) => Math.log(close / closes[index]));
  const mean = logReturns.reduce((sum, value) => sum + value, 0) / Math.max(logReturns.length, 1);
  const variance =
    logReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    Math.max(logReturns.length - 1, 1);

  let peak = closes[0];
  let maxDrawdown = 0;
  closes.forEach((close) => {
    peak = Math.max(peak, close);
    maxDrawdown = Math.min(maxDrawdown, close / peak - 1);
  });

  return {
    totalReturn: closes.at(-1) / closes[0] - 1,
    annualizedVolatility: Math.sqrt(variance) * Math.sqrt(252),
    maxDrawdown,
    averageVolume: bars.reduce((sum, bar) => sum + bar.volume, 0) / bars.length,
  };
}

export function createSampleData(size = 180) {
  let seed = 20260721;
  let previousClose = 100;
  const bars = [];
  const date = new Date('2025-10-01T00:00:00Z');

  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  while (bars.length < size) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (date.getUTCDay() === 0 || date.getUTCDay() === 6) continue;

    const overnight = (random() - 0.49) * 0.018;
    const intraday = (random() - 0.47) * 0.035;
    const open = previousClose * (1 + overnight);
    const close = open * (1 + intraday);
    const range = 0.006 + random() * 0.018;
    const high = Math.max(open, close) * (1 + range * random());
    const low = Math.min(open, close) * (1 - range * random());
    const volume = Math.round(700000 + random() * 1700000 + Math.abs(intraday) * 35000000);

    bars.push({
      time: date.toISOString().slice(0, 10),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });
    previousClose = close;
  }

  return bars;
}
