import fs from "fs";
import path from "path";
import sharp from "sharp";

const rootDir = process.cwd();
const svgPath = path.join(rootDir, "public", "icon.svg");

if (!fs.existsSync(svgPath)) {
  console.error("SVG file not found at:", svgPath);
  process.exit(1);
}

const svgBuffer = fs.readFileSync(svgPath);

async function generatePng(size) {
  return await sharp(svgBuffer)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

function createIco(images) {
  // images: array of { width, height, buffer }
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
  console.log("Generating icon assets from SVG...");

  const sizes = [16, 32, 48, 64, 128, 256, 512];
  const rendered = {};

  for (const s of sizes) {
    rendered[s] = await generatePng(s);
    console.log(`Rendered PNG ${s}x${s} (${rendered[s].length} bytes)`);
  }

  // Ensure directories exist
  const buildResourcesDir = path.join(rootDir, "build-resources");
  const electronDir = path.join(rootDir, "electron");
  const publicDir = path.join(rootDir, "public");

  fs.mkdirSync(buildResourcesDir, { recursive: true });
  fs.mkdirSync(electronDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });

  // 1. Write build-resources/icon.png (512x512)
  fs.writeFileSync(path.join(buildResourcesDir, "icon.png"), rendered[512]);
  console.log("Created build-resources/icon.png");

  // 2. Write electron/icon.png (256x256)
  fs.writeFileSync(path.join(electronDir, "icon.png"), rendered[256]);
  console.log("Created electron/icon.png");

  // 3. Write public icons
  fs.writeFileSync(path.join(publicDir, "icon.png"), rendered[512]);
  fs.writeFileSync(path.join(publicDir, "icon-512.png"), rendered[512]);
  fs.writeFileSync(path.join(publicDir, "icon-192.png"), rendered[192] || await generatePng(192));
  fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), rendered[180] || await generatePng(180));
  console.log("Created public icon assets (icon.png, icon-512.png, icon-192.png, apple-touch-icon.png)");

  // 4. Create multi-size Windows ICO
  const icoSizes = [256, 128, 64, 48, 32, 16];
  const icoImages = icoSizes.map((s) => ({
    width: s,
    height: s,
    buffer: rendered[s],
  }));

  const icoBuffer = createIco(icoImages);
  fs.writeFileSync(path.join(buildResourcesDir, "icon.ico"), icoBuffer);
  console.log(`Created build-resources/icon.ico (${icoBuffer.length} bytes)`);

  console.log("All icons generated successfully!");
}

run().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});
