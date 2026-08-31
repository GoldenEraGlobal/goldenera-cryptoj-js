/**
 * Transaction Decoder.
 * Decodes transactions from RLP format matching Java TxDecoder.
 */

import { isSignatureStructurallyValid, recoverAddress } from '../crypto/PrivateKey';
import { networkFromCode, txTypeFromCode, TxVersion, txVersionFromCode } from '../enums';
import type { Tx } from '../tx/Tx';
import type { Hex, Signature } from '../types';
import { hexToBytes, toSignature, ZERO_SIGNATURE } from '../types';
import { hashForSigning, hashTx } from '../utils/TxUtil';
import { decodePayload } from './PayloadCodec';
import {
    assertJavaWei,
    decodeBigint,
    decodeInt,
    decodeLong,
    decodeOptionalAddress,
    decodeOptionalBigint,
    decodeOptionalLong,
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

  if (items.length !== 12 && items.length !== 13) {
    throw new Error(`Invalid transaction field count: ${items.length}`);
  }
  const version = txVersionFromCode(decodeInt(items[0] as Uint8Array));
  const timestamp = decodeLong(items[1] as Uint8Array);
  const type = txTypeFromCode(decodeInt(items[2] as Uint8Array));
  const network = networkFromCode(decodeInt(items[3] as Uint8Array));
  const nonce = decodeOptionalLong(items[4]);
  const recipient = decodeOptionalAddress(items[5] as Uint8Array);
  const tokenAddress = decodeOptionalAddress(items[6] as Uint8Array);
  const amount = decodeOptionalBigint(items[7] as Uint8Array);
  const fee = decodeBigint(items[8] as Uint8Array);
  if (amount !== null) assertJavaWei(amount);
  assertJavaWei(fee);
  const message = decodeOptionalBytes(items[9] as Uint8Array);
  const payload = decodePayload(items[10] as Uint8Array, version);
  const referenceHash = decodeOptionalHash(items[11] as Uint8Array);

  let signature: Signature | null = null;
  let sender = null;
  if (items.length === 13) {
    const sigBytes = items[12] as Uint8Array;
    if (!(sigBytes instanceof Uint8Array) || sigBytes.length !== 65) {
      throw new Error(`Invalid signature length: ${sigBytes?.length ?? 0}`);
    }
    signature = toSignature(sigBytes);
    if (signature !== ZERO_SIGNATURE) {
      if (!isSignatureStructurallyValid(signature)) {
        throw new Error('Signature is structurally invalid');
      }
    }
  }

  // Build partial tx for hash calculation
  const partialTx = {
    version,
    timestamp,
    type,
    network,
    nonce,
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

  if (signature !== null && signature !== ZERO_SIGNATURE) {
    sender = recoverAddress(signingHash, signature);
  }

  // Create full transaction
  const tx: Tx = {
    version,
    timestamp,
    type,
    network,
    nonce,
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
