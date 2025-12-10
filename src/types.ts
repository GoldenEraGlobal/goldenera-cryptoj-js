/**
 * Core type definitions using branded types for type safety.
 * Uses viem's Address type as base and adds our own branded types.
 */

import type { Address as ViemAddress, Hex as ViemHex } from 'viem';
import { isAddress as viemIsAddress, isHex as viemIsHex } from 'viem';

/**
 * 20-byte Ethereum-style address (0x-prefixed, 42 chars).
 * Uses viem's Address type for compatibility.
 */
export type Address = ViemAddress;

/**
 * 32-byte Keccak-256 hash (0x-prefixed, 66 chars).
 */
export type Hash = `0x${string}` & { readonly __brand: 'Hash' };

/**
 * 65-byte ECDSA signature (0x-prefixed, 132 chars).
 * Format: [32 bytes R][32 bytes S][1 byte V]
 */
export type Signature = `0x${string}` & { readonly __brand: 'Signature' };

/**
 * Generic hex string (0x-prefixed).
 */
export type Hex = ViemHex;

// ============================================
// Constants
// ============================================

export const ADDRESS_SIZE = 20;
export const HASH_SIZE = 32;
export const SIGNATURE_SIZE = 65;

export const ZERO_ADDRESS: Address = '0x0000000000000000000000000000000000000000' as Address;
export const ZERO_HASH: Hash = '0x0000000000000000000000000000000000000000000000000000000000000000' as Hash;
export const NATIVE_TOKEN: Address = ZERO_ADDRESS;

// ============================================
// Type Guards
// ============================================

/**
 * Check if a string is a valid address (42 chars, 0x prefix).
 */
export function isAddress(value: unknown): value is Address {
  if (typeof value !== 'string') return false;
  return viemIsAddress(value);
}

/**
 * Check if a string is a valid 32-byte hash (66 chars, 0x prefix).
 */
export function isHash(value: unknown): value is Hash {
  if (typeof value !== 'string') return false;
  if (!value.startsWith('0x')) return false;
  if (value.length !== 66) return false;
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

/**
 * Check if a string is a valid 65-byte signature (132 chars, 0x prefix).
 */
export function isSignature(value: unknown): value is Signature {
  if (typeof value !== 'string') return false;
  if (!value.startsWith('0x')) return false;
  if (value.length !== 132) return false;
  return /^0x[0-9a-fA-F]{130}$/.test(value);
}

/**
 * Check if a string is a valid hex string.
 */
export function isHex(value: unknown): value is Hex {
  if (typeof value !== 'string') return false;
  return viemIsHex(value);
}

// ============================================
// Conversion Utilities
// ============================================

/**
 * Convert a hex string to Uint8Array.
 */
export function hexToBytes(hex: Hex): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string.
 */
export function bytesToHex(bytes: Uint8Array): Hex {
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}` as Hex;
}

/**
 * Pad a hex value to a specific byte length (left-padded with zeros).
 */
export function padHex(hex: Hex, byteLength: number): Hex {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return `0x${cleanHex.padStart(byteLength * 2, '0')}` as Hex;
}

/**
 * Convert BigInt to hex with optional padding.
 */
export function bigintToHex(value: bigint, byteLength?: number): Hex {
  let hex = value.toString(16);
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }
  if (byteLength !== undefined) {
    hex = hex.padStart(byteLength * 2, '0');
  }
  return `0x${hex}` as Hex;
}

/**
 * Convert hex to BigInt.
 */
export function hexToBigint(hex: Hex): bigint {
  return BigInt(hex);
}

/**
 * Create an Address from bytes or hex string.
 */
export function toAddress(value: Uint8Array | Hex): Address {
  if (value instanceof Uint8Array) {
    if (value.length !== ADDRESS_SIZE) {
      throw new Error(`Address must be ${ADDRESS_SIZE} bytes, got ${value.length}`);
    }
    return bytesToHex(value) as Address;
  }
  const bytes = hexToBytes(value);
  if (bytes.length !== ADDRESS_SIZE) {
    throw new Error(`Address must be ${ADDRESS_SIZE} bytes, got ${bytes.length}`);
  }
  return value.toLowerCase() as Address;
}

/**
 * Create a Hash from bytes or hex string.
 */
export function toHash(value: Uint8Array | Hex): Hash {
  if (value instanceof Uint8Array) {
    if (value.length !== HASH_SIZE) {
      throw new Error(`Hash must be ${HASH_SIZE} bytes, got ${value.length}`);
    }
    return bytesToHex(value) as Hash;
  }
  const bytes = hexToBytes(value);
  if (bytes.length !== HASH_SIZE) {
    throw new Error(`Hash must be ${HASH_SIZE} bytes, got ${bytes.length}`);
  }
  return value.toLowerCase() as Hash;
}

/**
 * Create a Signature from bytes or hex string.
 */
export function toSignature(value: Uint8Array | Hex): Signature {
  if (value instanceof Uint8Array) {
    if (value.length !== SIGNATURE_SIZE) {
      throw new Error(`Signature must be ${SIGNATURE_SIZE} bytes, got ${value.length}`);
    }
    return bytesToHex(value) as Signature;
  }
  const bytes = hexToBytes(value);
  if (bytes.length !== SIGNATURE_SIZE) {
    throw new Error(`Signature must be ${SIGNATURE_SIZE} bytes, got ${bytes.length}`);
  }
  return value.toLowerCase() as Signature;
}
