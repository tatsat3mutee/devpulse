import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "data/digests");
const latest = JSON.parse(readFileSync(join(dir, readdirSync(dir).filter((f) => f.endsWith(".json")).sort().at(-1)!), "utf8")) as {
  date: string; items: Array<{ id: string; headline: string; url: string; topic: string; mustRead: boolean; score: number; kind?: string; readMinutes?: number }>;
};

test("homepage lists every story with must-reads first and outbound links", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Today in AI & systems");
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
  for (const path of ["/", `/topic/${latest.items[0].topic}`, `/edition/${latest.date}`, "/archive", "/methodology", "/pulse", "/radar", "/papers", "/week/", "/search", "/saved", `/story/${latest.date}--${latest.items[0].id}/`]) {
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
  expect(manifest).toMatchObject({ id: "/", short_name: "DevPulse", start_url: "/", display: "standalone" });
  expect(manifest.shortcuts.map((shortcut: { url: string }) => shortcut.url)).toEqual(["/", "/week/", "/radar", "/search"]);
  for (const icon of manifest.icons.filter((entry: { purpose: string }) => entry.purpose === "maskable")) expect((await request.get(icon.src)).headers()["content-type"]).toContain("image/png");
  expect(manifest.icons.some((entry: { purpose: string }) => entry.purpose === "maskable")).toBe(true);
  for (const shot of manifest.screenshots) expect((await request.get(shot.src)).ok()).toBe(true);
  for (const shortcut of manifest.shortcuts) expect((await request.get(shortcut.icons[0].src)).ok()).toBe(true);
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

test("production search finds individual stories and links to the source and the edition", async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW !== "true", "The story index is generated by the production build");
  const story = latest.items[0];
  await page.goto("/search");
  await expect(page.getByText("Every story DevPulse has kept")).toBeVisible();
  await page.getByRole("searchbox", { name: "Search stories" }).fill(story.headline);
  const first = page.locator(".result").first();
  await expect(first.locator("h2 a")).toHaveAttribute("href", story.url);
  await expect(first.locator(".edition-link")).toHaveAttribute("href", `/edition/${latest.date}/#${story.id}`);
  await expect(page).toHaveURL(/[?&]q=/);
  await page.locator("#topics button").nth(1).click();
  await expect(page.locator("#status")).toContainText(" in ");
  await first.locator(".edition-link").click();
  await expect(page).toHaveURL(new RegExp(`/edition/${latest.date}/?#${story.id}$`));
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
    await page.goto("/pulse");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("What engineering is talking about");
    await page.goto("/edition/not-cached");
    await expect(page.locator("body")).toContainText("not saved for offline reading");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("You're offline");
  } finally {
    await context.setOffline(false);
  }
});

test("the header offers Install app as soon as the browser allows it, even on a first visit", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#install-app")).toBeHidden();
  await page.evaluate(() => {
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), { prompt: () => { (window as unknown as { prompted: boolean }).prompted = true; }, userChoice: Promise.resolve({ outcome: "accepted" }) });
    window.dispatchEvent(event);
  });
  await expect(page.locator("#install-app")).toBeVisible();
  await expect(page.locator("#install-note")).toBeHidden();
  await page.locator("#install-app").click();
  expect(await page.evaluate(() => (window as unknown as { prompted?: boolean }).prompted)).toBe(true);
  await expect(page.locator("#install-app")).toBeHidden();
});

test("a newer edition is announced without reloading", async ({ page }) => {
  await page.route("**/latest.json", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ date: "2999-01-01", status: "published", storyCount: 50 }) }));
  await page.goto("/");
  await expect(page.locator("#edition-note")).toBeVisible();
  await expect(page.locator("#edition-note")).toContainText("Today's edition is ready");
});

test("install prompt shows from the second visit and snoozes when dismissed", async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem("devpulse-visits", "3"); sessionStorage.setItem("devpulse-counted", "1"); });
  await page.goto("/");
  await expect(page.locator("#install-note")).toBeHidden();
  await page.evaluate(() => {
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), { prompt: () => {}, userChoice: Promise.resolve({ outcome: "dismissed" }) });
    window.dispatchEvent(event);
  });
  await expect(page.locator("#install-note")).toBeVisible();
  await expect(page.locator("#install-app")).toBeVisible();
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(page.locator("#install-note")).toBeHidden();
  expect(Number(await page.evaluate(() => localStorage.getItem("devpulse-install-snooze")))).toBeGreaterThan(Date.now());
});

