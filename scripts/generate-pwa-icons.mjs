import fs from "fs";
import path from "path";
import sharp from "sharp";

const root = path.resolve("public");
const mascot = fs.readFileSync(path.join(root, "joojo", "stella-icon-512.png"));

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

await Promise.all(
  targets.map(({ name, size }) =>
    sharp(mascot)
      .resize(size, size)
      .png()
      .toFile(path.join(root, name))
  )
);

console.log("PWA icons generated:", targets.map((t) => t.name).join(", "));
