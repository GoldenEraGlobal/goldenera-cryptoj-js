/**
 * Transaction interface and types.
 */

import type { Network, TxType, TxVersion } from '../enums';
import type { Address, Hash, Hex, Signature } from '../types';
import type { TxPayload } from './payloads/TxPayload';

/**
 * Complete transaction interface with all fields.
 */
export interface Tx {
  // --- RLP DATA (Stored on Disk/Network) ---

  /** Transaction format version */
  readonly version: TxVersion;

  /** Transaction timestamp in milliseconds */
  readonly timestamp: number;

  /** Transaction type (TRANSFER, BIP_CREATE, BIP_VOTE) */
  readonly type: TxType;

  /** Target network */
  readonly network: Network;

  /** Account nonce (sequence number) */
  readonly nonce: bigint;

  /** Recipient address (for TRANSFER) */
  readonly recipient: Address | null;

  /** Token address (NATIVE_TOKEN for native transfers, null for BIP transactions) */
  readonly tokenAddress: Address | null;

  /** Amount to transfer in wei */
  readonly amount: bigint | null;

  /** Transaction fee in wei */
  readonly fee: bigint;

  /** Optional message data */
  readonly message: Uint8Array | null;

  /** BIP payload (for BIP_CREATE, BIP_VOTE) */
  readonly payload: TxPayload | null;

  /** Reference to another transaction (for BIP_VOTE) */
  readonly referenceHash: Hash | null;

  /** ECDSA signature */
  readonly signature: Signature;

  // --- CALCULATED / CACHED DATA ---

  /** Sender address (recovered from signature) */
  readonly sender: Address;

  /** Transaction hash (Keccak-256 of RLP data) */
  readonly hash: Hash;

  /** RLP size in bytes */
  readonly size: number;
}

/**
 * Input for building a transaction (before signing).
 * Optional fields have sensible defaults.
 */
export interface TxInput {
  /** Transaction type (required) */
  type: TxType;

  /** Target network (required) */
  network: Network;

  /** Account nonce (required) */
  nonce: bigint;

  /** Transaction fee in wei (default: 0) */
  fee?: bigint;

  /** Transaction version (default: V1) */
  version?: TxVersion;

  /** Timestamp in ms (default: Date.now()) */
  timestamp?: number;

  /** Recipient address (required for TRANSFER) */
  recipient?: Address | null;

  /** Token address (NATIVE_TOKEN = 0x00 for native token, default: NATIVE_TOKEN) */
  tokenAddress?: Address;

  /** Amount to transfer in wei */
  amount?: bigint | null;

  /** Optional message data */
  message?: Uint8Array | Hex | string | null;

  /** BIP payload */
  payload?: TxPayload | null;

  /** Reference hash */
  referenceHash?: Hash | null;
}

/**
 * Unsigned transaction (all fields except signature).
 */
export interface UnsignedTx extends Omit<Tx, 'signature' | 'sender' | 'hash' | 'size'> {
  readonly signature: null;
}
