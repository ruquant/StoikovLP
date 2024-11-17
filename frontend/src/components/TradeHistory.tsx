import React from "react";
import clsx from "clsx";
import { useUnit } from "effector-react";
import { Fill } from "hanji-ts-sdk";
import { EXPLORER_URL, OrderSide } from "@/constants";
import { $fills } from "@/models/info";
import { $market } from "@/models/orderbook";
import { formatNumber, getFormattedDate, getFormattedTime, roundNumberWithMaxDigits } from "@/utils";
import { Table, TableBody, TableItem, TableRow } from "./Containers";

export const TradeHistory = () => {
  const fills = useUnit($fills);

  return (
    <Table className="grow">
      <TableRow cols="grid-cols-fills text-caption" className="border-grey-3 gap-2 border-b pb-2 text-label-secondary">
        <div className="py-[2px] pl-[2px]">Time</div>
        <div className="py-[2px] text-center">Coin</div>
        <div className="py-[2px]">Type</div>
        <div className="py-[2px]">Direction</div>
        <div className="py-[2px]">Price</div>
        <div className="py-[2px]">Size</div>
        <div className="py-[2px]">Trade Value</div>
        <div className="py-[2px]">Fee</div>
      </TableRow>

      {fills.length ? (
        <TableBody className="min-h-[470px]">
          {fills.map((fill) => (
            <TradeItem key={fill.tradeId + fill.orderId} fill={fill} />
          ))}
        </TableBody>
      ) : (
        <div className="flex h-[140px] w-full items-center justify-center">
          <p className="text-body-m text-grey-2">You haven&apos;t had any trades yet</p>
        </div>
      )}
    </Table>
  );
};

const TradeItem = ({ fill }: { fill: Fill }) => {
  const market = useUnit($market);

  if (!market) {
    return null;
  }

  return (
    <TableRow cols="grid-cols-fills" className="border-grey-3 items-center gap-2 border-b py-2">
      <TableItem>
        <a
          href={`${EXPLORER_URL}/tx/${fill.txnHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:underline"
        >
          <p>
            {getFormattedDate(fill.timestamp)} - {getFormattedTime(fill.timestamp)}
          </p>
        </a>
      </TableItem>

      <TableItem>
        <p className={clsx("text-center", fill.side === OrderSide.BID ? "text-green" : "text-red")}>
          {market.baseToken.symbol} / {market.quoteToken.symbol}
        </p>
      </TableItem>

      <TableItem>
        <p className={clsx("capitalize", fill.side === OrderSide.BID ? "text-green" : "text-red")}>{fill.type}</p>
      </TableItem>

      <TableItem>
        <p className={clsx("capitalize", fill.side === OrderSide.BID ? "text-green" : "text-red")}>
          {fill.side === OrderSide.BID ? "buy" : "sell"}
        </p>
      </TableItem>

      <TableItem>
        <p>
          {formatNumber(fill.price, market.priceScalingFactor)} {market.quoteToken.symbol}
        </p>
      </TableItem>

      <TableItem>
        <p>
          {formatNumber(fill.size, market.tokenXScalingFactor)} {market.baseToken.symbol}
        </p>
      </TableItem>

      <TableItem>
        <p>
          {formatNumber(roundNumberWithMaxDigits(fill.size.times(fill.price), market.quoteToken.roundingDecimals))}{" "}
          {market.quoteToken.symbol}
        </p>
      </TableItem>

      <TableItem>
        <p>
          {formatNumber(fill.fee, market.tokenYScalingFactor)} {market.quoteToken.symbol}
        </p>
      </TableItem>
    </TableRow>
  );
};
