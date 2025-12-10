/**
 * RLP encoding/decoding utilities.
 * Matches Java Besu-style RLP implementation with optional list wrapping.
 *
 * Important: Optional values are wrapped in a list:
 * - null -> empty list (0xc0)
 * - value -> [value] (list with one element)
 */

import RLP from 'rlp';
import type { Address, Hash } from '../types';
import { bytesToHex, hexToBytes, toAddress, toHash } from '../types';

// ============================================
// Low-level RLP encoding
// ============================================

// RLP types (the library doesn't export them properly)
type RLPInput = Uint8Array | Uint8Array[] | RLPInput[];
type RLPDecoded = Uint8Array | RLPDecoded[];

/**
 * Encode a value to RLP bytes.
 */
export function rlpEncode(input: RLPInput): Uint8Array {
  return RLP.encode(input as any);
}

/**
 * Decode RLP bytes.
 */
export function rlpDecode(input: Uint8Array): RLPDecoded {
  return RLP.decode(input) as RLPDecoded;
}

/**
 * Encode an integer as minimal bytes (no leading zeros).
 * This is the "scalar" encoding in RLP.
 */
export function encodeScalar(value: bigint | number): Uint8Array {
  const v = BigInt(value);
  if (v === 0n) {
    return new Uint8Array(0); // Empty bytes for zero
  }
  let hex = v.toString(16);
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }
  return hexToBytes(`0x${hex}`);
}

/**
 * Decode minimal bytes to bigint.
 */
export function decodeScalar(bytes: Uint8Array): bigint {
  if (bytes.length === 0) return 0n;
  return BigInt(bytesToHex(bytes));
}

/**
 * Decode minimal bytes to number.
 */
export function decodeInt(bytes: Uint8Array): number {
  return Number(decodeScalar(bytes));
}

// ============================================
// RLP element types for tracking
// ============================================

interface RLPElement {
  type: 'bytes' | 'raw' | 'list';
  data: Uint8Array | RLPElement[];
}

// ============================================
// High-level RLP Encoder (matching Java style)
// ============================================

/**
 * RLP Output builder that matches Java BytesValueRLPOutput.
 */
export class RLPWriter {
  private elements: RLPElement[] = [];

  /** Write raw bytes as an RLP element (will be encoded as RLP string) */
  writeBytes(value: Uint8Array): void {
    this.elements.push({ type: 'bytes', data: value });
  }

  /** Write a scalar (integer with minimal encoding) */
  writeScalar(value: bigint | number): void {
    this.elements.push({ type: 'bytes', data: encodeScalar(value) });
  }

  /** Write a long scalar (same as writeScalar for bigint) */
  writeLongScalar(value: bigint | number): void {
    this.writeScalar(value);
  }

  /** Write an int scalar */
  writeIntScalar(value: number): void {
    this.writeScalar(value);
  }

  /** Write already-encoded RLP data directly (will NOT be re-encoded) */
  writeRaw(rlpBytes: Uint8Array): void {
    this.elements.push({ type: 'raw', data: rlpBytes });
  }

  /** Write an empty list directly */
  writeEmptyList(): void {
    this.elements.push({ type: 'raw', data: new Uint8Array([0xc0]) });
  }

  /** Start a new nested list */
  writeList(builder: (writer: RLPWriter) => void): void {
    const subwriter = new RLPWriter();
    builder(subwriter);
    this.elements.push({ type: 'list', data: subwriter.elements });
  }

  // ============================================
  // Optional Writers (wrap in list or empty list)
  // ============================================

  /** Write optional bytes - wraps in list if present */
  writeOptionalBytes(value: Uint8Array | null): void {
    if (value === null) {
      this.writeEmptyList();
    } else {
      this.writeList((w) => w.writeBytes(value));
    }
  }

  /** Write optional scalar - wraps in list if present */
  writeOptionalLongScalar(value: bigint | number | null): void {
    if (value === null) {
      this.writeEmptyList();
    } else {
      this.writeList((w) => w.writeLongScalar(value));
    }
  }

