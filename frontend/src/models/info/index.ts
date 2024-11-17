import { createEffect, createEvent, createStore } from "effector";
import { Fill, FillUpdate, HanjiClient, Order, OrderHistory, OrderHistoryUpdate, OrderUpdate } from "hanji-ts-sdk";

/** STORES */

export const $fills = createStore<Fill[]>([]);
export const $orders = createStore<Order[]>([]);
export const $orderHistory = createStore<OrderHistory[]>([]);
export const $openOrders = createStore<Order[]>([]);

/** EVENTS */

export const fillsUpdated = createEvent<[FillUpdate[], isSnapshot: boolean]>();
export const ordersUpdated = createEvent<[OrderUpdate[], isSnapshot: boolean]>();
export const orderHistoryUpdated = createEvent<[OrderHistoryUpdate[], isSnapshot: boolean]>();

/** EFFECTS */

export const subscribeToOrdersFx = createEffect<{ client: HanjiClient; user: string; market?: string }, void>();
export const unsubscribeFromOrdersFx = createEffect<{ client: HanjiClient; user: string; market?: string }, void>();

export const subscribeToFillsFx = createEffect<{ client: HanjiClient; user: string; market?: string }, void>();
export const unsubscribeFromFillsFx = createEffect<{ client: HanjiClient; user: string; market?: string }, void>();

export const subscribeToOrderHistoryFx = createEffect<{ client: HanjiClient; user: string; market?: string }, void>();
export const unsubscribeFromOrderHistoryFx = createEffect<
  { client: HanjiClient; user: string; market?: string },
  void
>();
