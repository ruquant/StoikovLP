import React from "react";
import { Grid2 as Grid } from "@mui/material";
import { useUnit } from "effector-react";
import { Info } from "./components/Info";
import { Orderbook } from "./components/Orderbook";
import { useMarketSubscription, useOrderbookSubscription, useVaultSubscription } from "./hooks/useSubscriptions";
import { $market } from "./models/orderbook";

function App() {
  const market = useUnit($market);
  useMarketSubscription();
  useOrderbookSubscription();
  useVaultSubscription();

  if (!market)
    return (
      <div className="flex h-[100vh] w-full flex-col items-center justify-center">
        <h1>Loading</h1>
      </div>
    );

  return (
    <main className="px-10 py-10">
      <Grid container spacing={2} justifyContent="center">
        <Grid size={3}>
          <Orderbook />
        </Grid>
        <Grid size={9}>
          <Info />
        </Grid>
      </Grid>
    </main>
  );
}

export default App;
