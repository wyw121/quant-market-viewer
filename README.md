# Quant Market Viewer

A local-first frontend for inspecting daily OHLCV market data. Import a CSV and
switch between candlestick and close-price views while monitoring volume, a
20-session simple moving average, total return, annualized volatility, and
maximum drawdown.

## Run locally

```bash
npm install
npm run dev
```

Production validation:

```bash
npm test
npm run build
```

## CSV schema

The header is case-insensitive. Required columns are `date`, `open`, `high`,
`low`, and `close`; `volume` is optional.

```csv
date,open,high,low,close,volume
2026-01-02,100.00,104.50,98.75,103.20,1250000
2026-01-05,103.10,106.00,102.40,105.70,980000
```

Rows with malformed numbers or inconsistent OHLC ranges are rejected and
reported in the data-quality panel. Duplicate dates keep the last observation.
All parsing and charting happen in the browser; imported files are not uploaded.

## License

MIT
