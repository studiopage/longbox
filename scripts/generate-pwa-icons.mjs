#!/usr/bin/env node
import sharp from "sharp";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ICONS_DIR = join(ROOT, "public", "icons");
const BG = { r: 13, g: 20, b: 16, alpha: 1 };
mkdirSync(ICONS_DIR, { recursive: true });
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#0d1410"/><ellipse cx="256" cy="290" rx="100" ry="120" fill="#1a2b1f"/><ellipse cx="256" cy="290" rx="95" ry="115" fill="#1e3028"/><path d="M156 260 C120 220,100 300,140 360 C160 320,170 290,180 280 Z" fill="#1a2b1f"/><path d="M356 260 C392 220,412 300,372 360 C352 320,342 290,332 280 Z" fill="#1a2b1f"/><ellipse cx="256" cy="320" rx="60" ry="80" fill="#243d2e"/><circle cx="256" cy="190" r="95" fill="#1e3028"/><path d="M196 120 C188 90,175 75,190 60 C200 75,205 95,210 115 Z" fill="#1a2b1f"/><path d="M316 120 C324 90,337 75,322 60 C312 75,307 95,302 115 Z" fill="#1a2b1f"/><circle cx="220" cy="195" r="35" fill="none" stroke="#8B6914" stroke-width="4"/><circle cx="292" cy="195" r="35" fill="none" stroke="#8B6914" stroke-width="4"/><rect x="253" y="192" width="14" height="6" rx="3" fill="#8B6914"/><circle cx="220" cy="195" r="26" fill="#0a1a10"/><circle cx="292" cy="195" r="26" fill="#0a1a10"/><circle cx="220" cy="195" r="18" fill="#1a4a28"/><circle cx="292" cy="195" r="18" fill="#1a4a28"/><circle cx="220" cy="195" r="10" fill="#050d08"/><circle cx="292" cy="195" r="10" fill="#050d08"/><circle cx="226" cy="189" r="4" fill="rgba(160,180,145,0.7)"/><circle cx="298" cy="189" r="4" fill="rgba(160,180,145,0.7)"/><path d="M248 218 L256 238 L264 218 Z" fill="#8B6914"/></svg>`;
const svgPath = join(ICONS_DIR, "owl-icon.svg");
writeFileSync(svgPath, SVG);
const source = readFileSync(svgPath);
async function run() {
  for (const size of [72,96,128,144,152,192,384,512]) {
    await sharp(source).resize(size,size).png().toFile(join(ICONS_DIR,`icon-${size}x${size}.png`));
    console.log(`✓ icon-${size}x${size}.png`);
  }
  const ms = Math.floor(512*0.8), pad = Math.floor((512-ms)/2);
  const buf = await sharp(source).resize(ms,ms).png().toBuffer();
  await sharp({create:{width:512,height:512,channels:4,background:BG}}).composite([{input:buf,top:pad,left:pad}]).png().toFile(join(ICONS_DIR,"icon-512x512-maskable.png"));
  console.log("✓ icon-512x512-maskable.png");
  const b180 = await sharp(source).resize(160,160).png().toBuffer();
  await sharp({create:{width:180,height:180,channels:4,background:BG}}).composite([{input:b180,top:10,left:10}]).png().toFile(join(ICONS_DIR,"apple-touch-icon.png"));
  console.log("✓ apple-touch-icon.png");
  await sharp(source).resize(32,32).png().toFile(join(ICONS_DIR,"favicon-32x32.png"));
  console.log("✓ favicon-32x32.png");
  console.log("\nDone! Now run: npm install serwist @serwist/next && npx tsc --noEmit");
}
run().catch(e=>{console.error(e);process.exit(1);});