  /** Write optional Wei scalar - wraps in list if present */
  writeOptionalWeiScalar(value: bigint | null): void {
    if (value === null) {
      this.writeEmptyList();
    } else {
      this.writeList((w) => w.writeBigIntegerScalar(value));
    }
  }

  /** Write Wei as BigInteger scalar */
  writeWeiScalar(value: bigint): void {
    this.writeBigIntegerScalar(value);
  }

  /** Write BigInteger scalar (same as regular scalar for positive values) */
  writeBigIntegerScalar(value: bigint): void {
    this.writeScalar(value);
  }

  /** Write optional raw RLP - wraps in list if present */
  writeOptionalRaw(value: Uint8Array | null): void {
    if (value === null) {
      this.writeEmptyList();
    } else {
      this.writeList((w) => w.writeRaw(value));
    }
  }

  /** Write optional bytes32 - wraps in list if present */
  writeOptionalBytes32(value: Uint8Array | Hash | null): void {
    if (value === null) {
      this.writeEmptyList();
    } else {
      const bytes = typeof value === 'string' ? hexToBytes(value) : value;
      this.writeList((w) => w.writeBytes(bytes));
    }
  }

  // ============================================
  // Legacy methods for compat
  // ============================================

  /** Start a sublist - returns a nested writer (legacy) */
  startList(): RLPWriter {
    return new RLPWriter();
  }

  /** Add a completed sublist (legacy) */
  addList(sublist: RLPWriter): void {
    this.elements.push({ type: 'list', data: sublist.elements });
  }

  /**
   * Encode all elements to RLP bytes.
   */
  encode(): Uint8Array {
    return this.encodeElements(this.elements);
  }

  private encodeElements(elements: RLPElement[]): Uint8Array {
    // First, encode all elements to get their bytes
    const encodedParts: Uint8Array[] = [];

    for (const elem of elements) {
      if (elem.type === 'bytes') {
        // Encode as RLP string
        encodedParts.push(this.encodeString(elem.data as Uint8Array));
      } else if (elem.type === 'raw') {
        // Already encoded, just add directly
        encodedParts.push(elem.data as Uint8Array);
      } else if (elem.type === 'list') {
        // Recursively encode the list
        const listContent = this.encodeElements(elem.data as RLPElement[]);
        // listContent is already a list, so just add it
        encodedParts.push(listContent);
      }
    }

    // Calculate total payload size
    let payloadSize = 0;
    for (const part of encodedParts) {
      payloadSize += part.length;
    }

    // Create list header + payload
    const header = this.encodeListHeader(payloadSize);
    const result = new Uint8Array(header.length + payloadSize);
    result.set(header, 0);

    let offset = header.length;
    for (const part of encodedParts) {
      result.set(part, offset);
      offset += part.length;
    }

    return result;
  }

  /**
   * Encode a byte string to RLP.
   */
  private encodeString(bytes: Uint8Array): Uint8Array {
    if (bytes.length === 0) {
      // Empty string -> 0x80
      return new Uint8Array([0x80]);
    }
    if (bytes.length === 1 && bytes[0]! < 0x80) {
      // Single byte < 0x80 is its own encoding
      return bytes;
    }
    if (bytes.length <= 55) {
      // Short string: 0x80 + length, then data
      const result = new Uint8Array(1 + bytes.length);
      result[0] = 0x80 + bytes.length;
      result.set(bytes, 1);
      return result;
    }
    // Long string: 0xb7 + length of length, length bytes, then data
    const lengthBytes = this.encodeLengthBytes(bytes.length);
    const result = new Uint8Array(1 + lengthBytes.length + bytes.length);
    result[0] = 0xb7 + lengthBytes.length;
    result.set(lengthBytes, 1);
    result.set(bytes, 1 + lengthBytes.length);
    return result;
  }

