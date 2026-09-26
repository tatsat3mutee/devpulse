import { topicDesk, type Desk, type Diagram, type DigestItem } from "./digest";

// Deterministic, dependency-free graphics built from data we already hold. Nothing here fetches or invents content.

export function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function seeded(seed: string) {
  let state = hash(seed) || 1;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5; state >>>= 0;
    return state / 4294967296;
  };
}

export const escapeXml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const r1 = (n: number) => Math.round(n * 10) / 10;
export const deskOf = (item: Pick<DigestItem, "topic">): Desk => topicDesk(item.topic);

/** Generated cover art: a motif per story kind, tinted by desk, seeded by story id so it is stable across builds. */
export function coverSvg(item: DigestItem): string {
  const W = 320, H = 180;
  const rand = seeded(item.id);
  const parts: string[] = [];
  const kind = item.kind ?? (item.source === "papers" ? "paper" : item.source === "github" ? "tool" : "news");

  const variant = rand();
  if ((kind === "paper" && variant < 0.67) || kind === "benchmark") {
    if (kind === "benchmark" || variant < 0.34) {
      // Bar comparison: one highlighted bar among neutral ones.
      const bars = 6 + Math.floor(rand() * 3), w = 22, gap = 12, x0 = (W - bars * (w + gap) + gap) / 2, base = 140;
      const best = Math.floor(rand() * bars);
      for (let i = 0; i < bars; i++) {
        const h = 30 + rand() * 80;
        parts.push(`<rect x="${r1(x0 + i * (w + gap))}" y="${r1(base - h)}" width="${w}" height="${r1(h)}" rx="2" class="${i === best ? "c-fill" : "c-mute"}"/>`);
      }
      parts.push(`<path d="M${x0 - 10} ${base}H${W - x0 + 10}" class="c-line"/>`);
    } else {
      let d = "M40 130";
      for (let x = 40; x <= 280; x += 12) d += `L${x} ${r1(130 - 90 * (1 - Math.exp(-(x - 40) / (40 + rand() * 30))) + (rand() - 0.5) * 8)}`;
      parts.push(`<path d="M36 30V134H286" class="c-line"/>`, `<path d="${d}" class="c-line c-thick"/>`);
      for (let x = 64; x <= 280; x += 48) parts.push(`<path d="M${x} 134v4" class="c-line"/>`);
    }
  } else if (kind === "paper") {
    const cols = 16, rows = 7, gap = 14, x0 = 48, y0 = 30;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const v = rand();
      const r = v > 0.82 ? 4.2 : v > 0.55 ? 2.6 : 1.3;
      parts.push(`<circle cx="${x0 + x * gap}" cy="${y0 + y * gap}" r="${r}" class="${v > 0.82 ? "c-fill" : "c-mute"}"/>`);
    }
    parts.push(`<path d="M${x0 - 16} ${y0 - 12}v${rows * gap + 4}M${x0 - 16} ${y0 + rows * gap - 8}h${cols * gap + 8}" class="c-line"/>`);
  } else if (kind === "vulnerability" && variant < 0.5) {
    for (let y = 30; y < 150; y += 16) parts.push(`<rect x="40" y="${y}" width="${r1(120 + rand() * 120)}" height="6" rx="3" class="c-mute"/>`);
    parts.push(`<rect x="196" y="72" width="64" height="52" rx="6" class="c-surface c-stroke"/>`, `<path d="M208 72v-12a20 20 0 0 1 40 0v12" class="c-line c-thick"/>`, `<circle cx="228" cy="96" r="6" class="c-fill"/>`);
  } else if (kind === "vulnerability") {
    for (let i = -6; i < 22; i++) parts.push(`<path d="M${i * 22} ${H}l${H * 0.7} -${H}h11l-${H * 0.7} ${H}z" class="c-mute"/>`);
    parts.push(`<path d="M160 36l44 16v34c0 28-19 46-44 56-25-10-44-28-44-56V52z" class="c-surface c-stroke"/>`);
    parts.push(`<path d="M160 70v30M160 110v4" class="c-line c-thick"/>`);
  } else if (kind === "postmortem") {
    const base = 118;
    let d = `M0 ${base}`;
    const spikeAt = 150 + Math.floor(rand() * 60);
    for (let x = 8; x <= W; x += 8) {
      const inIncident = x >= spikeAt && x < spikeAt + 48;
      const y = inIncident ? base - 40 - rand() * 50 : base - rand() * 10;
      d += `L${x} ${r1(y)}`;
    }
    parts.push(`<rect x="${spikeAt - 6}" y="20" width="60" height="${H - 40}" class="c-mute"/>`);
    parts.push(`<path d="${d}" class="c-line c-thick"/>`);
    parts.push(`<path d="M0 ${base + 22}H${W}" class="c-line"/>`);
    for (let x = 24; x < W; x += 48) parts.push(`<path d="M${x} ${base + 18}v8" class="c-line"/>`);
  } else if (kind === "release" || kind === "tool") {
    const lanes = [60, 96, 132];
    parts.push(`<path d="M20 ${lanes[1]}H300" class="c-line c-thick"/>`);
    let x = 40;
    while (x < 290) {
      const lane = lanes[Math.floor(rand() * 3)];
      if (lane !== lanes[1]) parts.push(`<path d="M${x - 18} ${lanes[1]}C${x - 6} ${lanes[1]} ${x - 12} ${lane} ${x} ${lane}H${x + 26}C${x + 38} ${lane} ${x + 32} ${lanes[1]} ${x + 44} ${lanes[1]}" class="c-line"/>`);
      parts.push(`<circle cx="${x}" cy="${lane}" r="6" class="c-surface c-stroke"/>`);
      x += 30 + Math.floor(rand() * 26);
    }
    parts.push(`<circle cx="290" cy="${lanes[1]}" r="9" class="c-fill"/>`);
  } else if (kind === "case-study" || kind === "guide") {
    // Boxes and arrows: a small system sketch, or numbered steps for guides.
    const n = 3 + Math.floor(rand() * 2), bw = 50, gap = (W - 60 - n * bw) / (n - 1);
    for (let i = 0; i < n; i++) {
      const x = 30 + i * (bw + gap), y = 64 + (kind === "guide" ? i * 8 - 8 : (rand() - 0.5) * 30);
      parts.push(`<rect x="${r1(x)}" y="${r1(y)}" width="${bw}" height="40" rx="5" class="${i === n - 1 ? "c-fill" : "c-surface c-stroke"}"/>`);
      if (i < n - 1) parts.push(`<path d="M${r1(x + bw + 4)} ${r1(y + 20)}H${r1(x + bw + gap - 6)}" class="c-line c-thick"/>`);
    }
  } else if (kind === "deep-dive") {
    let y = 26;
    let i = 0;
    while (y < H - 18) {
      const h = 8 + Math.floor(rand() * 16);
      const w = 60 + rand() * 220;
      parts.push(`<rect x="${r1((W - w) / 2)}" y="${y}" width="${r1(w)}" height="${h}" rx="2" class="${i % 3 === 2 ? "c-fill" : "c-mute"}"/>`);
      y += h + 5;
      i++;
    }
    parts.push(`<path d="M160 18V${H - 12}" class="c-line"/>`);
  } else if (kind === "essay") {
    parts.push(`<text x="40" y="120" class="c-glyph">“</text>`);
    for (let i = 0; i < 5; i++) parts.push(`<rect x="130" y="${46 + i * 20}" width="${r1(90 + rand() * 90)}" height="6" rx="3" class="c-mute"/>`);
  } else {
    const cx = 60 + rand() * 200, cy = 60 + rand() * 60;
    for (let r = 14; r < 320; r += 18) parts.push(`<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r}" class="${r % 54 === 14 ? "c-line c-thick" : "c-line"}"/>`);
    parts.push(`<circle cx="${r1(cx)}" cy="${r1(cy)}" r="7" class="c-fill"/>`);
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">`
    + `<rect width="${W}" height="${H}" class="c-bg"/>${parts.join("")}</svg>`;
}

