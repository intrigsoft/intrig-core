import {typescript} from "@intrig/plugin-sdk";
import path from "path";

export function typeUtilsTemplate() {
  const ts = typescript(path.resolve('src', 'type-utils.ts'))

  return ts`import { z } from 'zod';

export type BinaryData = Blob;
export const BinaryDataSchema: z.ZodType<BinaryData> = z.instanceof(Blob);

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