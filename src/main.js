import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  createChart,
} from 'lightweight-charts';
import {
  ArrowRight,
  ChartCandlestick,
  ChartNoAxesCombined,
  Code2,
  RotateCcw,
  Upload,
  createIcons,
} from 'lucide';
import { simpleMovingAverage } from './indicators.js';
import { calculateSnapshot, createSampleData, parseMarketCsv } from './market-data.js';
import './style.css';

const colors = {
  ink: '#1c2430',
  muted: '#6b7280',
  grid: '#e8e9ec',
  green: '#14835d',
  red: '#c44949',
  blue: '#2d5bd1',
  amber: '#bd7b14',
};

const elements = {
  chart: document.querySelector('#chart'),
  datasetLabel: document.querySelector('#dataset-label'),
  fileInput: document.querySelector('#file-input'),
  importButton: document.querySelector('#import-button'),
  resetButton: document.querySelector('#reset-button'),
  modeButtons: [...document.querySelectorAll('[data-mode]')],
  smaToggle: document.querySelector('#sma-toggle'),
  rowCount: document.querySelector('#row-count'),
  totalReturn: document.querySelector('#total-return'),
  volatility: document.querySelector('#volatility'),
  maxDrawdown: document.querySelector('#max-drawdown'),
  averageVolume: document.querySelector('#average-volume'),
  rejectedRows: document.querySelector('#rejected-rows'),
  duplicateDates: document.querySelector('#duplicate-dates'),
  statusMessage: document.querySelector('#status-message'),
  latestPrice: document.querySelector('#latest-price'),
  latestChange: document.querySelector('#latest-change'),
  startDate: document.querySelector('#start-date'),
  endDate: document.querySelector('#end-date'),
  recentRows: document.querySelector('#recent-rows'),
};

const chart = createChart(elements.chart, {
  autoSize: true,
  layout: {
    background: { type: ColorType.Solid, color: '#ffffff' },
    textColor: colors.muted,
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  },
  grid: {
    vertLines: { color: colors.grid },
    horzLines: { color: colors.grid },
  },
  rightPriceScale: { borderColor: '#d9dce1' },
  timeScale: { borderColor: '#d9dce1', timeVisible: false },
  localization: { priceFormatter: (price) => price.toFixed(2) },
});

let state = {
  bars: createSampleData(),
  mode: 'candlestick',
  quality: { rejectedRows: [], duplicateDates: [] },
};
let priceSeries;

const volumeSeries = chart.addSeries(HistogramSeries, {
  priceFormat: { type: 'volume' },
  priceScaleId: 'volume',
  lastValueVisible: false,
  priceLineVisible: false,
});
chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });

const smaSeries = chart.addSeries(LineSeries, {
  color: colors.amber,
  lineWidth: 2,
  priceLineVisible: false,
  lastValueVisible: false,
  title: 'SMA 20',
});

function formatPercent(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompact(value) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function renderPriceSeries() {
  if (priceSeries) chart.removeSeries(priceSeries);

  if (state.mode === 'candlestick') {
    priceSeries = chart.addSeries(CandlestickSeries, {
      upColor: colors.green,
      downColor: colors.red,
      borderVisible: false,
      wickUpColor: colors.green,
      wickDownColor: colors.red,
    });
    priceSeries.setData(state.bars);
  } else {
    priceSeries = chart.addSeries(LineSeries, {
      color: colors.blue,
      lineWidth: 2,
      priceLineVisible: true,
    });
    priceSeries.setData(state.bars.map((bar) => ({ time: bar.time, value: bar.close })));
  }
}

function renderTable() {
  elements.recentRows.replaceChildren(
    ...state.bars
      .slice(-6)
      .reverse()
      .map((bar) => {
        const row = document.createElement('tr');
        [bar.time, bar.open, bar.high, bar.low, bar.close, formatCompact(bar.volume)].forEach((value) => {
          const cell = document.createElement('td');
          cell.textContent = typeof value === 'number' ? value.toFixed(2) : value;
          row.append(cell);
        });
        return row;
      }),
  );
}

function renderDashboard({ fit = true } = {}) {
  const { bars, quality } = state;
  const snapshot = calculateSnapshot(bars);
  const latest = bars.at(-1);
  const previous = bars.at(-2) ?? latest;
  const dailyChange = latest.close / previous.close - 1;

  renderPriceSeries();
  volumeSeries.setData(
    bars.map((bar) => ({
      time: bar.time,
      value: bar.volume,
      color: bar.close >= bar.open ? '#14835d55' : '#c4494955',
    })),
  );
  smaSeries.setData(elements.smaToggle.checked ? simpleMovingAverage(bars, 20) : []);

  elements.rowCount.textContent = `${bars.length} rows`;
  elements.totalReturn.textContent = formatPercent(snapshot.totalReturn);
  elements.volatility.textContent = formatPercent(snapshot.annualizedVolatility);
  elements.maxDrawdown.textContent = formatPercent(snapshot.maxDrawdown);
  elements.averageVolume.textContent = formatCompact(snapshot.averageVolume);
  elements.rejectedRows.textContent = quality.rejectedRows.length;
  elements.duplicateDates.textContent = quality.duplicateDates.length;
  elements.latestPrice.textContent = latest.close.toFixed(2);
  elements.latestChange.textContent = formatPercent(dailyChange);
  elements.latestChange.classList.toggle('negative', dailyChange < 0);
  elements.startDate.textContent = bars[0].time;
  elements.endDate.textContent = latest.time;

  renderTable();
  if (fit) chart.timeScale().fitContent();
}

function loadSample() {
  state.bars = createSampleData();
  state.quality = { rejectedRows: [], duplicateDates: [] };
  elements.datasetLabel.textContent = 'Synthetic daily sample';
  elements.statusMessage.textContent = 'Sample data loaded';
  elements.fileInput.value = '';
  renderDashboard();
}

elements.importButton.addEventListener('click', () => elements.fileInput.click());
elements.resetButton.addEventListener('click', loadSample);
elements.fileInput.addEventListener('change', async () => {
  const [file] = elements.fileInput.files;
  if (!file) return;

  try {
    const parsed = parseMarketCsv(await file.text());
    state.bars = parsed.bars;
    state.quality = parsed;
    elements.datasetLabel.textContent = file.name;
    elements.statusMessage.textContent = `${parsed.bars.length} valid rows loaded`;
    renderDashboard();
  } catch (error) {
    elements.statusMessage.textContent = error.message;
    elements.fileInput.value = '';
  }
});

elements.modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.mode = button.dataset.mode;
    elements.modeButtons.forEach((candidate) => {
      candidate.classList.toggle('active', candidate === button);
    });
    renderDashboard({ fit: false });
  });
});
elements.smaToggle.addEventListener('change', () => {
  smaSeries.setData(elements.smaToggle.checked ? simpleMovingAverage(state.bars, 20) : []);
});

createIcons({
  icons: { ArrowRight, ChartCandlestick, ChartNoAxesCombined, Code2, RotateCcw, Upload },
});
renderDashboard();
