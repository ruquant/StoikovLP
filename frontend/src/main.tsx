import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { HanjiClientProvider } from "./hanjiCLient";
import "./index.scss";
import "./models/init";
import "./typo.scss";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HanjiClientProvider>
      <App />
    </HanjiClientProvider>
  </StrictMode>
);
