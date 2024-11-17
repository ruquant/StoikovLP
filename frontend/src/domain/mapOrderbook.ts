import { Orderbook, OrderbookUpdate } from "hanji-ts-sdk";
import _ from "lodash";

export const mapOrderbookUpdates = (
  initialOrderbook: Orderbook | null,
  [, orderbookUpdate, isSnapshot]: [string, OrderbookUpdate, isSnapshot: boolean]
): Orderbook => {
  if (!initialOrderbook || isSnapshot) return orderbookUpdate;

  const orderbook: Orderbook = _.cloneDeep(initialOrderbook);
  orderbook.timestamp = orderbookUpdate.timestamp;

  _.forEach(orderbookUpdate.levels, (sideLevelsUpdates, side) => {
    const newSideLevels = [...orderbook.levels[side as "asks" | "bids"]];

    _.forEach(sideLevelsUpdates, (update) => {
      // find the index of the level with the same price
      const existingIndex = _.findIndex(newSideLevels, (level) => level.rawPrice === update.rawPrice);
      if (existingIndex !== -1) {
        if (!update.size.isZero()) {
          // update level
          newSideLevels[existingIndex] = update;
        } else {
          // remove level
          _.pullAt(newSideLevels, existingIndex);
        }
      } else {
        if (!update.size.isZero()) {
          // add new level
          newSideLevels.push(update);
        }
      }
    });

    if (side === "asks") {
      orderbook.levels.asks = _.orderBy(newSideLevels, ["price"], "asc");
    } else {
      orderbook.levels.bids = _.orderBy(newSideLevels, ["price"], "desc");
    }
  });

  return orderbook;
};
