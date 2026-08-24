#!/usr/bin/env node
/**
 * build-character-card.mjs — Generate a Marinara/SillyTavern V2 character
 * card PNG from a source JSON file. The PNG embeds the JSON as a
 * base64-encoded tEXt chunk with keyword "chara", which Marinara's
 * png-parser.ts recognizes alongside the "ccv3" V3 spec.
 *
 * Usage:
 *   node tools/build-character-card.mjs characters/<Name>.json [characters/<Name>.png]
 *
 * If no output path is given, writes to <input>.png alongside the JSON.
 *
 * Image: a 320x180 solid dark-purple banner. Replace the avatar in
 * Marinara's character editor after import for a system-specific look.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { deflateSync } from "node:zlib";

/* ─── CRC32 (PNG) ─── */
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function be32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0, 0); return b; }

function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = be32(data.length);
  const crc = be32(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function buildPlaceholderPng(width, height, rgb) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  /* IHDR: width(4) height(4) bitDepth(1)=8 colorType(1)=2(RGB) compression(1)=0 filter(1)=0 interlace(1)=0 */
  const ihdr = Buffer.concat([
    be32(width), be32(height),
    Buffer.from([8, 2, 0, 0, 0])
  ]);

  /* IDAT: each scanline prefixed with filter byte 0 (None), then 3 bytes per pixel */
  const rowLen = width * 3 + 1;
  const raw = Buffer.alloc(rowLen * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowLen] = 0;  // filter type: None
    for (let x = 0; x < width; x++) {
      const off = y * rowLen + 1 + x * 3;
      raw[off]     = rgb[0];
      raw[off + 1] = rgb[1];
      raw[off + 2] = rgb[2];
    }
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function embedCharaChunk(pngBuf, json) {
  const base64 = Buffer.from(JSON.stringify(json), "utf8").toString("base64");
  const text = Buffer.concat([Buffer.from("chara", "latin1"), Buffer.from([0]), Buffer.from(base64, "latin1")]);
  const tEXt = chunk("tEXt", text);

  /* PNG sig (8) + chunks. IEND must be last. Insert tEXt before IEND. */
  const iendStart = pngBuf.length - 12;  // IEND chunk is exactly 12 bytes
  /* Sanity-check we found IEND */
  const iendType = pngBuf.slice(iendStart + 4, iendStart + 8).toString("ascii");
  if (iendType !== "IEND") throw new Error("IEND not at expected offset (got " + iendType + ")");

  return Buffer.concat([
    pngBuf.slice(0, iendStart),
    tEXt,
    pngBuf.slice(iendStart)
  ]);
}

/* ─── round-trip verification ─── */
function extractCharaFromPng(pngBuf) {
  let off = 8;
  while (off < pngBuf.length) {
    const len = pngBuf.readUInt32BE(off); off += 4;
    const type = pngBuf.slice(off, off + 4).toString("ascii"); off += 4;
    const data = pngBuf.slice(off, off + len); off += len + 4;  // +4 for CRC
    if (type === "tEXt") {
      const nul = data.indexOf(0);
      if (nul > 0 && data.slice(0, nul).toString("latin1") === "chara") {
        const b64 = data.slice(nul + 1).toString("latin1");
        return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
      }
    }
    if (type === "IEND") break;
  }
  return null;
}

/* ─── main ─── */
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: node tools/build-character-card.mjs <input.json> [output.png]");
  process.exit(2);
}
const inJson = args[0];
const outPng = args[1] || inJson.replace(/\.json$/i, ".png");

const json = JSON.parse(readFileSync(inJson, "utf8"));
const name = (json.data && json.data.name) || "Unnamed";

/* Dark purple banner — colors picked to match the extension's accent palette
   (--mrr-bg: rgba(20,16,28), --mrr-accent: #d4a8ff). RGB 26,15,42. */
const placeholder = buildPlaceholderPng(320, 180, [26, 15, 42]);
const finalPng = embedCharaChunk(placeholder, json);

/* Verify round-trip */
const recovered = extractCharaFromPng(finalPng);
if (!recovered || JSON.stringify(recovered) !== JSON.stringify(json)) {
  console.error("FAIL: round-trip verification failed for " + outPng);
  process.exit(1);
}

writeFileSync(outPng, finalPng);
console.log("PASS " + name + " -> " + outPng + " (" + finalPng.length + " bytes; embedded " + (recovered.data ? Object.keys(recovered.data).length : 0) + " card fields)");
