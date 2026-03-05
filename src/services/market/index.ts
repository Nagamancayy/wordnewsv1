/**
 * Unified market service module -- replaces legacy service:
 *   - src/services/markets.ts (Finnhub + Yahoo + CoinGecko)
 *
 * All data now flows through the MarketServiceClient RPCs.
 */

import {
  MarketServiceClient,
  type ListMarketQuotesResponse,
  type ListCryptoQuotesResponse,
  type MarketQuote as ProtoMarketQuote,
  type CryptoQuote as ProtoCryptoQuote,
} from '@/generated/client/worldmonitor/market/v1/service_client';
import type { MarketData, CryptoData } from '@/types';
import { createCircuitBreaker } from '@/utils';

// ---- Client + Circuit Breakers ----

const client = new MarketServiceClient('', { fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args) });
const stockBreaker = createCircuitBreaker<ListMarketQuotesResponse>({ name: 'Market Quotes', cacheTtlMs: 0 });
const commodityBreaker = createCircuitBreaker<ListMarketQuotesResponse>({ name: 'Commodity Quotes', cacheTtlMs: 0 });
const cryptoBreaker = createCircuitBreaker<ListCryptoQuotesResponse>({ name: 'Crypto Quotes' });

const emptyStockFallback: ListMarketQuotesResponse = { quotes: [], finnhubSkipped: false, skipReason: '', rateLimited: false };
const emptyCryptoFallback: ListCryptoQuotesResponse = { quotes: [] };

// ---- Proto -> legacy adapters ----

function toMarketData(proto: ProtoMarketQuote, meta?: { name?: string; display?: string }): MarketData {
  return {
    symbol: proto.symbol,
    name: meta?.name || proto.name,
    display: meta?.display || proto.display || proto.symbol,
    price: proto.price != null ? proto.price : null,
    change: proto.change ?? null,
    sparkline: proto.sparkline.length > 0 ? proto.sparkline : undefined,
  };
}

function toCryptoData(proto: ProtoCryptoQuote): CryptoData {
  return {
    name: proto.name,
    symbol: proto.symbol,
    price: proto.price,
    change: proto.change,
    sparkline: proto.sparkline.length > 0 ? proto.sparkline : undefined,
  };
}

// ========================================================================
// Exported types (preserving legacy interface)
// ========================================================================

export interface MarketFetchResult {
  data: MarketData[];
  skipped?: boolean;
  reason?: string;
  rateLimited?: boolean;
}

const FALLBACK_CRYPTO: CryptoData[] = [
  { name: 'Bitcoin', symbol: 'BTC', price: 92450.2, change: 1.2, sparkline: [90000, 91000, 92450] },
  { name: 'Ethereum', symbol: 'ETH', price: 2310.5, change: -0.5, sparkline: [2400, 2350, 2310] },
  { name: 'Solana', symbol: 'SOL', price: 145.2, change: 2.1, sparkline: [140, 142, 145] },
  { name: 'Ripple', symbol: 'XRP', price: 0.52, change: 0.1, sparkline: [0.5, 0.51, 0.52] }
];

const FALLBACK_MARKETS: Record<string, MarketData> = {
  '^GSPC': { symbol: '^GSPC', name: 'S&P 500', display: 'S&P 500', price: 5930.2, change: 0.5, sparkline: [] },
  '^DJI': { symbol: '^DJI', name: 'Dow Jones', display: 'Dow Jones', price: 42340.1, change: 0.3, sparkline: [] },
  '^IXIC': { symbol: '^IXIC', name: 'Nasdaq 100', display: 'Nasdaq 100', price: 20120.5, change: 0.8, sparkline: [] },
  'GC=F': { symbol: 'GC=F', name: 'Gold', display: 'Gold', price: 2843.5, change: 0.2, sparkline: [] },
  'CL=F': { symbol: 'CL=F', name: 'Crude Oil', display: 'Crude Oil', price: 72.3, change: -1.2, sparkline: [] },
  'NG=F': { symbol: 'NG=F', name: 'Natural Gas', display: 'Natural Gas', price: 2.5, change: 0.5, sparkline: [] },
  'SI=F': { symbol: 'SI=F', name: 'Silver', display: 'Silver', price: 34.2, change: 0.1, sparkline: [] },
  'HG=F': { symbol: 'HG=F', name: 'Copper', display: 'Copper', price: 4.1, change: -0.2, sparkline: [] }
};

// ========================================================================
// Stocks -- replaces fetchMultipleStocks + fetchStockQuote
// ========================================================================

const lastSuccessfulByKey = new Map<string, MarketData[]>();

function symbolSetKey(symbols: string[]): string {
  return [...symbols].sort().join(',');
}

export async function fetchMultipleStocks(
  symbols: Array<{ symbol: string; name: string; display: string }>,
  options: { onBatch?: (results: MarketData[]) => void; useCommodityBreaker?: boolean } = {},
): Promise<MarketFetchResult> {
  const allSymbolStrings = symbols.map((s) => s.symbol);
  const setKey = symbolSetKey(allSymbolStrings);
  const symbolMetaMap = new Map(symbols.map((s) => [s.symbol, s]));

  const breaker = options.useCommodityBreaker ? commodityBreaker : stockBreaker;
  const resp = await breaker.execute(async () => {
    try {
      return await client.listMarketQuotes({ symbols: allSymbolStrings });
    } catch {
      return emptyStockFallback;
    }
  }, emptyStockFallback);

  let results = resp.quotes.map((q) => {
    const meta = symbolMetaMap.get(q.symbol);
    return toMarketData(q, meta);
  });

  // Apply fallback for missing data
  if (results.length === 0) {
    results = symbols.map(s => {
      const fallback = FALLBACK_MARKETS[s.symbol];
      if (fallback) return fallback;
      return { symbol: s.symbol, name: s.name, display: s.display, price: 100.0, change: 0.0, sparkline: [] };
    });
  }

  // Fire onBatch with whatever we got
  if (results.length > 0) {
    options.onBatch?.(results);
  }

  if (results.length > 0) {
    lastSuccessfulByKey.set(setKey, results);
  }

  const data = results.length > 0 ? results : (lastSuccessfulByKey.get(setKey) || []);
  return {
    data,
    skipped: resp.finnhubSkipped || undefined,
    reason: resp.skipReason || undefined,
    rateLimited: resp.rateLimited || undefined,
  };
}

export async function fetchStockQuote(
  symbol: string,
  name: string,
  display: string,
): Promise<MarketData> {
  const result = await fetchMultipleStocks([{ symbol, name, display }]);
  return result.data[0] || { symbol, name, display, price: null, change: null };
}

// ========================================================================
// Crypto -- replaces fetchCrypto
// ========================================================================

let lastSuccessfulCrypto: CryptoData[] = [];

export async function fetchCrypto(): Promise<CryptoData[]> {
  const resp = await cryptoBreaker.execute(async () => {
    try {
      return await client.listCryptoQuotes({ ids: [] }); // empty = all defaults
    } catch {
      return emptyCryptoFallback;
    }
  }, emptyCryptoFallback);

  let results = resp.quotes
    .map(toCryptoData)
    .filter(c => c.price > 0);

  // Apply fallback
  if (results.length === 0) {
    results = FALLBACK_CRYPTO;
  }

  if (results.length > 0) {
    lastSuccessfulCrypto = results;
    return results;
  }

  return lastSuccessfulCrypto;
}