export type DiagramLayout = {
  width: number;
  height: number;
  nodes: { id: string; lines: string[]; x: number; y: number; w: number; h: number }[];
  edges: { d: string; label?: string; lx: number; ly: number }[];
};

function wrap(label: string, max = 16): string[] {
  const words = label.split(/\s+/);
  const lines: string[] = [];
  for (const word of words) {
    const last = lines.at(-1);
    if (last !== undefined && (last + " " + word).length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word.length > max ? `${word.slice(0, max - 1)}…` : word);
  }
  return lines.slice(0, 2);
}

/** Left-to-right layered layout: each node sits one column after its furthest predecessor; back edges curve underneath. */
export function layoutDiagram(diagram: Diagram): DiagramLayout {
  const ids = diagram.nodes.map((node) => node.id);
  const order = new Map(ids.map((id, index) => [id, index]));
  const layer = new Map(ids.map((id) => [id, 0]));
  const forward = diagram.edges.filter((edge) => order.get(edge.from)! < order.get(edge.to)!);
  for (let pass = 0; pass < ids.length; pass++) {
    for (const edge of forward) layer.set(edge.to, Math.max(layer.get(edge.to)!, layer.get(edge.from)! + 1));
  }
  const columns: string[][] = [];
  for (const id of ids) (columns[layer.get(id)!] ??= []).push(id);
  const dense = columns.filter(Boolean);
  const nodeW = 118, colW = nodeW + 100, nodeH = 46, rowH = 70, padX = 12, padY = 16;
  const labelChars = Math.floor((colW - nodeW - 12) / 6.2);
  const fit = (label?: string) => label && label.length > labelChars ? `${label.slice(0, labelChars - 1)}\u2026` : label;
  const rows = Math.max(...dense.map((column) => column.length));
  const width = padX * 2 + (dense.length - 1) * colW + nodeW;
  const hasBack = diagram.edges.some((edge) => !forward.includes(edge));
  const height = padY * 2 + (rows - 1) * rowH + nodeH + (hasBack ? 34 : 0);
  const nodes: DiagramLayout["nodes"] = [];
  dense.forEach((column, c) => column.forEach((id, r) => {
    const offset = ((rows - column.length) * rowH) / 2;
    nodes.push({ id, lines: wrap(diagram.nodes[order.get(id)!].label), x: padX + c * colW, y: padY + offset + r * rowH, w: nodeW, h: nodeH });
  }));
  const at = new Map(nodes.map((node) => [node.id, node]));
  const edges = diagram.edges.map((edge) => {
    const a = at.get(edge.from)!, b = at.get(edge.to)!;
    if (forward.includes(edge)) {
      const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x - 6, y2 = b.y + b.h / 2;
      const mid = (x1 + x2) / 2;
      return { d: `M${x1} ${y1}C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`, label: fit(edge.label), lx: mid, ly: (y1 + y2) / 2 - 7 };
    }
    const bottom = height - 10;
    const x1 = a.x + a.w / 2, y1 = a.y + a.h, x2 = b.x + b.w / 2, y2 = b.y + b.h + 6;
    return { d: `M${x1} ${y1}C${x1} ${bottom} ${x2} ${bottom} ${x2} ${y2}`, label: edge.label, lx: (x1 + x2) / 2, ly: bottom - 4 };
  });
  return { width, height, nodes, edges };
}

