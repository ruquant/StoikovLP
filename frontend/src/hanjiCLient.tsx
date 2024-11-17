import React, { PropsWithChildren, createContext } from "react";
import { HanjiClient } from "hanji-ts-sdk";
import { API_URL, WS_URL } from "./constants";

export const defaultHanjiClient = new HanjiClient({
  apiBaseUrl: API_URL,
  webSocketApiBaseUrl: WS_URL,
  signer: null,
  webSocketConnectImmediately: true,
  autoWaitTransaction: true,
  fastWaitTransaction: true
});

export const HanjiClientContext = createContext<HanjiClient>(defaultHanjiClient);

export const HanjiClientProvider = ({ children }: PropsWithChildren) => {
  return <HanjiClientContext.Provider value={defaultHanjiClient}>{children}</HanjiClientContext.Provider>;
};
