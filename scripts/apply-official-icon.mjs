import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const masterIconPath = path.join(rootDir, "public", "joojo", "centered-icon.png");

if (!fs.existsSync(masterIconPath)) {
  console.error("Master icon not found at:", masterIconPath);
  process.exit(1);
}

function createIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirSize = 16 * count;
  let currentOffset = 6 + dirSize;

  const entries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.buffer.length, 8);
    entry.writeUInt32LE(currentOffset, 12);
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
  console.log("Applying official user-provided Stella face as the primary app logo...");

  const inputBuffer = fs.readFileSync(masterIconPath);

  const sizes = [16, 32, 48, 64, 128, 180, 192, 256, 512, 960];
  const rendered = {};

  for (const s of sizes) {
    rendered[s] = await sharp(inputBuffer)
      .resize(s, s, { fit: "cover", position: "center" })
      .png({ compressionLevel: 9 })
      .toBuffer();
  }

  const buildResourcesDir = path.join(rootDir, "build-resources");
  const electronDir = path.join(rootDir, "electron");
  const publicDir = path.join(rootDir, "public");
  const joojoDir = path.join(publicDir, "joojo");

  fs.mkdirSync(buildResourcesDir, { recursive: true });
  fs.mkdirSync(electronDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(joojoDir, { recursive: true });

  // 1. Electron & Build Resources (Desktop installation)
  fs.writeFileSync(path.join(buildResourcesDir, "icon.png"), rendered[512]);
  fs.writeFileSync(path.join(electronDir, "icon.png"), rendered[256]);

  // 2. Windows ICO
  const icoSizes = [256, 128, 64, 48, 32, 16];
  const icoImages = icoSizes.map((s) => ({
    width: s,
    height: s,
    buffer: rendered[s],
  }));
  const icoBuffer = createIco(icoImages);
  fs.writeFileSync(path.join(buildResourcesDir, "icon.ico"), icoBuffer);
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuffer);

  // 3. Web & Mobile PWA install icons (Homescreen / Add to homescreen)
  fs.writeFileSync(path.join(publicDir, "icon.png"), rendered[512]);
  fs.writeFileSync(path.join(publicDir, "icon-512.png"), rendered[512]);
  fs.writeFileSync(path.join(publicDir, "icon-192.png"), rendered[192]);
  fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), rendered[180]);

  // 4. In-App JooJoo Icons (Headers, Sidebar, Settings, install page)
  fs.writeFileSync(path.join(joojoDir, "stella-icon-512.png"), rendered[512]);
  fs.writeFileSync(path.join(joojoDir, "stella-icon-192.png"), rendered[192]);
  fs.writeFileSync(path.join(joojoDir, "stella-icon-180.png"), rendered[180]);
  fs.writeFileSync(path.join(joojoDir, "stella-icon-32.png"), rendered[32]);
  fs.writeFileSync(path.join(joojoDir, "app-logo.png"), rendered[512]);

  console.log("Official app logo successfully generated across all platforms and targets!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
