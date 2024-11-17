import { createEffect, createEvent, createStore } from "effector";
import { HanjiClient, Market, MarketUpdate, Orderbook, OrderbookUpdate } from "hanji-ts-sdk";

/** STORES */

export const $market = createStore<Market | null>(null);
export const $orderbook = createStore<Orderbook | null>(null);

/** EVENTS */

export const marketUpdated = createEvent<MarketUpdate>();
export const orderbookUpdated = createEvent<[marketId: string, OrderbookUpdate, isSnapshot: boolean]>();

/** EFFECTS */

export const subscribeToMarketFx = createEffect<HanjiClient, void>();
export const unsubscribeFromMarketFx = createEffect<HanjiClient, void>();

export const subscribeToOrderbookFx = createEffect<
  { client: HanjiClient; market: string; aggregation: number },
  void
>();

export const unsubscribeFromOrderbookFx = createEffect<
  { client: HanjiClient; market: string; aggregation: number },
  void
>();