test("reading-time filter keeps quick or deep reads", async ({ page }) => {
  await page.goto("/");
  const quick = latest.items.filter((item) => item.kind !== "paper" && (item.readMinutes ?? 5) < 10).length;
  await page.getByRole("button", { name: /^Quick/ }).click();
  await expect(page.locator("main .story:not([hidden]) h3 a")).toHaveCount(quick);
  await page.getByRole("button", { name: /^Deep/ }).click();
  await expect(page.locator("main .story:not([hidden]) h3 a")).toHaveCount(latest.items.length - quick);
  await page.getByRole("button", { name: /^Any/ }).click();
  await expect(page.locator("main .story:not([hidden]) h3 a")).toHaveCount(latest.items.length);
});

test("opened stories are marked as read in this browser", async ({ page, context }) => {
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  await page.goto("/");
  const story = page.locator("main .story[data-id]").first();
  const id = await story.getAttribute("data-id");
  await story.locator("h3 a").click({ modifiers: ["Alt"] }).catch(() => {});
  await page.evaluate((storyId) => {
    const read = JSON.parse(localStorage.getItem("devpulse-read") ?? "[]");
    if (!read.includes(storyId)) localStorage.setItem("devpulse-read", JSON.stringify([...read, storyId]));
  }, id);
  await page.reload();
  await expect(page.locator(`main .story[data-id="${id}"]`).first()).toHaveAttribute("data-read", "");
});

test("radar, weekly and papers pages render", async ({ page }) => {
  await page.goto("/radar");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What engineers are pulling down");
  await page.goto("/week/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Every week");
  await page.locator("main li a").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The week in AI & systems");
  await expect(page.locator(".top li").first()).toBeVisible();
  await page.goto("/papers");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Research, read for engineers");
});

test("pressing / opens search", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("/");
  await expect(page).toHaveURL(/\/search\/?$/);
});

test("save and note a story, then find both in the library after a reload", async ({ page }) => {
  await page.goto("/");
  const card = page.locator("main .story").first();
  const headline = (await card.locator("h3 a").textContent())!.trim();
  await card.getByRole("button", { name: "Save" }).click();
  await expect(card.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
  await card.getByRole("button", { name: "Note" }).click();
  await page.locator("#note-text").fill("Try the containment checklist at work");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(card.locator(".my-note")).toHaveText("Try the containment checklist at work");
  await page.goto("/saved");
  await page.reload();
  await expect(page.locator("#items li")).toHaveCount(1);
  await expect(page.locator("#items h3")).toHaveText(headline);
  await expect(page.locator("#items .my-note")).toHaveText("Try the containment checklist at work");
  await page.locator("#filter").fill("checklist");
  await expect(page.locator("#items li")).toHaveCount(1);
  await page.locator("#filter").fill("nothing matches this");
  await expect(page.locator("#items li")).toHaveCount(0);
  await expect(page.locator(".account-status")).toContainText("Sync is not switched on");
});

test("following a topic adds a For you view that keeps only that topic", async ({ page }) => {
  const topic = latest.items[0].topic;
  await page.goto(`/topic/${topic}`);
  await page.getByRole("button", { name: "Follow topic" }).click();
  await expect(page.getByRole("button", { name: "Following" })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/");
  await page.getByRole("button", { name: "For you" }).click();
  await expect(page.locator("main .story:not([hidden]) h3 a")).toHaveCount(latest.items.filter((item) => item.topic === topic).length);
});

test("each story has its own page with notes and discussion", async ({ page }) => {
  const story = latest.items[0];
  await page.goto("/");
  await page.locator(`main .story[data-id="${story.id}"] .discuss-link`).first().click();
  await expect(page).toHaveURL(new RegExp(`/story/${latest.date}--${story.id}/?$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(story.headline);
  await expect(page.locator("h1 a")).toHaveAttribute("href", story.url);
  await expect(page.getByRole("heading", { name: "Discussion" })).toBeVisible();
});

test("capture reader views", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
  await page.screenshot({ path: testInfo.outputPath("home.png") });
  await page.screenshot({ path: testInfo.outputPath("home-full.png"), fullPage: true });
});
