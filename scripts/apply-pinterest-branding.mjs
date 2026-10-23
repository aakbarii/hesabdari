import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const masterIconPath = "C:/Users/amin/.gemini/antigravity/brain/daf4be3b-c732-43b6-878d-0a913f252c7f/joojo_pinterest_app_icon_1792746077216.jpg";

if (!fs.existsSync(masterIconPath)) {
  console.error("Master Pinterest icon not found at:", masterIconPath);
  process.exit(1);
}

function createIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4);

  const dirSize = 16 * count;
  let currentOffset = 6 + dirSize;

  const entries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // palette colors
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // size
    entry.writeUInt32LE(currentOffset, 12); // offset
    entries.push(entry);

    currentOffset += img.buffer.length;
  }

  return Buffer.concat([
    header,
    ...entries,
    ...images.map((img) => img.buffer),
  ]);
}

async function run() {
  console.log("Generating Pinterest-aesthetic icon suite...");

  const inputBuffer = fs.readFileSync(masterIconPath);

  // We want to generate sharp PNGs for various standard sizes
  const sizes = [16, 32, 48, 64, 128, 180, 192, 256, 512, 1024];
  const rendered = {};

  for (const s of sizes) {
    rendered[s] = await sharp(inputBuffer)
      .resize(s, s, { fit: "cover", position: "center" })
      .png({ compressionLevel: 9 })
      .toBuffer();
    console.log(`Rendered ${s}x${s} PNG`);
  }

  const buildResourcesDir = path.join(rootDir, "build-resources");
  const electronDir = path.join(rootDir, "electron");
  const publicDir = path.join(rootDir, "public");
  const joojoDir = path.join(publicDir, "joojo");

  fs.mkdirSync(buildResourcesDir, { recursive: true });
  fs.mkdirSync(electronDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(joojoDir, { recursive: true });

  // 1. Electron & Build Resources
  fs.writeFileSync(path.join(buildResourcesDir, "icon.png"), rendered[512]);
  fs.writeFileSync(path.join(electronDir, "icon.png"), rendered[256]);

  // 2. Windows ICO with multi-resolutions
  const icoSizes = [256, 128, 64, 48, 32, 16];
  const icoImages = icoSizes.map((s) => ({
    width: s,
    height: s,
    buffer: rendered[s],
  }));
  const icoBuffer = createIco(icoImages);
  fs.writeFileSync(path.join(buildResourcesDir, "icon.ico"), icoBuffer);
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuffer);

  // 3. Public Web / PWA icons
  fs.writeFileSync(path.join(publicDir, "icon.png"), rendered[512]);
  fs.writeFileSync(path.join(publicDir, "icon-512.png"), rendered[512]);
  fs.writeFileSync(path.join(publicDir, "icon-192.png"), rendered[192]);
  fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), rendered[180]);

  // 4. JooJoo specific icons
  fs.writeFileSync(path.join(joojoDir, "stella-icon-512.png"), rendered[512]);
  fs.writeFileSync(path.join(joojoDir, "stella-icon-192.png"), rendered[192]);
  fs.writeFileSync(path.join(joojoDir, "stella-icon-180.png"), rendered[180]);
  fs.writeFileSync(path.join(joojoDir, "stella-icon-32.png"), rendered[32]);
  fs.writeFileSync(path.join(joojoDir, "pinterest-app-icon.png"), rendered[512]);

  console.log("Pinterest icon suite successfully generated across all targets!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
