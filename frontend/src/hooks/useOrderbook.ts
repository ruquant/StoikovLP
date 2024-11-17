import { useMemo } from "react";
import BigNumber from "bignumber.js";
import { useUnit } from "effector-react";
import _ from "lodash";
import { $openOrders } from "@/models/info";
import { $market, $orderbook } from "../models/orderbook";

export interface Level {
  price: number;
  size: number;
  value: number;
  accumulatedSize: number;
  accumulatedValue: number;
  vaultSize: number;
}

export const useOrderbook = () => {
  const openOrders = useUnit($openOrders);
  const market = useUnit($market)!;
  const orderbook = useUnit($orderbook)?.levels;

  const { asks, bids } = useMemo(() => {
    const extendedOrderbook: {
      asks: { levels: Level[]; totalSize: number };
      bids: { levels: Level[]; totalSize: number };
    } = {
      asks: {
        levels: [],
        totalSize: 0
      },
      bids: {
        levels: [],
        totalSize: 0
      }
    };

    _.forEach(orderbook, (sideLevels, side) => {
      let accumulatedSize = new BigNumber(0);
      let accumulatedValue = new BigNumber(0);

      const levels = _.map(sideLevels, (level) => {
        const value = level.size.times(level.price);
        accumulatedSize = accumulatedSize.plus(level.size);
        accumulatedValue = accumulatedValue.plus(value);

        const vaultSize = openOrders.reduce((acc, order) => {
          if (order.price === level.price) {
            return acc + Number(order.size);
          }
          return acc;
        }, 0);

        return {
          price: Number(level.price),
          size: Number(level.size),
          value: Number(value),
          accumulatedSize: Number(accumulatedSize),
          accumulatedValue: Number(accumulatedValue),
          vaultSize
        };
      });

      extendedOrderbook[side as "asks" | "bids"] = {
        levels,
        totalSize: Number(accumulatedSize)
      };
    });

    return {
      bids: extendedOrderbook.bids,
      asks: { ...extendedOrderbook.asks, levels: extendedOrderbook.asks.levels.toReversed() }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderbook, market, openOrders]);

  const spread = useMemo(() => {
    if (!asks.levels.length || !bids.levels.length) return null;

    const askPrice = asks.levels.slice(-1)[0].price;
    const bidPrice = bids.levels[0].price;

    const midpointPrice = (askPrice + bidPrice) / 2;
    const spread = ((askPrice - bidPrice) / midpointPrice) * 100;

    return spread;
  }, [asks, bids]);

  return { asks, bids, spread };
};
