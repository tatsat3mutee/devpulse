import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { digestSchema } from "../src/lib/digest";
import { linkedInPost, selectSocialStories, storyUrl, xPost, type SocialPlatform } from "./lib/social";

type Receipt = { postId: string; postedAt: string; url: string };
type Receipts = Record<string, Receipt>;

const enabled = process.env.SOCIAL_POSTING_ENABLED === "true";
if (!enabled) {
  console.log("Social publishing is disabled; set SOCIAL_POSTING_ENABLED=true to enable it.");
  process.exit(0);
}

const siteUrl = process.env.SITE_URL || "https://devpulse.tatsatpandey.com";
const receiptPath = process.env.SOCIAL_RECEIPT_PATH || join("data", "social-posts.json");
const digestDir = process.env.DIGEST_DIR || join("data", "digests");

async function latestDigest() {
  const files = (await readdir(digestDir)).filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file)).sort();
  const file = files.at(-1);
  if (!file) throw new Error(`No digest found in ${digestDir}`);
  return digestSchema.parse(JSON.parse(await readFile(join(digestDir, file), "utf8")));
}

async function readReceipts(): Promise<Receipts> {
  try {
    return JSON.parse(await readFile(receiptPath, "utf8")) as Receipts;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

async function saveReceipts(receipts: Receipts) {
  await mkdir(dirname(receiptPath), { recursive: true });
  const temporary = `${receiptPath}.tmp`;
  await writeFile(temporary, `${JSON.stringify(receipts, null, 2)}\n`);
  await rename(temporary, receiptPath);
}

async function responseError(platform: SocialPlatform, response: Response): Promise<Error> {
  const detail = (await response.text()).slice(0, 500);
  return new Error(`${platform} publish failed (${response.status}): ${detail || response.statusText}`);
}

async function publishLinkedIn(text: string, url: string, title: string, description: string): Promise<string | undefined> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const author = process.env.LINKEDIN_AUTHOR_URN;
  const version = process.env.LINKEDIN_VERSION;
  if (!token || !author || !version) return undefined;
  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": version,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author,
      commentary: text,
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      content: { article: { source: url, title, description } },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (!response.ok) throw await responseError("linkedin", response);
  return response.headers.get("x-restli-id") ?? `linkedin-${Date.now()}`;
}

async function publishX(text: string): Promise<string | undefined> {
  const token = process.env.X_USER_ACCESS_TOKEN;
  if (!token) return undefined;
  const response = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw await responseError("x", response);
  const payload = await response.json() as { data?: { id?: string } };
  if (!payload.data?.id) throw new Error("x publish succeeded without returning a post id");
  return payload.data.id;
}

async function waitForLive(url: string) {
  const attempts = Number(process.env.SOCIAL_LIVE_CHECK_ATTEMPTS || 34);
  const delayMs = Number(process.env.SOCIAL_LIVE_CHECK_DELAY_MS || 45_000);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { method: "HEAD", redirect: "error", signal: AbortSignal.timeout(10_000) });
      if (response.ok) return;
    } catch {}
    if (attempt < attempts) await Bun.sleep(delayMs);
  }
  throw new Error(`Story page did not become live before social publishing: ${url}`);
}

const linkedinConfigured = Boolean(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_AUTHOR_URN && process.env.LINKEDIN_VERSION);
const xConfigured = Boolean(process.env.X_USER_ACCESS_TOKEN);
if (!linkedinConfigured && !xConfigured) {
  throw new Error("Social publishing is enabled, but no platform has a complete credential set.");
}

const digest = await latestDigest();
const receipts = await readReceipts();
const failures: Error[] = [];
let published = 0;

for (const item of selectSocialStories(digest)) {
  const url = storyUrl(siteUrl, digest.date, item);
  try {
    await waitForLive(url);
  } catch (error) {
    failures.push(error as Error);
    console.error((error as Error).message);
    continue;
  }
  const attempts: Array<[SocialPlatform, () => Promise<string | undefined>]> = [
    ["linkedin", () => publishLinkedIn(linkedInPost(item, url), url, item.headline, item.whyRead)],
    ["x", () => publishX(xPost(item, url))],
  ];
  for (const [platform, publish] of attempts) {
    const key = `${digest.date}:${item.id}:${platform}`;
    if (receipts[key]) {
      console.log(`Skipping ${key}; already published as ${receipts[key].postId}.`);
      continue;
    }
    try {
      const postId = await publish();
      if (!postId) continue;
      published += 1;
      receipts[key] = { postId, postedAt: new Date().toISOString(), url };
      await saveReceipts(receipts);
      console.log(`Published ${key} as ${postId}.`);
    } catch (error) {
      failures.push(error as Error);
      console.error((error as Error).message);
    }
  }
}

if (!published && !Object.keys(receipts).some((key) => key.startsWith(`${digest.date}:`))) {
  throw new Error("No social posts were published.");
}
if (failures.length) throw new AggregateError(failures, `${failures.length} social post(s) failed`);
