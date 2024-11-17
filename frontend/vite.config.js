import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import eslintPlugin from "vite-plugin-eslint";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import svgr from "vite-plugin-svgr";
// https://vitejs.dev/config/
export default defineConfig(function () {
    return {
        resolve: {
            alias: [
                { find: "@", replacement: path.resolve(__dirname, "src") },
                { find: "public", replacement: path.resolve(__dirname, "public") }
            ]
        },
        plugins: [svgr(), react(), eslintPlugin(), nodePolyfills()],
        publicDir: "public"
    };
});
