import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { probeArtifact, probeSite } from "../scripts/check-live";

const script = resolve(import.meta.dir, "../deploy/ec2/release.sh");
const sha = "a".repeat(40);
const priorSha = "b".repeat(40);
const date = "2026-09-24";
const domain = "devpulse.tatsatpandey.com";
const git = process.platform === "win32"
  ? spawnSync("where.exe", ["git"], { encoding: "utf8" }).stdout.trim().split(/\r?\n/)[0]
  : "";
const bash = process.platform === "win32" ? resolve(dirname(git), "../bin/bash.exe") : "/bin/bash";
const posix = (path: string) => path.replaceAll("\\", "/").replace(/^([A-Za-z]):/, (_, drive: string) => `/${drive.toLowerCase()}`);

test("Daily workflow scores, commits, verifies, then publishes the built site branch", () => {
  const workflow = Bun.YAML.parse(readFileSync(resolve(import.meta.dir, "../.github/workflows/daily-digest.yml"), "utf8")) as {
    on: { schedule: Array<{ cron: string }> };
    concurrency: { "cancel-in-progress": boolean };
    jobs: { digest: { steps: Array<{ name?: string; run?: string; id?: string; env?: Record<string, string> }> } };
  };
  expect(workflow.on.schedule[0].cron).toBe("0 7 * * *");
  expect(workflow.concurrency["cancel-in-progress"]).toBe(false);
  const steps = workflow.jobs.digest.steps;
  const index = (name: string) => steps.findIndex((step) => step.name === name);
  expect(steps[index("Collect, score and select today's stories")].env?.OPENROUTER_API_KEY).toBe("${{ secrets.OPENROUTER_API_KEY }}");
  expect(index("Commit digest to main")).toBeLessThan(index("Verify built site"));
  expect(index("Verify built site")).toBeLessThan(index("Publish built site to the site branch"));
  expect(steps[index("Verify built site")].run).toContain("release:probe");
  expect(steps[index("Publish built site to the site branch")].run).toContain("site");
  expect(readFileSync(resolve(import.meta.dir, "../deploy/ec2/pull-release.sh"), "utf8")).toContain('release.sh" "$sha" "$digest" "$edition_date"');
});

