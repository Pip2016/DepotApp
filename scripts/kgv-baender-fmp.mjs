// KGV-Bänder aus Financial Modeling Prep (FMP) berechnen.
//
// Liest die Titel aus data/kgv-baender-dividendenliste.csv (Spalte "Yahoo"),
// holt je Titel die Jahres-KGVs der letzten 5 Geschäftsjahre und das
// aktuelle KGV (TTM) und schreibt data/kgv-baender-fmp.csv.
//
// Aufruf:  FMP_API_KEY=... node scripts/kgv-baender-fmp.mjs
// Windows: set FMP_API_KEY=... && node scripts\kgv-baender-fmp.mjs
//
// Verbrauch: 2 Abrufe je Titel, bei 84 Titeln 168 von 250 Free-Tier-Abrufen am Tag.
// KGV-Werte <= 0 (Verlustjahre) zählen nicht ins Band, werden aber gezählt.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INPUT = path.join(root, 'data/kgv-baender-dividendenliste.csv');
const OUTPUT = path.join(root, 'data/kgv-baender-fmp.csv');
const BASE = 'https://financialmodelingprep.com/stable';
const YEARS = 5; // Free Tier erlaubt höchstens limit=5
const PAUSE_MS = 250;

const apiKey = process.env.FMP_API_KEY;
if (!apiKey) {
  console.error('FMP_API_KEY fehlt. Beispiel: FMP_API_KEY=dein_key node scripts/kgv-baender-fmp.mjs');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fmp(endpoint, params) {
  const qs = new URLSearchParams({ ...params, apikey: apiKey });
  const res = await fetch(`${BASE}/${endpoint}?${qs}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 160)}`);
  const data = JSON.parse(text);
  if (data && !Array.isArray(data) && data['Error Message']) throw new Error(data['Error Message']);
  return data;
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const de = (x) => (x == null || !Number.isFinite(x) ? '' : x.toFixed(2).replace('.', ','));

const lines = readFileSync(INPUT, 'utf8').trim().split(/\r?\n/);
const header = lines[0].split(';');
const iName = header.indexOf('Name');
const iSym = header.indexOf('Yahoo');
const titles = lines.slice(1).map((l) => {
  const c = l.split(';');
  return { name: c[iName], symbol: c[iSym] };
});

const out = [[
  'Name', 'Symbol', 'Jahre', 'Verlustjahre', 'KGV_Min', 'KGV_Median', 'KGV_Max',
  'KGV_aktuell_TTM', 'Abw_Median_Pct', 'Lage', 'Erstes_GJ', 'Letztes_GJ', 'Fehler',
]];
const counts = { unter: 0, nahe: 0, ueber: 0, 'n/a': 0, fehler: 0 };

for (const [i, t] of titles.entries()) {
  const row = { years: 0, losses: 0, min: null, med: null, max: null, ttm: null, first: '', last: '', err: '' };
  try {
    const annual = await fmp('ratios', { symbol: t.symbol, period: 'annual', limit: String(YEARS) });
    await sleep(PAUSE_MS);
    const pes = (Array.isArray(annual) ? annual : [])
      .map((r) => ({ pe: Number(r.priceToEarningsRatio), fy: r.fiscalYear ?? String(r.date ?? '').slice(0, 4) }))
      .filter((r) => Number.isFinite(r.pe));
    const positive = pes.filter((r) => r.pe > 0).map((r) => r.pe);
    row.years = pes.length;
    row.losses = pes.length - positive.length;
    if (positive.length) {
      row.min = Math.min(...positive);
      row.max = Math.max(...positive);
      row.med = median(positive);
    }
    const fys = pes.map((r) => String(r.fy)).filter(Boolean).sort();
    row.first = fys[0] ?? '';
    row.last = fys[fys.length - 1] ?? '';

    const ttm = await fmp('ratios-ttm', { symbol: t.symbol });
    await sleep(PAUSE_MS);
    const ttmPe = Number((Array.isArray(ttm) ? ttm[0] : ttm)?.priceToEarningsRatioTTM);
    row.ttm = Number.isFinite(ttmPe) ? ttmPe : null;
    if (!pes.length) row.err = 'keine Jahresdaten';
  } catch (e) {
    row.err = String(e.message || e).replace(/;/g, ',');
    counts.fehler++;
  }

  let dev = '';
  let lage = 'n/a';
  if (row.med && row.ttm && row.ttm > 0) {
    const d = (row.ttm / row.med - 1) * 100;
    dev = `${d >= 0 ? '+' : ''}${d.toFixed(0)}`;
    lage = d < -10 ? 'unter' : d > 10 ? 'ueber' : 'nahe';
  }
  counts[lage]++;
  out.push([t.name, t.symbol, row.years, row.losses, de(row.min), de(row.med), de(row.max),
    de(row.ttm), dev, lage, row.first, row.last, row.err]);
  console.log(`${String(i + 1).padStart(2)}/${titles.length} ${t.symbol.padEnd(10)} ${row.err || `${row.years} J., Median ${de(row.med)}, TTM ${de(row.ttm)}`}`);
}

writeFileSync(OUTPUT, out.map((r) => r.join(';')).join('\n') + '\n', 'utf8');
console.log(`\nGeschrieben: ${path.relative(root, OUTPUT)}`);
console.log(`unter ${counts.unter} · nahe ${counts.nahe} · ueber ${counts.ueber} · n/a ${counts['n/a']} · Fehler ${counts.fehler}`);
