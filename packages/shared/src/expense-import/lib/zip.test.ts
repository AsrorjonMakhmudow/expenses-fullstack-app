import { describe, expect, it } from 'vitest';
import { makeZip } from './testing/make-zip.js';
import { readZipEntry } from './zip.js';

const text = (bytes: Uint8Array | undefined) => new TextDecoder().decode(bytes);

describe('readZipEntry', () => {
  const zip = makeZip([
    { name: 'a.txt', data: 'first' },
    { name: 'word/document.xml', data: '<w:document/>' },
  ]);

  it('finds an entry by name and returns its bytes without copying the archive', () => {
    const entry = readZipEntry(zip, 'word/document.xml');
    expect(entry).toMatchObject({ method: 0, declaredSize: 13 });
    expect(text(entry?.data)).toBe('<w:document/>');
  });

  it('returns null for a missing entry, non-ZIP bytes, empty or truncated input', () => {
    expect(readZipEntry(zip, 'missing.xml')).toBeNull();
    expect(readZipEntry(new TextEncoder().encode('hello'), 'a.txt')).toBeNull();
    expect(readZipEntry(new Uint8Array(0), 'a.txt')).toBeNull();
    expect(readZipEntry(zip.subarray(0, zip.length - 30), 'word/document.xml')).toBeNull();
  });

  it('reports the declared size as-is (untrusted) — limits are the decompressor’s job', () => {
    const lying = makeZip([{ name: 'x', data: 'abc', method: 8, declaredSize: 1 }]);
    expect(readZipEntry(lying, 'x')).toMatchObject({ method: 8, declaredSize: 1 });
  });

  it('refuses encrypted, ZIP64 and unknown-method entries', () => {
    const encrypted = makeZip([{ name: 'x', data: 'abc' }]);
    const centralStart = encrypted.length - 22 - (46 + 1);
    new DataView(encrypted.buffer).setUint16(centralStart + 8, 1, true); // "encrypted" flag
    expect(readZipEntry(encrypted, 'x')).toBeNull();

    expect(
      readZipEntry(makeZip([{ name: 'x', data: 'a', declaredSize: 0xffffffff }]), 'x'),
    ).toBeNull();

    const bzip2 = makeZip([{ name: 'x', data: 'abc' }]);
    new DataView(bzip2.buffer).setUint16(bzip2.length - 22 - 47 + 10, 12, true);
    expect(readZipEntry(bzip2, 'x')).toBeNull();
  });

  it('refuses an entry whose data would run past the end of the file', () => {
    const zip2 = makeZip([{ name: 'x', data: 'abc' }]);
    new DataView(zip2.buffer).setUint32(zip2.length - 22 - 47 + 20, 10_000, true);
    expect(readZipEntry(zip2, 'x')).toBeNull();
  });
});