function sandbox(mode = "success") {
  expect(readFileSync(script, "utf8")).toContain("DEVPULSE_SANDBOX");
  const directory = mkdtempSync(join(tmpdir(), "devpulse-release-"));
  const shellDirectory = process.platform === "win32"
    ? spawnSync(bash, ["-c", 'cygpath -u "$1"', "test", directory], { encoding: "utf8" }).stdout.trim()
    : directory;
  const root = `${shellDirectory}/site`;
  const env = { ...process.env, DEVPULSE_SANDBOX: shellDirectory, MOCK_MODE: mode, MSYS: "winsymlinks:nativestrict" };
  const run = (command: string, args: string[] = []) => spawnSync(bash, ["-c", command, "test", ...args], { env, encoding: "utf8", timeout: 20_000 });
  const write = (path: string, content: string) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true });
    writeFileSync(join(directory, path), content);
  };
  write("Caddyfile", `${domain} {\n    reverse_proxy localhost:3000\n}\n`);
  write("payload/index.html", `<!doctype html><html><head><title>DevPulse</title></head><body><a href="/edition/${date}/">${date}</a></body></html>`);
  write("payload/latest.json", JSON.stringify({ date, status: "published", storyCount: 3 }));
  write("payload/rss.xml", `<rss version="2.0"><channel><title>DevPulse</title><item><link>https://${domain}/edition/${date}/</link></item></channel></rss>`);
  write(`payload/edition/${date}/index.html`, `<!doctype html><html><head><title>DevPulse ${date}</title></head><body>${date}</body></html>`);
  write("payload/release-sha.txt", `${sha}\n`);
  write(`site/releases/${priorSha}/sentinel`, "previous release must survive");
  write("unrelated-service/sentinel", "unrelated service must survive");
  write("bin/caddy", '#!/usr/bin/env bash\nprintf "caddy %s\\n" "$*" >> "$DEVPULSE_SANDBOX/commands"\n[[ "$MOCK_MODE" != validation ]]\n');
  write("bin/systemctl", '#!/usr/bin/env bash\nprintf "systemctl %s\\n" "$*" >> "$DEVPULSE_SANDBOX/commands"\nif [[ "$1" == reload && "$MOCK_MODE" == reload && ! -f "$DEVPULSE_SANDBOX/reload-failed" ]]; then touch "$DEVPULSE_SANDBOX/reload-failed"; exit 1; fi\n');
  write("bin/curl", `#!/usr/bin/env bash
printf 'curl %s\\n' "$*" >> "$DEVPULSE_SANDBOX/commands"
output=''
while (($#)); do
  case "$1" in --output) output="$2"; shift;; https://*) url="$1";; esac
  shift
done
if [[ "$MOCK_MODE" == probe ]]; then exit 22; fi
path="\${url#https://${domain}}"
case "$path" in /) path=/index.html;; /edition/*/) path="\${path}index.html";; esac
cat "$DEVPULSE_SANDBOX/payload$path" > "$output"
if [[ "$MOCK_MODE" == stale && "$path" == /release-sha.txt ]]; then printf '${priorSha}\\n' > "$output"; fi
printf '200'
`);
  if (process.platform === "win32") {
    write("bin/flock", "#!/usr/bin/env bash\nexit 0\n");
    write("bin/ln", `#!/usr/bin/env bash\n"${posix(process.execPath)}" -e 'require("node:fs").symlinkSync(process.argv[1], process.argv[2], "junction")' "\${@: -2:1}" "\${@: -1}"\n`);
  }
  const prepared = run('chmod +x "$DEVPULSE_SANDBOX"/bin/*; export PATH="$DEVPULSE_SANDBOX/bin:$PATH"; ln -s "$DEVPULSE_SANDBOX/site/releases/' + priorSha + '" "$DEVPULSE_SANDBOX/site/current"');
  expect(prepared.status, prepared.stderr).toBe(0);
  const original = readFileSync(join(directory, "Caddyfile"), "utf8");
  const execute = (options: { digest?: string; tarArgs?: string[] } = {}) => {
    const packed = run('tar -czf "$DEVPULSE_SANDBOX/archive.tar.gz" "$@" -C "$DEVPULSE_SANDBOX/payload" .', options.tarArgs ?? []);
    expect(packed.status, packed.stderr).toBe(0);
    const digest = createHash("sha256").update(readFileSync(join(directory, "archive.tar.gz"))).digest("hex");
    return run('export PATH="$DEVPULSE_SANDBOX/bin:$PATH"; bash "$1" "$2" "$3" "$4"', [posix(script), sha, options.digest ?? digest, date]);
  };
  const target = () => run('readlink "$DEVPULSE_SANDBOX/site/current"').stdout.trim();
  const preserved = () => {
    expect(readFileSync(join(directory, `site/releases/${priorSha}/sentinel`), "utf8")).toBe("previous release must survive");
    expect(readFileSync(join(directory, "unrelated-service/sentinel"), "utf8")).toBe("unrelated service must survive");
  };
  return { directory, root, write, run, execute, target, preserved, original, clean: () => rmSync(directory, { recursive: true, force: true }) };
}

