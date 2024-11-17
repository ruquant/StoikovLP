export const MARKET = "0x811b18b8957a4c275948353aefc6c3e9d62a8680";
export const VAULT_ADDRESS = "0xefdCe4E9E3299510Ef5Ce77e896128c38cfa9307";
export const EXPLORER_URL = "https://testnet.explorer.etherlink.com/";
export const API_URL = "https://api-dev.hanji.io";
export const WS_URL = "wss://sockets-dev.hanji.io";
export const ORDERBOOK_AGGREGATION = 1;
export const USD_DECIMALS = 2;
export const PERCENTAGE_DECIMALS = 4;

export enum TokenType {
  BASE = "base",
  QUOTE = "quote"
}

export enum OrderStatus {
  OPEN = "open",
  FILLED = "filled",
  CLAIMED = "claimed",
  CANCELLED = "cancelled",
  REJECTED = "rejected"
}

export enum OrderSide {
  ASK = "ask",
  BID = "bid"
}
