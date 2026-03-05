import type { AviationServiceHandler } from '../../../../src/generated/server/worldmonitor/aviation/v1/service_server';

import { listAirportDelays } from './list-airport-delays';

export const aviationHandler: AviationServiceHandler = {
  listAirportDelays,

  // Stub implementations — the generated proto service expects all methods
  // to exist so that createAviationServiceRoutes can .bind() them.
  // Without these, .bind() on undefined crashes the entire Edge function,
  // killing ALL API routes (news, market, intelligence, etc.).

  async getAirportOpsSummary() {
    return { summaries: [], cacheHit: false };
  },

  async listAirportFlights() {
    return { flights: [], totalAvailable: 0, source: 'stub', updatedAt: Date.now() };
  },

  async getCarrierOps() {
    return { carriers: [], source: 'stub', updatedAt: Date.now() };
  },

  async getFlightStatus() {
    return { flights: [], source: 'stub', cacheHit: false };
  },

  async trackAircraft() {
    return { positions: [], source: 'stub', updatedAt: Date.now() };
  },

  async searchFlightPrices() {
    return {
      quotes: [],
      provider: 'stub',
      isDemoMode: true,
      isIndicative: false,
      updatedAt: Date.now(),
    };
  },

  async listAviationNews() {
    return { items: [], source: 'stub', updatedAt: Date.now() };
  },
};
