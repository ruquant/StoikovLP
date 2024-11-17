import { sample } from "effector";
import { MarketUpdate, OrderbookUpdate } from "hanji-ts-sdk";
import { MARKET } from "@/constants";
import { mapOrderbookUpdates } from "@/domain/mapOrderbook";
import {
  $market,
  $orderbook,
  marketUpdated,
  orderbookUpdated,
  subscribeToMarketFx,
  subscribeToOrderbookFx,
  unsubscribeFromMarketFx,
  unsubscribeFromOrderbookFx
} from ".";

/**
 * Orderbook
 */

sample({
  clock: orderbookUpdated,
  source: $orderbook,
  fn: (orderbook, updates) => mapOrderbookUpdates(orderbook, updates),
  target: $orderbook
});

const orderbookUpdateListener = (marketId: string, isSnapshot: boolean, data: OrderbookUpdate) =>
  orderbookUpdated([marketId, data, isSnapshot]);

subscribeToOrderbookFx.use(({ client, ...params }) => {
  client.spot.subscribeToOrderbook(params);
  client.spot.events.orderbookUpdated.addListener(orderbookUpdateListener);
});

unsubscribeFromOrderbookFx.use(({ client, ...params }) => {
  client.spot.unsubscribeFromOrderbook(params);
  client.spot.events.orderbookUpdated.removeListener(orderbookUpdateListener);
});

/**
 * Market
 */

$market.on(marketUpdated, (_, payload) => payload);

const marketUpdatedListener = (_isSnapshot: boolean, data: MarketUpdate[]) => {
  const market = data.find((market) => market.id === MARKET);
  if (market) marketUpdated(market);
};

subscribeToMarketFx.use((client) => {
  client.spot.subscribeToAllMarkets();
  client.spot.events.allMarketUpdated.addListener(marketUpdatedListener);
});

unsubscribeFromMarketFx.use((client) => {
  client.spot.unsubscribeFromAllMarkets();
  client.spot.events.allMarketUpdated.removeListener(marketUpdatedListener);
});
