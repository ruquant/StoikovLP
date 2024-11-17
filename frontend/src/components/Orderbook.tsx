import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@mui/material";
import clsx from "clsx";
import { useUnit } from "effector-react";
import { Market } from "hanji-ts-sdk";
import _ from "lodash";
import { ORDERBOOK_AGGREGATION, PERCENTAGE_DECIMALS, TokenType } from "@/constants";
import { Level, useOrderbook } from "@/hooks/useOrderbook";
import { $market } from "@/models/orderbook";
import { formatNumber } from "@/utils";
import { useOrderbookHighlight } from "../hooks/useOrderbookHighlight";
import { useOrderbookLevel } from "../hooks/useOrderbookLevel";
import { Cell, Table, TableBody, TableRow } from "./Containers";

export const Orderbook = () => {
  const market = useUnit($market)!;
  const [isFirstRender, setIsFirstRender] = React.useState(true);
  const [token, setToken] = useState(TokenType.BASE);
  const { asks, bids, spread } = useOrderbook();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleTokenChange = (token: string) => {
    setToken(token as TokenType);
  };

  useEffect(() => {
    if (isFirstRender && (asks.levels.length > 0 || bids.levels.length > 0)) {
      setIsFirstRender(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asks.levels, bids.levels]);

  useEffect(() => {
    setIsFirstRender(true);
  }, [market.id]);

  return (
    <Card sx={{ backgroundColor: "rgba(255, 255, 242, 0.03)", height: "700px" }}>
      <CardHeader title="Orderbook" />
      <CardContent>
        <div className="flex grow flex-col">
          <Table className="text-caption grow gap-1">
            <Cell size="s">
              <TableRow cols="grid-cols-orderbook text-label-secondary">
                <p>Price</p>
                <p className="text-right">
                  Size ({token === TokenType.BASE ? market.baseToken.symbol : market.quoteToken.symbol})
                </p>
                <p className="text-right">
                  Total ({token === TokenType.BASE ? market.baseToken.symbol : market.quoteToken.symbol})
                </p>
              </TableRow>
            </Cell>

            <TableBody className="h-[600px]">
              <div className="flex flex-col justify-center gap-1 md:gap-0">
                <div className="flex min-h-[240px] flex-col justify-end gap-1 md:gap-0">
                  {asks.levels.slice(-12).map((level) => (
                    <LevelItem
                      key={level.price}
                      level={level}
                      isAsk={true}
                      totalSize={asks.totalSize}
                      market={market}
                      token={token}
                      isOrderbookFirstRender={isFirstRender}
                    />
                  ))}
                </div>

                <div className="px-1 py-[2px]">
                  <p className="text-caption text-center text-label-secondary">
                    Spread {_.round(spread || 0, PERCENTAGE_DECIMALS)}%
                  </p>
                </div>

                <div className="flex min-h-[240px] flex-col justify-start gap-1 md:gap-0">
                  {bids.levels.slice(0, 12).map((level) => (
                    <LevelItem
                      key={level.price}
                      level={level}
                      isAsk={false}
                      totalSize={bids.totalSize}
                      market={market}
                      token={token}
                      isOrderbookFirstRender={isFirstRender}
                    />
                  ))}
                </div>
              </div>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

const LevelItem = ({
  level,
  totalSize,
  isAsk,
  market,
  token,
  isOrderbookFirstRender
}: {
  level: Level;
  totalSize: number;
  isAsk: boolean;
  market: Market;
  token: TokenType;
  isOrderbookFirstRender: boolean;
}) => {
  const highlight = useOrderbookHighlight(level, isOrderbookFirstRender);
  const { accumulatedWidth, size, total } = useOrderbookLevel(level, totalSize, token, market);

  return (
    <div>
      <Cell size="s" className="group relative cursor-pointer">
        <div
          className={clsx("absolute left-0 top-0 z-[5] h-full", isAsk ? "bg-red-transparent" : "bg-green-transparent")}
          style={{ width: `${accumulatedWidth}%` }}
        />
        <div
          className={clsx("absolute left-0 top-0 z-[5] h-full", isAsk ? "bg-orderbook-ask" : "bg-orderbook-bid")}
          style={{ width: `${(Number(level.size) / totalSize) * 100}%` }}
        />
        <div
          className={clsx(
            "absolute left-0 top-0 z-[5] h-full w-full",
            highlight && "highlight-level",
            isAsk ? "ask" : "bid"
          )}
        />

        <TableRow cols="grid-cols-orderbook">
          <p
            className={clsx("text-nowrap group-hover:font-bold", isAsk ? "text-label-negative" : "text-label-positive")}
          >
            {formatNumber(level.price, ORDERBOOK_AGGREGATION, true)}
          </p>
          <p className="text-nowrap text-right text-label-primary group-hover:text-label-primary lg:text-label-secondary">
            {size}
          </p>
          <p className="text-nowrap text-right text-label-primary group-hover:text-label-primary lg:text-label-secondary">
            {total}
          </p>
        </TableRow>
      </Cell>
    </div>
  );
};
