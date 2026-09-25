import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Edition, Story } from "../src/lib/schema";

test("keyboard navigation reaches content and each story", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const storyLink = page.getByRole("navigation", { name: "Jump to a story" }).getByRole("link").nth(1);
  await storyLink.focus();
  expect(await storyLink.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.locator("article.story").nth(1)).toBeFocused();
});

test("theme works when browser storage is unavailable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === "devpulse-theme") throw new DOMException("Storage blocked", "SecurityError");
      return getItem.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === "devpulse-theme") throw new DOMException("Storage blocked", "SecurityError");
      return setItem.call(this, key, value);
    };
  });
  await page.goto("/");
  const original = await page.locator("html").getAttribute("data-theme");
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", original === "dark" ? "light" : "dark");
  expect(errors).toEqual([]);
});

test("reader text contrast and small-screen layout remain legible", async ({ page }) => {
  await page.goto("/");
  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
    const contrast = await page.evaluate(() => {
      const luminance = (color: string) => {
        const values = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
      };
      return [".preview-notice", ".story-body p", ".method-note .eyebrow", ".status", ".confidence"].flatMap((selector) =>
        Array.from(document.querySelectorAll(selector)).map((element) => {
          let ancestor: Element | null = element;
          while (ancestor && ["rgba(0, 0, 0, 0)", "transparent"].includes(getComputedStyle(ancestor).backgroundColor)) ancestor = ancestor.parentElement;
          const foreground = luminance(getComputedStyle(element).color);
          const background = luminance(getComputedStyle(ancestor ?? document.documentElement).backgroundColor);
          return { selector, ratio: (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05) };
        }));
    });
    for (const result of contrast) expect(result.ratio, `${theme} ${result.selector}`).toBeGreaterThanOrEqual(4.5);
  }
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ["/", "/archive", "/methodology", "/corrections", "/story/quantization-follows-the-kernel"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
  }
});

test("capture reader views", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
  await page.screenshot({ path: testInfo.outputPath("edition-light.png") });
  await page.goto("/story/quantization-follows-the-kernel");
  await page.screenshot({ path: testInfo.outputPath("story-light.png") });
  await page.locator(".claims").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("claim-ledger.png") });
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await page.screenshot({ path: testInfo.outputPath("claim-ledger-dark.png") });
});

test("copy handler reports clipboard failure without changing pilot approval", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("Permission denied"); } } });
    const fixture = document.createElement("div");
    fixture.className = "share";
    fixture.innerHTML = '<button data-copy="Synthetic test summary">Copy fixture</button><p data-share-status role="status"></p>';
    document.querySelector("main")!.append(fixture);
  });
  await page.getByRole("button", { name: "Copy fixture" }).click();
  await expect(page.locator("[data-share-status]")).toContainText("Copy unavailable");
  await expect(page.locator(".preview-notice")).toBeVisible();
});

test("latest edition is finite and evidence-forward", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The authority boundary is becoming the architecture");
  await expect(page.locator("article.story")).toHaveCount(6);
  await expect(page.getByText("No ads. No endless feed. No claim without a receipt.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Inspect receipts →" }).first()).toBeVisible();
  await expect(page.getByText("99 stories")).toHaveCount(0);
});

test("story page exposes quotes, source and counterweight", async ({ page }) => {
  await page.goto("/story/execution-authority-needs-a-preflight");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("execution authority");
  await expect(page.getByRole("heading", { name: "Claims awaiting editorial review" })).toBeVisible();
  await expect(page.getByText("Source-quote matching checks text presence", { exact: false })).toBeVisible();
  await expect(page.getByText("Until now, definition, verdict, and execution all happened in one place", { exact: false })).toBeVisible();
  await expect(page.getByText("Not yet human reviewed.", { exact: false })).toBeVisible();
});

test("unapproved pilot is not published in machine-readable feeds", async ({ request }) => {
  const latest = await request.get("/latest.json");
  expect(latest.ok()).toBe(true);
  expect(await latest.json()).toBeNull();

  const json = await request.get("/json");
  expect(json.ok()).toBe(true);
  expect(await json.json()).toBeNull();

  const markdown = await request.get("/edition/2026-09-24.md");
  expect(markdown.status()).toBe(404);

  const rss = await request.get("/rss.xml");
  expect(await rss.text()).not.toContain("/edition/2026-09-24");
});

