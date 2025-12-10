/**
 * Secure 32-byte wrapper for secp256k1 private key.
 * Handles key generation, mnemonic derivation, signing, and address derivation.
 */

import { secp256k1 } from '@noble/curves/secp256k1';
import { HDKey } from '@scure/bip32';
import { generateMnemonic as bip39GenerateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { keccak256 } from 'viem';

import type { Address, Hash, Hex, Signature } from '../types';
import { bytesToHex, hexToBytes, toAddress, toHash, toSignature } from '../types';

// secp256k1 curve order
const CURVE_N = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
const HALF_CURVE_ORDER = CURVE_N >> 1n;

// Standard BIP-44 derivation path for Ethereum/GoldenEra: m/44'/60'/0'/0/index
const BIP44_PATH = "m/44'/60'/0'/0";

export class PrivateKey {
  private readonly bytes: Uint8Array;

  private constructor(bytes: Uint8Array) {
    if (bytes.length !== 32) {
      throw new Error(`Private key must be exactly 32 bytes, got ${bytes.length}`);
    }

    // Validate key is in valid secp256k1 range (0 < key < N)
    const d = BigInt(bytesToHex(bytes));
    if (d <= 0n || d >= CURVE_N) {
      throw new Error('Private key value out of valid secp256k1 range');
    }

    this.bytes = bytes;
  }

  // ============================================
  // Factory Methods
  // ============================================

  /**
   * Wrap a 32-byte array or hex string into a PrivateKey.
   */
  static wrap(value: Uint8Array | Hex): PrivateKey {
    if (typeof value === 'string') {
      return new PrivateKey(hexToBytes(value));
    }
    return new PrivateKey(new Uint8Array(value));
  }

  /**
   * Create a new random private key.
   */
  static create(): PrivateKey {
    const privateKeyBytes = secp256k1.utils.randomPrivateKey();
    return new PrivateKey(privateKeyBytes);
  }

  /**
   * Generate a new 12-word mnemonic phrase.
   */
  static generateMnemonic(): string {
    return bip39GenerateMnemonic(wordlist, 128); // 128 bits = 12 words
  }

  /**
   * Generate a 24-word mnemonic phrase.
   */
  static generateMnemonic24(): string {
    return bip39GenerateMnemonic(wordlist, 256); // 256 bits = 24 words
  }

  /**
   * Validate a mnemonic phrase.
   */
  static isValidMnemonic(mnemonic: string): boolean {
    return validateMnemonic(mnemonic, wordlist);
  }

  /**
   * Derive a private key from a mnemonic phrase.
   *
   * @param mnemonic - 12 or 24 word mnemonic phrase
   * @param password - Optional passphrase (default: empty string)
   * @param accountIndex - Account index (default: 0)
   * @returns PrivateKey for the derived account
   */
  static fromMnemonic(mnemonic: string, password = '', accountIndex = 0): PrivateKey {
    if (!validateMnemonic(mnemonic, wordlist)) {
      throw new Error('Invalid mnemonic phrase');
    }

    // Generate seed from mnemonic
    const seed = mnemonicToSeedSync(mnemonic, password);

    // Derive master key
    const masterKey = HDKey.fromMasterSeed(seed);

    // Derive path: m/44'/60'/0'/0/{accountIndex}
    const derivedKey = masterKey.derive(`${BIP44_PATH}/${accountIndex}`);

    if (!derivedKey.privateKey) {
      throw new Error('Failed to derive private key');
    }

    return new PrivateKey(derivedKey.privateKey);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get the raw bytes of the private key.
   */
  toBytes(): Uint8Array {
    return new Uint8Array(this.bytes);
  }

  /**
   * Get the hex representation.
   */
  toHex(): Hex {
    return bytesToHex(this.bytes);
  }

  /**
   * Get the corresponding public key (uncompressed, 64 bytes without 04 prefix).
   */
  getPublicKey(): Uint8Array {
    const point = secp256k1.getPublicKey(this.bytes, false); // false = uncompressed
    return point.slice(1); // Remove 0x04 prefix, return 64 bytes
  }

  /**
   * Get the compressed public key (33 bytes).
   */
  getPublicKeyCompressed(): Uint8Array {
    return secp256k1.getPublicKey(this.bytes, true);
  }

  /**
   * Calculate the corresponding 20-byte address from the public key.
   * Uses Keccak-256 hash of the public key, taking last 20 bytes.
   */
  getAddress(): Address {
    const publicKey = this.getPublicKey();
    const hash = keccak256(publicKey);
    // Take last 20 bytes (40 hex chars) from the hash
    const addressHex = `0x${hash.slice(-40)}` as Hex;
    return toAddress(addressHex);
  }

  /**
   * Sign a 32-byte hash and return a 65-byte signature (r, s, v).
   *
   * @param messageHash - 32-byte hash to sign
   * @returns 65-byte signature
   */
  sign(messageHash: Hash): Signature {
    const hashBytes = hexToBytes(messageHash);

    // Sign the message
    const sig = secp256k1.sign(hashBytes, this.bytes, {
      lowS: true, // Force low-S for Ethereum compatibility
    });

    // Get r and s as 32-byte arrays
    const r = sig.r;
    const s = sig.s;

    // Ensure low-S (Ethereum requirement)
    const finalS = s > HALF_CURVE_ORDER ? CURVE_N - s : s;

    // Calculate recovery id (v = 27 or 28)
    // The recovery ID helps recover the public key from the signature
    const recoveryId = sig.recovery;
    const v = recoveryId + 27;

    // Construct 65-byte signature: r (32) + s (32) + v (1)
    const signatureBytes = new Uint8Array(65);

    // r - pad to 32 bytes
    const rHex = r.toString(16).padStart(64, '0');
    const rBytes = hexToBytes(`0x${rHex}`);
    signatureBytes.set(rBytes, 0);

    // s - pad to 32 bytes
    const sHex = finalS.toString(16).padStart(64, '0');
    const sBytes = hexToBytes(`0x${sHex}`);
    signatureBytes.set(sBytes, 32);

    // v
    signatureBytes[64] = v;

    return toSignature(signatureBytes);
  }

  // ============================================
  // Comparison
  // ============================================

  equals(other: PrivateKey): boolean {
    if (this.bytes.length !== other.bytes.length) return false;
    for (let i = 0; i < this.bytes.length; i++) {
      if (this.bytes[i] !== other.bytes[i]) return false;
    }
    return true;
  }
}

// ============================================
// Signature Recovery
// ============================================

/**
 * Recover the address that signed a message hash.
 *
 * @param messageHash - 32-byte hash that was signed
 * @param signature - 65-byte signature (r, s, v)
 * @returns Recovered address
 */
export function recoverAddress(messageHash: Hash, signature: Signature): Address {
  const hashBytes = hexToBytes(messageHash);
  const sigBytes = hexToBytes(signature);

  if (sigBytes.length !== 65) {
    throw new Error(`Signature must be 65 bytes, got ${sigBytes.length}`);
  }

  // Extract r, s, v from signature
  const r = BigInt(bytesToHex(sigBytes.slice(0, 32)));
  const s = BigInt(bytesToHex(sigBytes.slice(32, 64)));
  const v = sigBytes[64]!;

  // Recovery ID is v - 27
  const recoveryId = v - 27;
  if (recoveryId !== 0 && recoveryId !== 1) {
    throw new Error(`Invalid recovery id: ${recoveryId} (v=${v})`);
  }

  // Create signature object
  const sig = new secp256k1.Signature(r, s).addRecoveryBit(recoveryId);

  // Recover public key
  const publicKey = sig.recoverPublicKey(hashBytes).toRawBytes(false).slice(1);

  // Hash public key to get address
  const hash = keccak256(publicKey);
  const addressHex = `0x${hash.slice(-40)}` as Hex;
  return toAddress(addressHex);
}

/**
 * Validate a signature against a message hash and expected address.
 */
export function validateSignature(messageHash: Hash, signature: Signature, expectedAddress: Address): boolean {
  try {
    const recovered = recoverAddress(messageHash, signature);
    return recovered.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Check if a signature is structurally valid (v, r, s in valid ranges).
 */
export function isSignatureStructurallyValid(signature: Signature): boolean {
  try {
    const sigBytes = hexToBytes(signature);
    if (sigBytes.length !== 65) return false;

    const v = sigBytes[64]!;
    if (v !== 27 && v !== 28) return false;

    const r = BigInt(bytesToHex(sigBytes.slice(0, 32)));
    const s = BigInt(bytesToHex(sigBytes.slice(32, 64)));

    if (r <= 0n || r >= CURVE_N) return false;
    if (s <= 0n || s >= CURVE_N) return false;

    // Low-S check (Ethereum requirement)
    if (s > HALF_CURVE_ORDER) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Compute Keccak-256 hash of data.
 */
export function hash(data: Uint8Array | Hex): Hash {
  if (typeof data === 'string') {
    return toHash(keccak256(hexToBytes(data)));
  }
  return toHash(keccak256(data));
}
