// Refreshes data/security-watch.json from CISA KEV and GitHub's reviewed critical advisories.
// Writes the file only when its entries change, and prints changed=true|false for the workflow.
import { writeFile } from "node:fs/promises";
import { refreshSecurityWatch } from "./lib/security-watch";
import { SECURITY_WATCH_PATH, loadSecurityWatch, securityWatchSchema } from "../src/lib/security";

const previous = loadSecurityWatch();
const { watch, changed, failures } = await refreshSecurityWatch(previous, { githubToken: process.env.GITHUB_TOKEN });
for (const failure of failures) console.warn(`Security watch source failed, kept previous entries: ${failure}`);
if (changed) await writeFile(SECURITY_WATCH_PATH, `${JSON.stringify(securityWatchSchema.parse(watch), null, 2)}\n`);
console.log(`Security watch: ${watch.kev.length} exploited CVEs (30 days), ${watch.advisories.length} critical advisories (7 days)`);
console.log(`changed=${changed}`);
if (failures.length === 2 && !previous) process.exitCode = 1;
