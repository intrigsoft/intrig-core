import {typescript} from "common";
import path from "path";

export function typeUtilsTemplate(_path: string) {
  const ts = typescript(path.resolve(_path, 'src', 'type-utils.ts'))

  return ts`import { z } from 'zod';

export type BinaryData = Blob | ArrayBuffer | Uint8Array;

export const BinaryDataSchema = z.union([
  // Blob in browsers
  z.instanceof(Blob).optional(), // optional here so union below still validates if Blob is absent in Node
  // Raw buffers
  z.instanceof(ArrayBuffer),
  z.custom<Uint8Array>((v) => v instanceof Uint8Array, { message: 'Expected Uint8Array' }),
]).transform((v) => {
  // Normalize to Blob if possible (nice for downloads in browser)
  if (typeof Blob !== 'undefined') {
    if (v instanceof Blob) return v;
    if (v instanceof ArrayBuffer) return new Blob([v]);
    if (v instanceof Uint8Array) return new Blob([v.buffer]);
  }
  return v;
});

// Base64 helpers (browser + Node compatible; no Buffer required)
export function base64ToUint8Array(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    // Browser
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } else {
    // Node
    const buf = Buffer.from(b64, 'base64');
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
}

  `
}