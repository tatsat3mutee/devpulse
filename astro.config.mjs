import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: process.env.SITE_URL || "https://devpulse.tatsatpandey.com",
  output: "static",
  integrations: [sitemap({ filter: (page) => {
    const path = new URL(page).pathname;
    return !path.startsWith("/review/") && (!path.startsWith("/story/") || /^\/story\/\d{4}-\d{2}-\d{2}--/.test(path));
  } })],
  build: { format: "directory" },
});
