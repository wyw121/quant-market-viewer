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

export function bollingerBands(bars, period = 20, deviations = 2) {
  if (!Number.isInteger(period) || period < 2) throw new Error('Period must be an integer of at least 2.');
  if (!Number.isFinite(deviations) || deviations <= 0) {
    throw new Error('Deviations must be a positive number.');
  }
  if (bars.length < period) return [];

  let sum = 0;
  let squaredSum = 0;
  const values = [];

  bars.forEach((bar, index) => {
    sum += bar.close;
    squaredSum += bar.close ** 2;

    if (index >= period) {
      sum -= bars[index - period].close;
      squaredSum -= bars[index - period].close ** 2;
    }

    if (index >= period - 1) {
      const middle = sum / period;
      const variance = Math.max(squaredSum / period - middle ** 2, 0);
      const offset = Math.sqrt(variance) * deviations;
      values.push({
        time: bar.time,
        middle,
        upper: middle + offset,
        lower: middle - offset,
      });
    }
  });

  return values;
}
