import { DESKS, type Desk, type Digest } from "./digest";
import { deskOf, escapeXml, pulseLine } from "./visual";

// Light-theme values of the desk tokens in BaseLayout; social cards are always light.
const DESK_HEX: Record<Desk, string> = { ai: "#2a78d6", systems: "#eb6834", security: "#1baf7a", software: "#4a3aa7" };
const SERIF = "Newsreader, 'Liberation Serif', 'DejaVu Serif', serif";
const SANS = "Manrope, 'Liberation Sans', 'DejaVu Sans', sans-serif";
const MONO = "'DM Mono', 'Liberation Mono', 'DejaVu Sans Mono', monospace";

function lines(text: string, max: number, limit: number): string[] {
  const out: string[] = [];
  for (const word of text.split(/\s+/)) {
    const last = out.at(-1);
    if (last !== undefined && (last + " " + word).length <= max) out[out.length - 1] = `${last} ${word}`;
    else out.push(word);
  }
  if (out.length > limit) { out.length = limit; out[limit - 1] = `${out[limit - 1].replace(/[\s,.;:]+\S*$/, "")}…`; }
  return out;
}

/** 1200x630 social card for an edition: date, the must-reads, and the day's pulse. */
export function editionCardSvg(digest: Digest): string {
  const date = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${digest.date}T12:00:00Z`));
  const must = digest.items.filter((item) => item.mustRead).slice(0, 3);
  const pulse = pulseLine(digest.items, 1080, 110);
  let y = 214;
  const headlines = must.map((item, index) => {
    const wrapped = lines(item.headline, 52, 2);
    const block = `<rect x="60" y="${y - 26}" width="6" height="${wrapped.length * 40 - 8}" fill="${DESK_HEX[deskOf(item)]}"/>`
      + wrapped.map((line, n) => `<text x="84" y="${y + n * 40}" font-family="${SERIF}" font-size="${index === 0 ? 36 : 32}" font-weight="700" fill="#111110">${escapeXml(line)}</text>`).join("");
    y += wrapped.length * 40 + 22;
    return block;
  }).join("");
  const counts = (Object.keys(DESKS) as Desk[]).map((desk) => ({ desk, count: digest.items.filter((item) => deskOf(item) === desk).length })).filter((d) => d.count);
  let x = 60;
  const bar = counts.map(({ desk, count }) => {
    const w = (count / digest.items.length) * 1080 - 3;
    const seg = `<rect x="${x}" y="592" width="${Math.max(2, w)}" height="10" fill="${DESK_HEX[desk]}"/>`;
    x += w + 3;
    return seg;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#f9f8f4"/>
<rect x="60" y="52" width="44" height="44" fill="#111110"/><path d="M69 62h10c8 0 13 3 13 10s-5 10-13 10H69V62Zm8 5v10h2c4 0 7-1 7-5s-3-5-7-5h-2Z" fill="#f9f8f4"/><path d="M96 58 91 92" stroke="#be2d23" stroke-width="3.5"/>
<text x="120" y="88" font-family="${SERIF}" font-size="40" font-weight="700" fill="#111110">DevPulse</text>
<text x="1140" y="70" text-anchor="end" font-family="${MONO}" font-size="18" fill="#be2d23" letter-spacing="2">${escapeXml(date.toUpperCase())}</text>
<text x="1140" y="96" text-anchor="end" font-family="${SANS}" font-size="20" fill="#413e39">${digest.items.length} stories kept from ${digest.candidateCount} scored</text>
<path d="M60 124H1140M60 130H1140" stroke="#111110" stroke-width="1.5"/>
<text x="60" y="166" font-family="${MONO}" font-size="16" fill="#be2d23" letter-spacing="2">MUST READ</text>
${headlines}
<g transform="translate(60 468)"><path d="${pulse.d}" fill="none" stroke="#111110" stroke-width="2" stroke-linejoin="round"/>${pulse.points.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="${DESK_HEX[p.desk]}" stroke="#f9f8f4" stroke-width="2"/>`).join("")}</g>
${bar}
</svg>`;
}
