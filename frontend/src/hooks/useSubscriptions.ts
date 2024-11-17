import { useContext, useEffect } from "react";
import {
  subscribeToFillsFx,
  subscribeToOrderHistoryFx,
  subscribeToOrdersFx,
  unsubscribeFromFillsFx,
  unsubscribeFromOrderHistoryFx,
  unsubscribeFromOrdersFx
} from "@/models/info";
import { MARKET, ORDERBOOK_AGGREGATION, VAULT_ADDRESS } from "../constants";
import { HanjiClientContext } from "../hanjiCLient";
import {
  subscribeToMarketFx,
  subscribeToOrderbookFx,
  unsubscribeFromMarketFx,
  unsubscribeFromOrderbookFx
} from "../models/orderbook";

export const useMarketSubscription = () => {
  const client = useContext(HanjiClientContext);

  useEffect(() => {
    subscribeToMarketFx(client);

    return () => {
      unsubscribeFromMarketFx(client);
    };
  }, [client]);
};

export const useOrderbookSubscription = () => {
  const client = useContext(HanjiClientContext);

  useEffect(() => {
    subscribeToOrderbookFx({ client, aggregation: ORDERBOOK_AGGREGATION, market: MARKET });

    return () => {
      unsubscribeFromOrderbookFx({ client, aggregation: ORDERBOOK_AGGREGATION, market: MARKET });
    };
  }, [client]);
};

export const useVaultSubscription = () => {
  const client = useContext(HanjiClientContext);

  useEffect(() => {
    subscribeToOrdersFx({ client, user: VAULT_ADDRESS, market: MARKET });
    subscribeToFillsFx({ client, user: VAULT_ADDRESS, market: MARKET });
    subscribeToOrderHistoryFx({ client, user: VAULT_ADDRESS, market: MARKET });

    return () => {
      unsubscribeFromOrdersFx({ client, user: VAULT_ADDRESS, market: MARKET });
      unsubscribeFromFillsFx({ client, user: VAULT_ADDRESS, market: MARKET });
      unsubscribeFromOrderHistoryFx({ client, user: VAULT_ADDRESS, market: MARKET });
    };
  }, [client]);
};