describe("EC2 release transaction (sandbox only)", () => {
  for (const mode of ["success", "probe"]) {
    test(`shared host ${mode} preserves unrelated Caddy configuration exactly`, () => {
      const host = sandbox(mode);
      const otherSite = '\n# Existing second application\nrca.tatsatpandey.com {\n    respond "Existing application" 200\n}\n';
      try {
        host.write("Caddyfile", `${host.original}${otherSite}`);
        const result = host.execute();
        const config = readFileSync(join(host.directory, "Caddyfile"), "utf8");
        if (mode === "success") {
          expect(result.status, result.stderr).toBe(0);
          expect(config.endsWith(otherSite)).toBe(true);
          expect(config).toContain("file_server");
        } else {
          expect(result.status).not.toBe(0);
          expect(config).toBe(`${host.original}${otherSite}`);
          expect(host.target()).toBe(`${host.root}/releases/${priorSha}`);
        }
        host.preserved();
      } finally { host.clean(); }
    }, 30_000);
  }

  test("activates the exact artifact and preserves the previous release", () => {
    const host = sandbox();
    try {
      const result = host.execute();
      expect(result.status, result.stderr).toBe(0);
      expect(host.target()).toBe(`${host.root}/releases/${sha}`);
      expect(readFileSync(join(host.directory, "Caddyfile"), "utf8")).toContain("file_server");
      host.preserved();
    } finally { host.clean(); }
  }, 30_000);

  for (const mode of ["validation", "reload", "probe", "stale"]) {
    test(`${mode} failure leaves the previous configuration and release active`, () => {
      const host = sandbox(mode);
      try {
        const result = host.execute();
        expect(result.status, result.stdout).not.toBe(0);
        expect(host.target()).toBe(`${host.root}/releases/${priorSha}`);
        expect(readFileSync(join(host.directory, "Caddyfile"), "utf8")).toBe(host.original);
        const commands = readFileSync(join(host.directory, "commands"), "utf8");
        if (mode === "validation") expect(commands).not.toContain("systemctl reload");
        else expect(commands.match(/systemctl reload/g)?.length).toBeGreaterThanOrEqual(2);
        host.preserved();
      } finally { host.clean(); }
    }, 30_000);
  }

  test("duplicate SHA is refused without overwriting an existing release", () => {
    const host = sandbox();
    try {
      host.write(`site/releases/${sha}/sentinel`, "immutable");
      expect(host.execute().status).not.toBe(0);
      expect(readFileSync(join(host.directory, `site/releases/${sha}/sentinel`), "utf8")).toBe("immutable");
      expect(existsSync(join(host.directory, `site/releases/${sha}/index.html`))).toBe(false);
      expect(host.target()).toBe(`${host.root}/releases/${priorSha}`);
      host.preserved();
    } finally { host.clean(); }
  }, 30_000);

  test("Artifact preflight checks real sandbox files and refuses a stale edition before packaging", async () => {
    const host = sandbox();
    try {
      await expect(probeArtifact(join(host.directory, "payload"), `https://${domain}`, date, sha, new Date("2026-09-25T10:00:00Z"))).resolves.toBeUndefined();
      await expect(probeArtifact(join(host.directory, "payload"), `https://${domain}`, date, sha, new Date("2026-10-01T10:00:00Z"))).rejects.toThrow("stale");
      host.write("payload/latest.json", JSON.stringify({ date, status: "draft", storyCount: 3 }));
      await expect(probeArtifact(join(host.directory, "payload"), `https://${domain}`, date, sha, new Date("2026-09-25T10:00:00Z"))).rejects.toThrow("unapproved");
      expect(existsSync(join(host.directory, "commands"))).toBe(false);
    } finally { host.clean(); }
  }, 30_000);

  for (const condition of ["unfamiliar target", "duplicate target", "checksum", "incomplete", "marker", "traversal"] as const) {
    test(`preflight rejects ${condition} without reloading or replacing the active site`, () => {
      const host = sandbox();
      try {
        if (condition === "unfamiliar target") host.write("Caddyfile", host.original.replace("localhost:3000", "localhost:4000"));
        if (condition === "duplicate target") host.write("Caddyfile", host.original.repeat(2));
        if (condition === "incomplete") rmSync(join(host.directory, "payload/rss.xml"));
        if (condition === "marker") host.write("payload/release-sha.txt", `${priorSha}\n`);
        const before = readFileSync(join(host.directory, "Caddyfile"), "utf8");
        const result = host.execute({
          digest: condition === "checksum" ? "0".repeat(64) : undefined,
          tarArgs: condition === "traversal" ? ["--transform=s|^./index.html$|../escape.html|"] : undefined,
        });
        expect(result.status, result.stdout).not.toBe(0);
        expect(host.target()).toBe(`${host.root}/releases/${priorSha}`);
        expect(readFileSync(join(host.directory, "Caddyfile"), "utf8")).toBe(before);
        expect(readFileSync(join(host.directory, "commands"), "utf8")).not.toContain("systemctl reload");
        expect(existsSync(join(host.directory, `site/releases/${sha}`))).toBe(false);
        host.preserved();
      } finally { host.clean(); }
    }, 30_000);
  }

  test("first deployment probe failure restores the proxy and removes only the new pointer", () => {
    const host = sandbox("probe");
    try {
      expect(host.run('rm -f "$DEVPULSE_SANDBOX/site/current"').status).toBe(0);
      const result = host.execute();
      expect(result.status, result.stdout).not.toBe(0);
      expect(host.target()).toBe("");
      expect(readFileSync(join(host.directory, "Caddyfile"), "utf8")).toBe(host.original);
      expect(readFileSync(join(host.directory, "commands"), "utf8").match(/systemctl reload/g)?.length).toBe(2);
      host.preserved();
    } finally { host.clean(); }
  }, 30_000);
});

