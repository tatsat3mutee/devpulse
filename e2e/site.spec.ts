import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "data/digests");
const latest = JSON.parse(readFileSync(join(dir, readdirSync(dir).filter((f) => f.endsWith(".json")).sort().at(-1)!), "utf8")) as {
  date: string; items: Array<{ headline: string; url: string; topic: string; mustRead: boolean; score: number }>;
};

test("homepage lists every story with must-reads first and outbound links", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Today in engineering");
  await expect(page.locator(".must .story")).toHaveCount(latest.items.filter((item) => item.mustRead).length);
  await expect(page.locator(".must .story--lead .cover")).toBeVisible();
  await expect(page.locator("main h3 a")).toHaveCount(latest.items.length);
  const first = latest.items.find((item) => item.mustRead)!;
  await expect(page.locator(".must h3 a").first()).toHaveAttribute("href", first.url);
  await expect(page.locator(".must h3 a").first()).toHaveAttribute("rel", /noopener/);
});

test("topic navigation filters to one topic", async ({ page }) => {
  const topic = latest.items[0].topic;
  await page.goto("/");
  await page.locator(`.topics a[href="/topic/${topic}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/topic/${topic}/?$`));
  await expect(page.locator("main h3 a")).toHaveCount(latest.items.filter((item) => item.topic === topic).length);
  await expect(page.locator(`.topics a[href="/topic/${topic}"]`)).toHaveAttribute("aria-current", "page");
});

test("dated edition page matches the latest digest", async ({ page }) => {
  await page.goto(`/edition/${latest.date}`);
  await expect(page.locator("main h3 a")).toHaveCount(latest.items.length);
});

test("score filter narrows stories and can be reset", async ({ page }) => {
  await page.goto("/");
  const strong = latest.items.filter((item) => item.score >= 8).length;
  await page.getByRole("button", { name: /^Strong/ }).click();
  await expect(page.getByRole("button", { name: /^Strong/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("main .story:not([hidden]) h3 a")).toHaveCount(strong);
  await page.getByRole("button", { name: /^All/ }).click();
  await expect(page.locator("main .story:not([hidden]) h3 a")).toHaveCount(latest.items.length);
});

test("pulse page and social card describe the editions", async ({ page, request }) => {
  await page.goto("/pulse");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What engineering is talking about");
  await expect(page.locator(".days li")).not.toHaveCount(0);
  await expect(page.locator(".health tbody tr")).not.toHaveCount(0);
  await page.goto("/");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", new RegExp(`/og/${latest.date}\\.png$`));
  const card = await request.get(`/og/${latest.date}.png`);
  expect(card.ok()).toBe(true);
  expect(card.headers()["content-type"]).toContain("image/png");
});

test("keyboard users can skip to content and reach stories", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const link = page.locator("main h3 a").first();
  await link.focus();
  expect(await link.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
});

test("pages fit narrow screens without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of ["/", `/topic/${latest.items[0].topic}`, `/edition/${latest.date}`, "/archive", "/methodology", "/pulse"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
  }
});

test("theme toggle persists across reloads", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  const selected = await page.locator("html").getAttribute("data-theme");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", selected!);
});

test("machine-readable feeds describe the latest digest", async ({ request }) => {
  const latestJson = await (await request.get("/latest.json")).json();
  expect(latestJson).toMatchObject({ date: latest.date, status: "published", storyCount: latest.items.length });
  const json = await (await request.get("/json")).json();
  expect(json.items).toHaveLength(latest.items.length);
  expect(await (await request.get("/rss.xml")).text()).toContain(`/edition/${latest.date}`);
  expect(await (await request.get(`/digest/${latest.date}.md`)).text()).toContain(latest.items[0].headline);
  expect(await (await request.get("/llms.txt")).text()).toContain(`/digest/${latest.date}.md`);
});

test("topic feeds, app manifest and search are available", async ({ page, request }) => {
  const topic = latest.items[0].topic;
  const feed = await (await request.get(`/topic/${topic}/rss.xml`)).text();
  expect(feed).toContain("<rss");
  expect(feed).toContain(latest.items.find((item) => item.topic === topic)!.url);
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "DevPulse", start_url: "/", display: "standalone" });
  for (const size of [192, 512]) {
    expect(manifest.icons).toContainEqual({ src: `/icon-${size}.png`, sizes: `${size}x${size}`, type: "image/png", purpose: "any" });
    const icon = await request.get(`/icon-${size}.png`);
    expect(icon.ok()).toBe(true);
    expect(icon.headers()["content-type"]).toContain("image/png");
  }
  expect((await request.get("/sw.js")).ok()).toBe(true);
  await page.goto(`/topic/${topic}`);
  await expect(page.locator(`link[rel="alternate"][href="/topic/${topic}/rss.xml"]`)).toHaveCount(1);
  await page.getByRole("link", { name: "Search" }).first().click();
  await expect(page).toHaveURL(/\/search\/?$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Every story, every day");
});

test("production search returns a dated edition", async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW !== "true", "Pagefind is generated by the production build");
  await page.goto("/search");
  await page.locator(".pagefind-ui__search-input").fill(latest.items[0].headline);
  const result = page.locator(".pagefind-ui__result-link").first();
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute("href", new RegExp(`/edition/${latest.date}`));
  await result.click();
  await expect(page.locator("main h3 a")).toHaveCount(latest.items.length);
});

test("offline reading caches visited pages but never live-status endpoints", async ({ page, context }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW !== "true", "Service worker needs the production assets");
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.goto(`/edition/${latest.date}`);
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match(location.href)))).toBe(true);
  await page.evaluate(() => fetch("/latest.json"));
  expect(await page.evaluate(async () => Boolean(await caches.match("/latest.json")))).toBe(false);
  try {
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator("main h3 a")).toHaveCount(latest.items.length);
    await page.goto("/edition/not-cached");
    await expect(page.locator("body")).toContainText("not saved for offline reading");
  } finally {
    await context.setOffline(false);
  }
});

test("capture reader views", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
  await page.screenshot({ path: testInfo.outputPath("home.png") });
  await page.screenshot({ path: testInfo.outputPath("home-full.png"), fullPage: true });
});
