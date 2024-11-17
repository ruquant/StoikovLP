import { sample } from "effector";
import { FillUpdate, OrderHistoryUpdate, OrderUpdate } from "hanji-ts-sdk";
import _ from "lodash";
import { OrderStatus } from "@/constants";
import {
  $fills,
  $openOrders,
  $orderHistory,
  $orders,
  fillsUpdated,
  orderHistoryUpdated,
  ordersUpdated,
  subscribeToFillsFx,
  subscribeToOrderHistoryFx,
  subscribeToOrdersFx,
  unsubscribeFromFillsFx,
  unsubscribeFromOrderHistoryFx,
  unsubscribeFromOrdersFx
} from ".";

/**
 * User's fills
 */

$fills.on(fillsUpdated, (state, [fillUpdates, isSnapshot]) => {
  if (isSnapshot) return fillUpdates;
  const fills = _.unionBy(fillUpdates, state, (fill) => fill.orderId + fill.tradeId + fill.market.id);
  return fills;
});

const fillsUpdatedListener = (_marketId: string, isSnapshot: boolean, data: FillUpdate[]) =>
  fillsUpdated([data, isSnapshot]);

subscribeToFillsFx.use(({ client, ...params }) => {
  client.spot.subscribeToUserFills(params);
  client.spot.events.userFillsUpdated.addListener(fillsUpdatedListener);
});

unsubscribeFromFillsFx.use(({ client, ...params }) => {
  client.spot.unsubscribeFromUserFills(params);
  client.spot.events.userFillsUpdated.removeListener(fillsUpdatedListener);
});

/**
 * User's orders
 */

$orders.on(ordersUpdated, (state, [orderUpdates, isSnapshot]) => {
  if (isSnapshot) return orderUpdates;
  const orders = _.unionBy(orderUpdates, state, (order) => order.orderId + order.market.id);
  return orders;
});

sample({
  source: $orders,
  fn: (orders) => _.filter(orders, (order) => order.status === OrderStatus.OPEN || order.status === OrderStatus.FILLED),
  target: $openOrders
});

const ordersUpdatedListener = (_marketId: string, isSnapshot: boolean, data: OrderUpdate[]) =>
  ordersUpdated([data, isSnapshot]);

subscribeToOrdersFx.use(({ client, ...params }) => {
  client.spot.subscribeToUserOrders(params);
  client.spot.events.userOrdersUpdated.addListener(ordersUpdatedListener);
});

unsubscribeFromOrdersFx.use(({ client, ...params }) => {
  client.spot.unsubscribeFromUserOrders(params);
  client.spot.events.userOrdersUpdated.removeListener(ordersUpdatedListener);
});

/**
 * User's order history
 */

$orderHistory.on(orderHistoryUpdated, (state, [orderHistoryUpdates, isSnapshot]) => {
  let orderHistory;

  if (isSnapshot) {
    orderHistory = orderHistoryUpdates;
  } else {
    orderHistory = _.unionBy(
      orderHistoryUpdates,
      state,
      (order) => order.orderId + order.timestamp + order.status + order.rawSize.toString()
    );
  }
  const sortedOrderHistory = _.orderBy(
    orderHistory,
    [
      "timestamp",
      (order) => {
        const statusOrder = {
          [OrderStatus.REJECTED]: 0,
          [OrderStatus.CLAIMED]: 1,
          [OrderStatus.CANCELLED]: 2,
          [OrderStatus.FILLED]: 3,
          [OrderStatus.OPEN]: 4
        };
        return statusOrder[order.status] || 0;
      }
    ],
    ["desc", "asc"]
  );
  return sortedOrderHistory;
});

const orderHistoryUpdatedListener = (_marketId: string, isSnapshot: boolean, data: OrderHistoryUpdate[]) =>
  orderHistoryUpdated([data, isSnapshot]);

subscribeToOrderHistoryFx.use(({ client, ...params }) => {
  client.spot.subscribeToUserOrderHistory(params);
  client.spot.events.userOrderHistoryUpdated.addListener(orderHistoryUpdatedListener);
});

unsubscribeFromOrderHistoryFx.use(({ client, ...params }) => {
  client.spot.unsubscribeFromUserOrderHistory(params);
  client.spot.events.userOrderHistoryUpdated.removeListener(orderHistoryUpdatedListener);
});
