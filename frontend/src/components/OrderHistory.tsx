import React, { useState } from "react";
import clsx from "clsx";
import { useUnit } from "effector-react";
import { OrderHistory as OrderHistoryType } from "hanji-ts-sdk";
import { EXPLORER_URL, OrderSide, OrderStatus } from "@/constants";
import { $orderHistory } from "@/models/info";
import { $market } from "@/models/orderbook";
import { formatNumber, getFormattedDate, getFormattedTime } from "@/utils";
import { Table, TableBody, TableItem, TableRow } from "./Containers";
import { CopyToClickboard } from "./CopyToClickboard";

export const OrderHistory = () => {
  const orders = useUnit($orderHistory);
  const [copiedId, setCopiedId] = useState("");

  return (
    <Table className="grow">
      <TableRow
        cols="grid-cols-order-history text-caption"
        className="border-grey-3 gap-2 border-b pb-2 text-label-secondary"
      >
        <div className="py-[2px] pl-[2px]">Time</div>
        <div className="py-[2px] text-center">Coin</div>
        <div className="py-[2px]">Type</div>
        <div className="py-[2px]">Direction</div>
        <div className="py-[2px]">Size</div>
        <div className="py-[2px]">Filled Size</div>
        <div className="py-[2px]">Price</div>
        <div className="py-[2px]">Claimed</div>
        <div className="py-[2px]">Status</div>
        <div className="py-[2px]">Order ID</div>
      </TableRow>

      {orders.length ? (
        <TableBody className="min-h-[470px]">
          {orders.map((order) => (
            <OrderItem
              key={order.orderId + order.timestamp + order.status + order.rawSize.toString()}
              order={order}
              copiedId={copiedId}
              setCopiedId={setCopiedId}
            />
          ))}
        </TableBody>
      ) : (
        <div className="flex h-[140px] w-full items-center justify-center">
          <p className="text-body-m text-grey-2">You don&apos;t have orders history</p>
        </div>
      )}
    </Table>
  );
};

const OrderItem = ({
  order,
  copiedId,
  setCopiedId
}: {
  order: OrderHistoryType;
  copiedId: string;
  setCopiedId: (v: string) => void;
}) => {
  const market = useUnit($market);

  if (!market) {
    return null;
  }

  return (
    <TableRow cols="grid-cols-order-history" className="border-grey-3 items-center gap-2 border-b py-2">
      <TableItem>
        <a
          href={`${EXPLORER_URL}/tx/${order.txnHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:underline"
        >
          <p>
            {getFormattedDate(order.timestamp)} - {getFormattedTime(order.timestamp)}
          </p>
        </a>
      </TableItem>

      <TableItem>
        <p className={clsx("text-center", order.side === OrderSide.BID ? "text-green" : "text-red")}>
          {market.baseToken.symbol} / {market.quoteToken.symbol}
        </p>
      </TableItem>

      <TableItem>
        <p className={clsx("capitalize", order.side === OrderSide.BID ? "text-green" : "text-red")}>{order.type}</p>
      </TableItem>

      <TableItem>
        <p className={clsx("capitalize", order.side === OrderSide.BID ? "text-green" : "text-red")}>
          {order.side === OrderSide.BID ? "buy" : "sell"}
        </p>
      </TableItem>

      <TableItem>
        <p>
          {order.status === OrderStatus.OPEN ? formatNumber(order.size, market.tokenXScalingFactor) : "-/-"}{" "}
          {order.status === OrderStatus.OPEN && market.baseToken.symbol}
        </p>
      </TableItem>

      <TableItem>
        <p>
          {formatNumber(order.origSize.minus(order.size), market.tokenXScalingFactor)} {market.baseToken.symbol}
        </p>
      </TableItem>

      <TableItem>
        <p>
          {formatNumber(order.price, market.priceScalingFactor)} {market.quoteToken.symbol}
        </p>
      </TableItem>

      <TableItem>
        <p>
          {formatNumber(order.claimed, market.tokenXScalingFactor)} {market.baseToken.symbol}
        </p>
      </TableItem>

      <TableItem>
        <p className="uppercase">{order.status}</p>
      </TableItem>

      <TableItem>
        <CopyToClickboard
          id={order.orderId + order.timestamp + order.status + order.rawSize.toString()}
          isCopied={copiedId === order.orderId}
          onCopy={setCopiedId}
          valueToCopy={order.orderId}
        >
          {order.orderId.slice(0, 4)}...{order.orderId.slice(-4)}
        </CopyToClickboard>
      </TableItem>
    </TableRow>
  );
};
