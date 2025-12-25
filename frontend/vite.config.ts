import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
    // This environment variable needs to be set, if the application is hosted under a sub-path
    base: process.env.VITE_BASE || "/",
    plugins: [react(), tailwindcss(), svgr()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
