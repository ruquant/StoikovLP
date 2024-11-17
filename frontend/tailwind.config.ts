import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,html}"],
  important: "#root",
  theme: {
    screens: {
      sm: "400px",
      md: "768px",
      lg: "1024px",
      xl: "1440px"
    },
    colors: {
      green: "rgb(0, 178, 149)",
      red: "rgb(229, 67, 34)",
      yellow: "#FFD275",

      "red-transparent": "rgb(229, 67, 34, 0.15)",
      "green-transparent": "rgb(0, 178, 149, 0.15)",

      "label-primary": "rgb(255, 255, 255)",
      "label-on-primary": "rgba(0, 0, 0, 1)",
      "label-secondary": "rgba(255, 255, 242, 0.60)",
      "label-tertiary": "rgba(255, 255, 242, 0.30)",
      "label-quaternary": "rgba(255, 255, 242, 0.15)",
      "label-negative": "rgb(229, 67, 34)",
      "label-positive": "rgb(0, 178, 149)"
    },
    extend: {
      backgroundImage: {
        "orderbook-ask": "linear-gradient(90deg, rgba(229, 67, 34, 0.00) 0%, rgba(229, 67, 34, 0.15) 100%)",
        "orderbook-bid": "linear-gradient(90deg, rgba(0, 178, 149, 0.00) 0%, rgba(0, 178, 149, 0.15) 100%)"
      },
      gridTemplateColumns: {
        orderbook: "1fr 2fr 2fr",
        "open-orders": "3fr 2fr 2fr 2fr 2fr 2fr 2fr 2fr 2fr",
        "order-history": "3fr 2fr 2fr 2fr 2fr 2fr 2fr 2fr 2fr 2fr",
        fills: "2fr 2fr 2fr 2fr 2fr 2fr 2fr 2fr"
      }
    }
  },
  plugins: [],
  corePlugins: {
    preflight: false
  }
} satisfies Config;
