/**
 * Transaction utility functions.
 */

import { hash } from '../crypto/PrivateKey';
import { encodeTx } from '../serialization/TxEncoder';
import type { Tx, UnsignedTx } from '../tx/Tx';
import type { Hash } from '../types';

/**
 * Calculate the hash for signing (excludes signature).
 * This is the hash that gets signed by the private key.
 */
export function hashForSigning(tx: Tx | UnsignedTx): Hash {
  const data = encodeTx(tx, false);
  return hash(data);
}

/**
 * Calculate the canonical transaction ID (TxHash).
 * This includes the signature.
 */
export function hashTx(tx: Tx): Hash {
  const data = encodeTx(tx, true);
  return hash(data);
}

/**
 * Calculate the size of a transaction in bytes.
 */
export function sizeTx(tx: Tx): number {
  const data = encodeTx(tx, true);
  return data.length;
}
