// Rasterizes public/favicon.svg and public/og.jpg into the Android launcher
// icons, splash screens and Google Play listing graphics.
// Usage: node mobile/generate-android-assets.mjs  (CHROME_PATH overrides the browser)
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const res = join(root, "android/app/src/main/res");
const store = join(root, "mobile/store");
const BG = "#110e0c";

const favicon = readFileSync(join(root, "public/favicon.svg"), "utf8");
const bgRect = '<rect width="32" height="32" rx="6" fill="#110e0c"/>';
if (!favicon.includes(bgRect)) {
  throw new Error("public/favicon.svg changed: background rect not found, update this script");
}
const art = favicon.replace(bgRect, "");
const toDataUrl = (/** @type {string} */ svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
const ogDataUrl = `data:image/jpeg;base64,${readFileSync(join(root, "public/og.jpg")).toString("base64")}`;

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const SPLASH_PORT = {
  mdpi: [320, 480],
  hdpi: [480, 800],
  xhdpi: [720, 1280],
  xxhdpi: [960, 1600],
  xxxhdpi: [1280, 1920],
};

/**
 * Centered artwork on an optional background; `scale` is the art box relative to min(w, h).
 * @param {{ src: string, scale: number, background?: string, radius?: string, cover?: boolean }} options
 */
function page({ src, scale, background = "transparent", radius = "0", cover = false }) {
  const img = cover
    ? `<img src="${src}" style="width:100%;height:100%;object-fit:cover">`
    : `<img src="${src}" style="width:${scale * 100}vmin;height:${scale * 100}vmin">`;
  return `<!doctype html><html><body style="margin:0;width:100vw;height:100vh;display:grid;place-items:center;overflow:hidden;background:${background};border-radius:${radius}">${img}</body></html>`;
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || undefined,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const tab = await browser.newPage();

/**
 * @param {string} file
 * @param {number} width
 * @param {number} height
 * @param {string} html
 */
async function render(file, width, height, html) {
  mkdirSync(dirname(file), { recursive: true });
  await tab.setViewportSize({ width, height });
  await tab.setContent(html, { waitUntil: "load" });
  await tab.screenshot({ path: file, omitBackground: true });
  console.log(`${width}x${height}  ${file.replace(root + "/", "")}`);
}

try {
  for (const [name, d] of Object.entries(DENSITIES)) {
    const dir = join(res, `mipmap-${name}`);
    const icon = Math.round(48 * d);
    const fg = Math.round(108 * d);
    await render(join(dir, "ic_launcher.png"), icon, icon, page({ src: toDataUrl(favicon), scale: 1 }));
    await render(
      join(dir, "ic_launcher_round.png"),
      icon,
      icon,
      page({ src: toDataUrl(art), scale: 0.86, background: BG, radius: "50%" }),
    );
    // Adaptive icon foreground: keep the art inside the 66dp safe zone of the 108dp canvas.
    await render(join(dir, "ic_launcher_foreground.png"), fg, fg, page({ src: toDataUrl(art), scale: 0.58 }));
  }

  const splash = page({ src: toDataUrl(art), scale: 0.32, background: BG });
  for (const [name, [w, h]] of Object.entries(SPLASH_PORT)) {
    await render(join(res, `drawable-port-${name}/splash.png`), w, h, splash);
    await render(join(res, `drawable-land-${name}/splash.png`), h, w, splash);
  }
  await render(join(res, "drawable/splash.png"), 480, 320, splash);

  await render(join(store, "icon-512.png"), 512, 512, page({ src: toDataUrl(art), scale: 0.86, background: BG }));
  await render(join(store, "feature-graphic-1024x500.png"), 1024, 500, page({ src: ogDataUrl, scale: 1, cover: true }));
} finally {
  await browser.close();
}
