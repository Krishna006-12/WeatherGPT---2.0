const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SOURCE_IMAGE = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\6380e531-2c92-447b-97c5-c0df3290468c\\.user_uploaded\\media_1790356683373.png';
const ROOT_DIR = path.resolve(__dirname, '..');

// Helper to construct a multi-resolution Windows ICO from PNG buffers (16x16, 32x32, 48x48)
function createIcoFromPngs(pngBuffers) {
  // ICO header: 6 bytes
  // Reserved (2 bytes) = 0
  // Type (2 bytes) = 1 (icon)
  // Count (2 bytes) = number of images
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngBuffers.length, 4);

  const entries = [];
  let currentOffset = 6 + (16 * pngBuffers.length);

  for (const { width, height, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    // Width and Height: 1 byte each (0 indicates 256)
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // Image size in bytes
    entry.writeUInt32LE(currentOffset, 12); // Image offset in file
    entries.push(entry);
    currentOffset += buffer.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

async function run() {
  console.log('Generating icons from:', SOURCE_IMAGE);
  const sourceBuffer = fs.readFileSync(SOURCE_IMAGE);

  // Generate PNG sizes
  const [
    png512,
    png192,
    png180,
    png48,
    png32,
    png16,
    jpeg512
  ] = await Promise.all([
    sharp(sourceBuffer).resize(512, 512).png().toBuffer(),
    sharp(sourceBuffer).resize(192, 192).png().toBuffer(),
    sharp(sourceBuffer).resize(180, 180).png().toBuffer(),
    sharp(sourceBuffer).resize(48, 48).png().toBuffer(),
    sharp(sourceBuffer).resize(32, 32).png().toBuffer(),
    sharp(sourceBuffer).resize(16, 16).png().toBuffer(),
    sharp(sourceBuffer).resize(512, 512).jpeg({ quality: 95 }).toBuffer()
  ]);

  // Construct ICO buffer with 16, 32, 48 px PNGs
  const icoBuffer = createIcoFromPngs([
    { width: 16, height: 16, buffer: png16 },
    { width: 32, height: 32, buffer: png32 },
    { width: 48, height: 48, buffer: png48 }
  ]);

  // Generate SVG with embedded base64 of the high-res 512x512 PNG
  const base64Png = png512.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <image href="data:image/png;base64,${base64Png}" x="0" y="0" width="512" height="512" />
</svg>
`;

  // Targets
  const filesToWrite = [
    // Public directory
    { file: path.join(ROOT_DIR, 'public', 'icon-512.png'), data: png512 },
    { file: path.join(ROOT_DIR, 'public', 'icon-192.png'), data: png192 },
    { file: path.join(ROOT_DIR, 'public', 'apple-icon.png'), data: png180 },
    { file: path.join(ROOT_DIR, 'public', 'favicon-48x48.png'), data: png48 },
    { file: path.join(ROOT_DIR, 'public', 'favicon-32x32.png'), data: png32 },
    { file: path.join(ROOT_DIR, 'public', 'favicon.ico'), data: icoBuffer },
    { file: path.join(ROOT_DIR, 'public', 'icon.svg'), data: svgContent },
    { file: path.join(ROOT_DIR, 'public', 'logo.svg'), data: svgContent },
    { file: path.join(ROOT_DIR, 'public', 'images', 'weathergpt-brand-logo.jpg'), data: jpeg512 },

    // Next.js app directory
    { file: path.join(ROOT_DIR, 'src', 'app', 'icon.png'), data: png512 },
    { file: path.join(ROOT_DIR, 'src', 'app', 'apple-icon.png'), data: png180 },
    { file: path.join(ROOT_DIR, 'src', 'app', 'favicon.ico'), data: icoBuffer },
    { file: path.join(ROOT_DIR, 'src', 'app', 'icon.svg'), data: svgContent },
  ];

  for (const item of filesToWrite) {
    fs.mkdirSync(path.dirname(item.file), { recursive: true });
    fs.writeFileSync(item.file, item.data);
    console.log('Updated:', path.relative(ROOT_DIR, item.file));
  }

  console.log('All icons successfully updated!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