export type PulsePoint = { id: string; x: number; y: number; desk: Desk; score: number; headline: string };

/** One heartbeat per story, in page order: spike height follows the editor's score, nudged by reader engagement. */
export function pulseLine(items: DigestItem[], width = 1000, height = 120) {
  const base = height * 0.72;
  const step = width / Math.max(1, items.length);
  const engagement = (item: DigestItem) => Math.log2(1 + (item.points ?? 0) + (item.comments ?? 0) + (item.stars ?? 0) / 10);
  const maxEngagement = Math.max(1, ...items.map(engagement));
  // Stretch across the day's own score range: scores cluster at 7-9, so a fixed 0-10 scale hides the differences.
  const lo = Math.min(...items.map((item) => item.score)), hi = Math.max(...items.map((item) => item.score));
  let d = `M0 ${base}`;
  const points: PulsePoint[] = items.map((item, index) => {
    const x = step * index + step / 2;
    const amplitude = 0.2 + (hi > lo ? (item.score - lo) / (hi - lo) : 0.5) * 0.6 + (engagement(item) / maxEngagement) * 0.2;
    const peak = base - Math.max(0.15, amplitude) * (base - 8);
    d += `L${r1(x - step * 0.32)} ${base}L${r1(x - step * 0.18)} ${r1(base + 6)}L${r1(x)} ${r1(peak)}L${r1(x + step * 0.16)} ${r1(base + 10)}L${r1(x + step * 0.3)} ${base}`;
    return { id: item.id, x: r1(x), y: r1(peak), desk: deskOf(item), score: item.score, headline: item.headline };
  });
  d += `L${width} ${base}`;
  return { d, points, base, width, height };
}
