// Regenerates the installable-app icons from public/mark.svg. Run: bun run scripts/make-pwa-icons.ts
import sharp from "sharp";

const mark = await Bun.file("public/mark.svg").arrayBuffer();
const ink = { r: 17, g: 17, b: 16, alpha: 1 };

// Maskable icons are cropped to a circle or squircle by the launcher: keep the mark inside the central 60% safe zone.
for (const size of [192, 512]) {
  const inner = Math.round(size * 0.6);
  const logo = await sharp(Buffer.from(mark)).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: ink } })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(`public/icon-maskable-${size}.png`);
}

// Shortcut icons: the mark with a small letter badge, so launchers show which shortcut is which.
const shortcuts = { today: "T", pulse: "P", search: "S", archive: "A" } as const;
for (const [name, letter] of Object.entries(shortcuts)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="18" fill="#111110"/><text x="48" y="64" text-anchor="middle" font-family="Liberation Serif, DejaVu Serif, serif" font-size="52" font-weight="700" fill="#f9f8f4">${letter}</text><path d="M78 14 70 44" stroke="#be2d23" stroke-width="6"/></svg>`;
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(`public/shortcut-${name}.png`);
}
console.log("Icons written to public/");
