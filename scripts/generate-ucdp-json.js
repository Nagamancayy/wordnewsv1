const fs = require('fs');
const path = require('path');

const MAX_PAGES = 3;
const MAX_EVENTS = 1000;
const TRAILING_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

const VIOLENCE_TYPE_MAP = {
  1: 'state-based', // Adjusted to match UcdpGeoEvent type
  2: 'non-state',
  3: 'one-sided',
};

function buildVersionCandidates() {
  const year = new Date().getFullYear() - 2000;
  return [...new Set([`${year}.1`, `${year - 1}.1`, '25.1', '24.1'])];
}

async function fetchGedPage(version, page) {
  const url = `https://ucdpapi.pcr.uu.se/api/gedevents/${version}?pagesize=1000&page=${page}`;
  const resp = await fetch(url, { 
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    signal: AbortSignal.timeout(30000) 
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function discoverVersion() {
  const candidates = buildVersionCandidates();
  for (const version of candidates) {
    try {
      const page0 = await fetchGedPage(version, 0);
      if (Array.isArray(page0?.Result)) return { version, page0 };
    } catch {}
  }
  throw new Error('No valid UCDP GED version found');
}

async function main() {
  const { version, page0 } = await discoverVersion();
  const totalPages = Math.max(1, Number(page0?.TotalPages) || 1);
  const newestPage = totalPages - 1;

  const allEvents = [];
  for (let offset = 0; offset < MAX_PAGES && (newestPage - offset) >= 0; offset++) {
    const page = newestPage - offset;
    console.log(`Fetching page ${page}...`);
    try {
      const data = page === 0 ? page0 : await fetchGedPage(version, page);
      if (Array.isArray(data?.Result)) allEvents.push(...data.Result);
    } catch (err) {
      console.error(`Failed page ${page}`, err);
    }
  }

  const mapped = [];
  for (const e of allEvents) {
    mapped.push({
      id: String(e.id || ''),
      date_start: e.date_start ? new Date(e.date_start).toISOString().substring(0, 10) : '',
      date_end: e.date_end ? new Date(e.date_end).toISOString().substring(0, 10) : '',
      latitude: Number(e.latitude) || 0,
      longitude: Number(e.longitude) || 0,
      country: e.country || '',
      side_a: (e.side_a || '').substring(0, 200),
      side_b: (e.side_b || '').substring(0, 200),
      deaths_best: Number(e.best) || 0,
      deaths_low: Number(e.low) || 0,
      deaths_high: Number(e.high) || 0,
      type_of_violence: VIOLENCE_TYPE_MAP[e.type_of_violence] || 'state-based',
      source_original: (e.source_original || '').substring(0, 300),
    });
  }

  mapped.sort((a, b) => new Date(b.date_start).getTime() - new Date(a.date_start).getTime());
  const capped = mapped.slice(0, MAX_EVENTS);

  const outPath = path.join(__dirname, '..', 'public', 'data', 'ucdp-events-processed.json');
  fs.writeFileSync(outPath, JSON.stringify(capped, null, 2));
  console.log(`Saved ${capped.length} events to ${outPath}`);
}

main().catch(console.error);
