/**
 * Transaction Decoder.
 * Decodes transactions from RLP format matching Java TxDecoder.
 */

import { recoverAddress } from '../crypto/PrivateKey';
import { networkFromCode, txTypeFromCode, TxVersion, txVersionFromCode } from '../enums';
import type { Tx } from '../tx/Tx';
import type { Hex, Signature } from '../types';
import { hexToBytes, toSignature } from '../types';
import { hashForSigning, hashTx } from '../utils/TxUtil';
import { decodePayload } from './PayloadCodec';
import {
    decodeBigint,
    decodeOptionalAddress,
    decodeOptionalBigint,
    decodeOptionalBytes,
    decodeOptionalHash,
    rlpDecode
} from './rlp';

/**
 * Decode RLP bytes to a transaction.
 */
export function decodeTx(rlpBytes: Uint8Array | Hex): Tx {
  const bytes = typeof rlpBytes === 'string' ? hexToBytes(rlpBytes) : rlpBytes;

  if (bytes.length === 0) {
    throw new Error('Cannot decode empty bytes');
  }

  const decoded = rlpDecode(bytes);

  if (!Array.isArray(decoded)) {
    throw new Error('Invalid RLP: Expected list');
  }

  if (decoded.length < 1) {
    throw new Error('Invalid RLP: Missing version field');
  }

  const version = txVersionFromCode(Number(decodeBigint(decoded[0] as Uint8Array)));

  switch (version) {
    case TxVersion.V1:
      return decodeTxV1(decoded as unknown[], bytes);
    default:
      throw new Error(`Unsupported transaction version: ${version}`);
  }
}

/**
 * Decode a V1 transaction.
 */
function decodeTxV1(items: unknown[], originalBytes: Uint8Array): Tx {
  // Extract fields from RLP list
  // [version, timestamp, type, network, nonce, recipient, tokenAddress, amount, fee, message, payload, referenceHash, signature]

  const version = txVersionFromCode(Number(decodeBigint(items[0] as Uint8Array)));
  const timestamp = Number(decodeBigint(items[1] as Uint8Array));
  const type = txTypeFromCode(Number(decodeBigint(items[2] as Uint8Array)));
  const network = networkFromCode(Number(decodeBigint(items[3] as Uint8Array)));
  const nonce = decodeOptionalBigint(items[4] as Uint8Array);
  const recipient = decodeOptionalAddress(items[5] as Uint8Array);
  const tokenAddress = decodeOptionalAddress(items[6] as Uint8Array);
  const amount = decodeOptionalBigint(items[7] as Uint8Array);
  const fee = decodeBigint(items[8] as Uint8Array);
  const message = decodeOptionalBytes(items[9] as Uint8Array);
  const payload = decodePayload(items[10] as Uint8Array, version);
  const referenceHash = decodeOptionalHash(items[11] as Uint8Array);

  // Signature is last item
  const sigBytes = items[12] as Uint8Array;
  if (!sigBytes || sigBytes.length !== 65) {
    throw new Error(`Invalid signature length: ${sigBytes?.length ?? 0}`);
  }
  const signature = toSignature(sigBytes);

  // Build partial tx for hash calculation
  const partialTx = {
    version,
    timestamp,
    type,
    network,
    nonce: nonce ?? 0n,
    recipient,
    tokenAddress,
    amount,
    fee,
    message,
    payload,
    referenceHash,
    signature: null as Signature | null,
  };

  // Calculate hash for signing (without signature)
  const signingHash = hashForSigning(partialTx as any);

  // Recover sender from signature
  const sender = recoverAddress(signingHash, signature);

  // Create full transaction
  const tx: Tx = {
    version,
    timestamp,
    type,
    network,
    nonce: nonce ?? 0n,
    recipient,
    tokenAddress,
    amount,
    fee,
    message,
    payload,
    referenceHash,
    signature,
    sender,
    hash: null as any, // Will be calculated
    size: originalBytes.length,
  };

  // Calculate canonical hash (with signature)
  (tx as any).hash = hashTx(tx);

  return tx;
}

/**
 * TxDecoder singleton for compatibility with Java API.
 */
export const TxDecoder = {
  decode: decodeTx,
};