test("primary pages stay usable at narrow widths", async ({ page }) => {
  for (const path of ["/", "/archive", "/methodology", "/story/quantization-follows-the-kernel"]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), path).toBe(true);
  }
});

test("unapproved stories cannot be shared as published verdicts", async ({ page }) => {
  await page.goto("/story/execution-authority-needs-a-preflight");
  await expect(page.getByRole("link", { name: /on LinkedIn/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /on X/ })).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("not published");
});

test("reading map links and evidence chain are accessible", async ({ page, isMobile }) => {
  await page.goto("/");
  if (!isMobile) await expect(page.getByRole("img", { name: /Reading map for this edition/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Jump to a story" })).toBeVisible();
  await expect(page.locator(".reading-map a")).toHaveCount(6);
  await page.goto("/story/quantization-follows-the-kernel");
  await expect(page.getByRole("img", { name: /Evidence chain\. Primary source/ }).first()).toBeAttached();
});

test("theme preference persists", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  const selected = await page.locator("html").getAttribute("data-theme");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", selected!);
});

test.describe("isolated synthetic published editions", () => {
  let fixtureRoot: string;
  let origin: string;
  let server: Server | undefined;

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    await mkdir(join(workspace, ".astro"), { recursive: true });
    fixtureRoot = await mkdtemp(join(workspace, ".astro", "reader-fixture-"));
    for (const path of ["src", "public", "package.json", "astro.config.mjs", "tsconfig.json"]) {
      await cp(join(workspace, path), join(fixtureRoot, path), { recursive: true });
    }
    await mkdir(join(fixtureRoot, "data/editions"), { recursive: true });
    await mkdir(join(fixtureRoot, "data/review"), { recursive: true });
    const story = (id: string, title: string, reviewed: boolean): Story => ({
      id, title, originalTitle: title, section: "practice", status: "holds", confidence: "medium",
      confidenceReason: "Synthetic test evidence, not an editorial assessment.",
      whatChanged: "Synthetic fixture content for local browser tests only.",
      whyItMatters: "This exercises receipt links without approving real content.",
      whoShouldCare: ["Test readers"],
      primarySource: { label: "Synthetic source", url: "https://example.com/source", type: "official-docs", vendorAuthored: false },
      claims: [{ text: "Synthetic claim for testing", quote: "Synthetic source quotation", sourceUrl: "https://example.com/source" }],
      corroboration: [],
      provenance: { summarizedBy: "Synthetic browser fixture", humanReviewed: reviewed, fetchedAt: "2026-01-01T00:00:00Z" },
    });
    const edition = (date: string, title: string, status: Edition["status"]): Edition => ({
      date, title, status, publishedAt: `${date}T12:00:00Z`, readMinutes: 3,
      dek: "Synthetic edition for isolated reader workflow tests.",
      lead: story("repeated-story", title, status !== "draft"),
      stories: [story("support-one", "Synthetic supporting story one", status !== "draft"), story("support-two", "Synthetic supporting story two", status !== "draft")],
      oneLiners: [], methodologyNote: "Synthetic test fixture, never a real published edition.",
    });
    const first = edition("2026-01-01", "Synthetic first edition evidence", "corrected");
    first.lead.correction = "Synthetic original edition correction.";
    const second = edition("2026-01-02", "Synthetic second edition evidence", "published");
    const draft = edition("2026-01-03", "PRIVATE_DRAFT_CANARY", "draft");
    const review = edition("2026-01-04", "PRIVATE_REVIEW_CANARY", "draft");
    for (const item of [first, second, draft]) await writeFile(join(fixtureRoot, `data/editions/${item.date}.json`), JSON.stringify(item));
    await writeFile(join(fixtureRoot, "data/review/2026-01-04.json"), JSON.stringify(review));
    execFileSync(process.execPath, [join(workspace, "node_modules/astro/bin/astro.mjs"), "build"], {
      cwd: fixtureRoot, timeout: 90_000, env: { ...process.env, SITE_URL: "https://reader-fixture.example" }, stdio: "pipe",
    });
    const output = join(fixtureRoot, "dist");
    server = createServer(async (request, response) => {
      try {
        const pathname = decodeURIComponent(new URL(request.url!, "http://localhost").pathname);
        const file = resolve(output, `.${pathname}`);
        if (file !== output && !file.startsWith(`${output}${sep}`)) { response.writeHead(400).end(); return; }
        const target = extname(file) ? file : join(file, "index.html");
        const body = await readFile(target);
        const types: Record<string, string> = { ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".xml": "application/xml" };
        response.writeHead(200, { "Content-Type": types[extname(target)] ?? "text/html" }).end(body);
      } catch { response.writeHead(404).end("Not found"); }
    });
    await new Promise<void>((ready) => server!.listen(0, "127.0.0.1", ready));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Fixture server has no TCP address");
    origin = `http://127.0.0.1:${address.port}`;
  });

  test.afterAll(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((done) => server!.close(() => done()));
    }
    if (fixtureRoot) await rm(fixtureRoot, { recursive: true, force: true });
  });

  test("approved sharing copies dated receipts and handles native cancellation", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { document.documentElement.dataset.copied = text; } } });
      Object.defineProperty(navigator, "share", { configurable: true, value: async () => { throw new DOMException("Cancelled", "AbortError"); } });
    });
    await page.goto(`${origin}/story/2026-01-01--repeated-story`);
    await expect(page.locator(".preview-notice")).toHaveCount(0);
    const share = page.locator(".share.full");
    await expect(page.locator("body")).toHaveCSS("margin", "0px");
    await share.scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath("approved-sharing.png") });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    await share.getByRole("button", { name: /Copy summary/ }).click();
    await expect(share.getByRole("status")).toHaveText("Summary copied.");
    await expect(page.locator("html")).toHaveAttribute("data-copied", /https:\/\/reader-fixture\.example\/story\/2026-01-01--repeated-story/);
    const linkedin = new URL((await share.getByRole("link", { name: /on LinkedIn/ }).getAttribute("href"))!);
    expect(linkedin.pathname).toBe("/sharing/share-offsite/");
    expect(linkedin.searchParams.get("url")).toBe("https://reader-fixture.example/story/2026-01-01--repeated-story");
    const xLink = new URL((await share.getByRole("link", { name: /on X/ }).getAttribute("href"))!);
    expect(xLink.searchParams.get("text")).toContain("Synthetic first edition evidence");
    await share.getByRole("button", { name: "Share", exact: true }).click();
    await expect(share.getByRole("status")).not.toContainText("unavailable");
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("Denied"); } } });
    });
    await share.getByRole("button", { name: /Copy summary/ }).click();
    await expect(share.getByRole("status")).toContainText("Copy unavailable");
    await expect(share.locator("pre")).toContainText("Synthetic first edition evidence");
  });

  test("duplicate IDs retain edition identity and exclude a newer draft", async ({ page }) => {
    await page.goto(`${origin}/edition/2026-01-01`);
    await page.getByRole("link", { name: "Synthetic first edition evidence", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/story/2026-01-01--repeated-story`);
    await expect(page.locator("h1")).toHaveText("Synthetic first edition evidence");
    await page.goto(`${origin}/story/repeated-story`);
    await expect(page.locator("h1")).toHaveText("Synthetic second edition evidence");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://reader-fixture.example/story/2026-01-02--repeated-story");
    await page.goto(`${origin}/corrections`);
    await expect(page.getByRole("link", { name: "Synthetic first edition evidence" })).toHaveAttribute("href", "/story/2026-01-01--repeated-story");
  });

  test("public output has no review or draft payloads", async ({ request }) => {
    for (const path of ["/review/2026-01-04", "/edition/2026-01-03", "/edition/2026-01-03.json", "/edition/2026-01-03.md", "/story/2026-01-03--repeated-story"]) {
      expect((await request.get(`${origin}${path}`)).status(), path).toBe(404);
    }
    for (const path of ["/", "/archive", "/rss.xml", "/latest.json", "/llms.txt", "/sitemap-0.xml"]) {
      const response = await request.get(`${origin}${path}`);
      expect(response.ok(), path).toBe(true);
      const text = await response.text();
      expect(text).not.toMatch(/PRIVATE_(DRAFT|REVIEW)_CANARY|\/review\/|2026-01-03/);
      if (path.includes("sitemap")) {
        expect(text).toContain("/story/2026-01-01--repeated-story");
        expect(text).not.toContain("/story/repeated-story");
      }
    }
  });
});
