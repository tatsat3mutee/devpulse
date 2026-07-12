import { describe, expect, test } from "bun:test";
import { normalizeUrl, safeFetch } from "./http.js";

describe("normalizeUrl", () => {
  test("strips utm_* params", () => {
    expect(normalizeUrl("https://example.com/post?utm_source=x&utm_medium=y&id=5")).toBe(
      "https://example.com/post?id=5"
    );
  });

  test("strips known tracking params (fbclid, gclid, ref)", () => {
    expect(normalizeUrl("https://example.com/a?fbclid=1&gclid=2&ref=hn&keep=1")).toBe(
      "https://example.com/a?keep=1"
    );
  });

  test("strips hash fragment", () => {
    expect(normalizeUrl("https://example.com/post#section-2")).toBe("https://example.com/post");
  });

  test("removes trailing slash from path", () => {
    expect(normalizeUrl("https://example.com/post/")).toBe("https://example.com/post");
  });

  test("keeps root path slash", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });

  test("preserves meaningful query params and their order", () => {
    expect(normalizeUrl("https://arxiv.org/abs/2401.1234?v=2")).toBe(
      "https://arxiv.org/abs/2401.1234?v=2"
    );
  });

  test("lowercases host", () => {
    expect(normalizeUrl("https://Example.COM/Post")).toBe("https://example.com/Post");
  });

  test("returns invalid input unchanged", () => {
    expect(normalizeUrl("not a url")).toBe("not a url");
    expect(normalizeUrl("")).toBe("");
  });

  test("same article with and without tracking params normalizes identically", () => {
    const a = normalizeUrl("https://example.com/story?utm_campaign=digest");
    const b = normalizeUrl("https://example.com/story/");
    expect(a).toBe(b);
  });
});

describe("safeFetch SSRF guard (blocked without network)", () => {
  const blocked = [
    "http://localhost:3000/admin",
    "http://sub.localhost/x",
    "http://127.0.0.1/",
    "http://127.9.9.9/",
    "http://0.0.0.0/",
    "http://10.0.0.5/internal",
    "http://172.16.0.1/",
    "http://172.31.255.255/",
    "http://192.168.1.1/router",
    "http://169.254.169.254/latest/meta-data/", // AWS metadata
    "http://metadata.google.internal/computeMetadata/",
    "http://[::1]:8080/",
    "http://[fe80::1]/",
    "http://[fd00::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:7f00:1]/", // hex-normalized IPv4-mapped loopback
    "http://[::ffff:a00:1]/", // hex-normalized 10.0.0.1
    "ftp://example.com/file",
    "file:///etc/passwd",
    "gopher://example.com/",
    "not a url at all",
  ];

  for (const url of blocked) {
    test(`blocks ${url}`, async () => {
      await expect(safeFetch(url)).rejects.toThrow(/Blocked URL/);
    });
  }

  const allowed = [
    "https://example.com/",
    "http://example.com/feed.xml",
    "https://172.15.0.1/", // just outside private range
    "https://172.32.0.1/", // just outside private range
  ];

  for (const url of allowed) {
    test(`does not pre-block ${url}`, async () => {
      // Pass a pre-aborted signal so no real network request happens;
      // an SSRF block would throw "Blocked URL" instead of an abort error.
      const ctl = new AbortController();
      ctl.abort();
      await expect(safeFetch(url, { signal: ctl.signal })).rejects.not.toThrow(/Blocked URL/);
    });
  }
});
