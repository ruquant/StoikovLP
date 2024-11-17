import { useMemo } from "react";
import { Market } from "hanji-ts-sdk";
import { TokenType, USD_DECIMALS } from "../constants";
import { formatNumber } from "../utils";
import { Level } from "./useOrderbook";

export const useOrderbookLevel = (level: Level, totalSize: number, token: TokenType, market: Market) => {
  const accumulatedWidth = useMemo(() => {
    return (level.accumulatedSize / totalSize) * 100;
  }, [level.accumulatedSize, totalSize]);

  const { size, total } = useMemo(() => {
    const roundingDecimals =
      token === TokenType.BASE
        ? market.tokenXScalingFactor
        : market.quoteToken.symbol === "USDC"
          ? USD_DECIMALS
          : market.quoteToken.roundingDecimals;

    const size =
      token === TokenType.BASE
        ? formatNumber(level.size, roundingDecimals, true)
        : formatNumber(level.value, roundingDecimals, true);
    const total =
      token === TokenType.BASE
        ? formatNumber(level.accumulatedSize, roundingDecimals, true)
        : formatNumber(level.accumulatedValue, roundingDecimals, true);
    return { size, total };
  }, [token, level, market]);

  return { accumulatedWidth, size, total };
};
