import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "data/digests");
const latest = JSON.parse(readFileSync(join(dir, readdirSync(dir).filter((f) => f.endsWith(".json")).sort().at(-1)!), "utf8")) as {
  date: string; items: Array<{ headline: string; url: string; topic: string; mustRead: boolean }>;
};

test("homepage lists every story with must-reads first and outbound links", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Today in engineering");
  await expect(page.locator(".must li")).toHaveCount(latest.items.filter((item) => item.mustRead).length);
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
  for (const path of ["/", `/topic/${latest.items[0].topic}`, "/archive", "/methodology"]) {
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

test("capture reader views", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
  await page.screenshot({ path: testInfo.outputPath("home.png") });
  await page.screenshot({ path: testInfo.outputPath("home-full.png"), fullPage: true });
});
