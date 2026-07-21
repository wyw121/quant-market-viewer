export function simpleMovingAverage(bars, period = 20) {
  if (!Number.isInteger(period) || period < 1) throw new Error('Period must be a positive integer.');
  if (bars.length < period) return [];

  let sum = 0;
  const values = [];
  bars.forEach((bar, index) => {
    sum += bar.close;
    if (index >= period) sum -= bars[index - period].close;
    if (index >= period - 1) values.push({ time: bar.time, value: sum / period });
  });
  return values;
}
