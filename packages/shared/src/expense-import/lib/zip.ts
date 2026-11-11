/**
 * Just enough ZIP reading to find ONE file inside a .docx — no dependency.
 *
 * Why not a library? fflate's `unzipSync` (CVE-2026-122146, no fixed version) decompresses
 * an entry completely before you can stop it, so a small upload claiming a tiny size could keep
 * the server busy for seconds. Here we only LOCATE the bytes; decompression is done by the
 * caller with a hard output limit (node:zlib `maxOutputLength` on the server).
 *
 * Supports what Word/LibreOffice/Google Docs write: "stored" (0) and "deflate" (8), no ZIP64,
 * no encryption. Anything unusual → null, never a guess.
 */

export interface ZipEntry {
  /** 0 = stored (not compressed), 8 = deflate. */
  method: 0 | 8;
  /** The entry's bytes exactly as stored in the archive (compressed when method = 8). */
  data: Uint8Array;
  /** Size the archive CLAIMS after decompression. Untrusted — only a hint. */
  declaredSize: number;
}

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
/** EOCD record (22 bytes) + the longest possible archive comment. */
const MAX_EOCD_SEARCH = 22 + 0xffff;
const ZIP64_MARKER = 0xffffffff;

export function readZipEntry(bytes: Uint8Array, name: string): ZipEntry | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (at: number) => view.getUint16(at, true);
  const u32 = (at: number) => view.getUint32(at, true);
  const fits = (start: number, length: number) =>
    start >= 0 && length >= 0 && start + length <= bytes.length;

  const eocd = findEndOfCentralDirectory(bytes, u32);
  if (eocd === null) return null;

  const entries = u16(eocd + 10);
  let at = u32(eocd + 16);
  const wanted = new TextEncoder().encode(name);

  for (let i = 0; i < entries; i++) {
    if (!fits(at, 46) || u32(at) !== CENTRAL_DIRECTORY_ENTRY) return null;
    const flags = u16(at + 8);
    const method = u16(at + 10);
    const compressedSize = u32(at + 20);
    const declaredSize = u32(at + 24);
    const nameLength = u16(at + 28);
    const next = at + 46 + nameLength + u16(at + 30) + u16(at + 32);
    const localHeader = u32(at + 42);
    if (!fits(at + 46, nameLength)) return null;

    if (sameBytes(bytes.subarray(at + 46, at + 46 + nameLength), wanted)) {
      const encrypted = (flags & 1) === 1;
      const zip64 = compressedSize === ZIP64_MARKER || declaredSize === ZIP64_MARKER;
      if (encrypted || zip64 || (method !== 0 && method !== 8)) return null;
      if (!fits(localHeader, 30) || u32(localHeader) !== LOCAL_FILE_HEADER) return null;

      const dataStart = localHeader + 30 + u16(localHeader + 26) + u16(localHeader + 28);
      if (!fits(dataStart, compressedSize)) return null;
      return {
        method,
        data: bytes.subarray(dataStart, dataStart + compressedSize),
        declaredSize,
      };
    }
    at = next;
  }
  return null;
}

function findEndOfCentralDirectory(bytes: Uint8Array, u32: (at: number) => number): number | null {
  const lowest = Math.max(0, bytes.length - MAX_EOCD_SEARCH);
  for (let at = bytes.length - 22; at >= lowest; at--) {
    if (u32(at) === END_OF_CENTRAL_DIRECTORY) return at;
  }
  return null;
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
}