  /**
   * Encode a list header (just the prefix bytes).
   */
  private encodeListHeader(payloadSize: number): Uint8Array {
    if (payloadSize <= 55) {
      return new Uint8Array([0xc0 + payloadSize]);
    }
    const lengthBytes = this.encodeLengthBytes(payloadSize);
    const result = new Uint8Array(1 + lengthBytes.length);
    result[0] = 0xf7 + lengthBytes.length;
    result.set(lengthBytes, 1);
    return result;
  }

  /**
   * Encode a length as bytes (big-endian, no leading zeros).
   */
  private encodeLengthBytes(length: number): Uint8Array {
    if (length < 256) {
      return new Uint8Array([length]);
    }
    if (length < 65536) {
      return new Uint8Array([length >> 8, length & 0xff]);
    }
    if (length < 16777216) {
      return new Uint8Array([length >> 16, (length >> 8) & 0xff, length & 0xff]);
    }
    return new Uint8Array([
      length >> 24,
      (length >> 16) & 0xff,
      (length >> 8) & 0xff,
      length & 0xff,
    ]);
  }
}

// ============================================
// Decoding Helpers  
// ============================================

export function decodeAddress(bytes: Uint8Array): Address {
  if (bytes.length !== 20) {
    throw new Error(`Invalid address length: ${bytes.length}, expected 20`);
  }
  return toAddress(bytes);
}

export function decodeHash(bytes: Uint8Array): Hash {
  if (bytes.length !== 32) {
    throw new Error(`Invalid hash length: ${bytes.length}, expected 32`);
  }
  return toHash(bytes);
}

export function decodeString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function decodeBool(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;
  return bytes[0] !== 0;
}

export function decodeBigint(bytes: Uint8Array): bigint {
  return decodeScalar(bytes);
}

// ============================================
// Optional Decoders (unwrap from list)
// ============================================

function isEmptyList(item: unknown): boolean {
  if (Array.isArray(item) && item.length === 0) return true;
  if (item instanceof Uint8Array && item.length === 0) return true;
  return false;
}

export function decodeOptionalBytes(item: unknown): Uint8Array | null {
  if (isEmptyList(item)) return null;
  if (Array.isArray(item) && item.length === 1) {
    return item[0] as Uint8Array;
  }
  if (item instanceof Uint8Array) {
    return item.length === 0 ? null : item;
  }
  return null;
}

export function decodeOptionalAddress(item: unknown): Address | null {
  const bytes = decodeOptionalBytes(item);
  if (bytes === null || bytes.length === 0) return null;
  return decodeAddress(bytes);
}

export function decodeOptionalHash(item: unknown): Hash | null {
  const bytes = decodeOptionalBytes(item);
  if (bytes === null || bytes.length === 0) return null;
  return decodeHash(bytes);
}

export function decodeOptionalBigint(item: unknown): bigint | null {
  if (isEmptyList(item)) return null;
  if (Array.isArray(item) && item.length === 1) {
    return decodeScalar(item[0] as Uint8Array);
  }
  if (item instanceof Uint8Array) {
    return item.length === 0 ? null : decodeScalar(item);
  }
  return null;
}

export function decodeOptionalString(item: unknown): string | null {
  const bytes = decodeOptionalBytes(item);
  if (bytes === null || bytes.length === 0) return null;
  return decodeString(bytes);
}

export function decodeOptionalRaw(item: unknown): Uint8Array | null {
  if (isEmptyList(item)) return null;
  if (Array.isArray(item) && item.length >= 1) {
    return rlpEncode(item);
  }
  return null;
}

// ============================================
// Helper exports (used by PayloadCodec)
// ============================================

/** Empty RLP list encoding (0xc0) */
export const EMPTY_LIST = new Uint8Array([0xc0]);

/** Encode a string to UTF-8 bytes */
export function encodeString(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/** Encode a boolean to single byte */
export function encodeBool(value: boolean): Uint8Array {
  return value ? new Uint8Array([1]) : new Uint8Array([0]);
}