describe("Public release probe (mock HTTP)", () => {
  const now = new Date("2026-09-25T10:00:00Z");
  const origin = `https://${domain}`;
  const html = `<html><head><title>DevPulse ${date}</title></head><body>${date}</body></html>`;
  const responses: Record<string, [string, string]> = {
    "/": [html, "text/html"],
    "/latest.json": [JSON.stringify({ date, status: "published", storyCount: 3 }), "application/json"],
    "/rss.xml": [`<rss version="2.0"><channel><item><link>${origin}/edition/${date}/</link></item></channel></rss>`, "application/rss+xml"],
    [`/edition/${date}/`]: [html, "text/html"],
    "/release-sha.txt": [`${sha}\n`, "text/plain"],
  };
  function fetcher(overrides: Record<string, Partial<{ body: string; type: string; status: number }>> = {}) {
    return (async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.redirect).toBe("error");
      expect(init?.cache).toBe("no-store");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      const path = new URL(input.toString()).pathname;
      const [body, type] = responses[path] ?? ["", "text/plain"];
      const override = overrides[path];
      return new Response(override?.body ?? body, { status: override?.status ?? 200, headers: { "Content-Type": override?.type ?? type } });
    }) as typeof fetch;
  }

  test("accepts the expected published and corrected editions at the exact SHA", async () => {
    await expect(probeSite(origin, date, fetcher(), now, sha)).resolves.toBeUndefined();
    await expect(probeSite(origin, date, fetcher({ "/latest.json": { body: JSON.stringify({ date, status: "corrected", storyCount: 7 }) } }), now, sha)).resolves.toBeUndefined();
  });

  for (const [name, path, override] of [
    ["redirect", "/", { status: 302 }],
    ["server error", "/latest.json", { status: 503 }],
    ["HTML masquerading as JSON", "/latest.json", { type: "text/html" }],
    ["wrong release", "/release-sha.txt", { body: `${priorSha}\n` }],
    ["wrong edition", "/latest.json", { body: JSON.stringify({ date: "2026-09-23", status: "published", storyCount: 3 }) }],
    ["draft edition", "/latest.json", { body: JSON.stringify({ date, status: "draft", storyCount: 3 }) }],
    ["oversized edition", "/latest.json", { body: JSON.stringify({ date, status: "published", storyCount: 101 }) }],
    ["string count", "/latest.json", { body: JSON.stringify({ date, status: "published", storyCount: "3" }) }],
    ["fractional count", "/latest.json", { body: JSON.stringify({ date, status: "published", storyCount: 3.5 }) }],
    ["stale home", "/", { body: html.replaceAll(date, "2026-09-23") }],
    ["error page", `/edition/${date}/`, { body: `DevPulse ${date}` }],
    ["RSS substring only", "/rss.xml", { body: `<link>${origin}/edition/${date}</link>` }],
    ["malformed RSS", "/rss.xml", { body: `<rss><channel><item>${date}` }],
    ["foreign RSS origin", "/rss.xml", { body: responses["/rss.xml"][0].replace(origin, "https://other.example") }],
  ] as const) {
    test(`rejects ${name}`, async () => {
      await expect(probeSite(origin, date, fetcher({ [path]: override }), now, sha)).rejects.toThrow();
    });
  }

  test("rejects stale, impossible and future dates and unsafe probe origins before fetching", async () => {
    const neverFetch = (async () => { throw new Error("Unexpected request"); }) as unknown as typeof fetch;
    for (const invalidDate of ["2026-09-18", "2026-02-30", "2026-09-26", "invalid"]) {
      await expect(probeSite(origin, invalidDate, neverFetch, now, sha)).rejects.toThrow("stale or invalid");
    }
    for (const invalidOrigin of ["http://example.org", "https://user:password@example.org", "https://example.org/subpath", "https://example.org/?query=1"]) {
      await expect(probeSite(invalidOrigin, date, neverFetch, now, sha)).rejects.toThrow("HTTPS origin");
    }
    await expect(probeSite(origin, date, neverFetch, now, "bad-sha")).rejects.toThrow("release SHA");
  });
});