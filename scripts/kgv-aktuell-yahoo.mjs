// Aktuelles KGV von Yahoo Finance in die KGV-Bänder eintragen.
//
// Liest die 10-Jahres-Bänder aus data/kgv-baender-dividendenliste.csv (GuruFocus),
// holt je Titel das aktuelle KGV (trailingPE) von Yahoo und schreibt
// data/kgv-baender-aktuell.csv mit neuem KGV_aktuell, Abw_Median_Pct, Lage und KGV_Stand.
// Liefert Yahoo für einen Titel kein KGV, bleibt der GuruFocus-Wert stehen (KGV_Quelle).
//
// Aufruf: node scripts/kgv-aktuell-yahoo.mjs   (kein API-Key nötig)
// Läuft täglich per .github/workflows/kgv-aktuell.yml.
//
// Die Yahoo-Schnittstelle ist inoffiziell. Kommen weniger als MIN_SHARE der Titel
// zurück, bricht das Skript ab und lässt die alte Datei stehen.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INPUT = path.join(root, 'data/kgv-baender-dividendenliste.csv');
const OUTPUT = path.join(root, 'data/kgv-baender-aktuell.csv');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
const CHUNK = 50;
const MIN_SHARE = 0.5;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Semikolon-CSV mit Anführungszeichen (Hinweis-Spalte enthält "a; b").
function parseLine(line) {
  const cells = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ';') { cells.push(cur); cur = ''; }
    else cur += ch;
  }
  cells.push(cur);
  return cells;
}

const quote = (s) => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const num = (s) => (s ? Number(s.replace(',', '.')) : NaN);
const de = (x) => x.toFixed(2).replace('.', ',');

async function yahooSession() {
  const res = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'manual' });
  const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  if (!cookie) throw new Error('Yahoo: kein Cookie erhalten');
  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, Cookie: cookie },
  });
  const crumb = await crumbRes.text();
  if (!crumbRes.ok || !crumb || crumb.includes('<')) throw new Error(`Yahoo: kein Crumb (HTTP ${crumbRes.status})`);
  return { cookie, crumb };
}

async function fetchPEs(symbols) {
  for (let attempt = 1; ; attempt++) {
    try {
      const { cookie, crumb } = await yahooSession();
      const pes = new Map();
      for (let i = 0; i < symbols.length; i += CHUNK) {
        const qs = new URLSearchParams({ symbols: symbols.slice(i, i + CHUNK).join(','), fields: 'trailingPE', crumb });
        const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?${qs}`, {
          headers: { 'User-Agent': UA, Cookie: cookie },
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`Yahoo quote HTTP ${res.status}: ${text.slice(0, 160)}`);
        for (const q of JSON.parse(text).quoteResponse?.result ?? []) {
          if (Number.isFinite(q.trailingPE) && q.trailingPE > 0) pes.set(q.symbol, q.trailingPE);
        }
      }
      return pes;
    } catch (e) {
      if (attempt >= 3) throw e;
      console.error(`Versuch ${attempt} fehlgeschlagen: ${e.message}`);
      await sleep(5000 * attempt);
    }
  }
}

const lines = readFileSync(INPUT, 'utf8').trim().split(/\r?\n/);
const header = parseLine(lines[0]);
const col = (name) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`Spalte ${name} fehlt in ${path.basename(INPUT)}`);
  return i;
};
const iSym = col('Yahoo');
const iMed = col('KGV_Median_10J');
const iKgv = col('KGV_aktuell');
const iAbw = col('Abw_Median_Pct');
const iLage = col('Lage');
const iStand = col('KGV_Stand');
const rows = lines.slice(1).map(parseLine);

const pes = await fetchPEs(rows.map((r) => r[iSym]));
if (pes.size < rows.length * MIN_SHARE) {
  console.error(`Nur ${pes.size}/${rows.length} KGVs von Yahoo, ${path.basename(OUTPUT)} bleibt unverändert.`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const counts = { unter: 0, nahe: 0, ueber: 0, 'n/a': 0 };
const outHeader = [...header];
outHeader.splice(iStand + 1, 0, 'KGV_Quelle');

const out = rows.map((r) => {
  const row = [...r];
  const pe = pes.get(r[iSym]);
  if (pe != null) {
    row[iKgv] = de(pe);
    row[iStand] = today;
  }
  const kgv = num(row[iKgv]);
  const med = num(row[iMed]);
  if (kgv > 0 && med > 0) {
    const d = (kgv / med - 1) * 100;
    row[iAbw] = `${d >= 0 ? '+' : ''}${d.toFixed(0)}`;
    row[iLage] = d < -10 ? 'unter' : d > 10 ? 'ueber' : 'nahe';
  } else {
    row[iAbw] = '';
    row[iLage] = 'n/a';
  }
  counts[row[iLage]]++;
  row.splice(iStand + 1, 0, pe != null ? 'Yahoo' : 'GuruFocus');
  if (pe == null) console.log(`${r[iSym].padEnd(10)} kein KGV von Yahoo, GuruFocus-Wert bleibt (${r[iKgv]}, ${r[iStand]})`);
  return row;
});

writeFileSync(OUTPUT, [outHeader, ...out].map((r) => r.map(quote).join(';')).join('\n') + '\n', 'utf8');
console.log(`\nGeschrieben: ${path.relative(root, OUTPUT)} (${pes.size}/${rows.length} von Yahoo)`);
console.log(`unter ${counts.unter} · nahe ${counts.nahe} · ueber ${counts.ueber} · n/a ${counts['n/a']}`);
