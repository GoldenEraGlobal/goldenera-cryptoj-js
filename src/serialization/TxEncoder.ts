/**
 * Transaction Encoder.
 * Encodes transactions to RLP format matching Java TxEncoder.
 *
 * The encoding format for V1 transactions:
 * [version, timestamp, type, network, nonce?, recipient?, tokenAddress?, amount?, fee, message?, payload?, referenceHash?, signature?]
 *
 * Optional fields are wrapped in lists:
 * - null -> [] (empty list, 0xc0)
 * - value -> [value] (list containing the value)
 */

import { TxVersion } from '../enums';
import type { Tx, UnsignedTx } from '../tx/Tx';
import type { Address, Signature } from '../types';
import { hexToBytes } from '../types';
import { encodePayload } from './PayloadCodec';
import {
    RLPWriter
} from './rlp';

/**
 * Encode a transaction to RLP bytes.
 *
 * @param tx - Transaction to encode
 * @param includeSignature - Whether to include the signature (false for signing hash)
 * @returns RLP-encoded bytes
 */
export function encodeTx(tx: Tx | UnsignedTx, includeSignature: boolean): Uint8Array {
  const version = tx.version;

  switch (version) {
    case TxVersion.V1:
      return encodeTxV1(tx, includeSignature);
    default:
      throw new Error(`Unsupported transaction version: ${version}`);
  }
}

/**
 * Encode a V1 transaction matching Java TxV1EncodingStrategy.
 */
function encodeTxV1(tx: Tx | UnsignedTx, includeSignature: boolean): Uint8Array {
  const writer = new RLPWriter();

  // Version
  writer.writeIntScalar(tx.version);

  // Timestamp (milliseconds as long scalar)
  writer.writeLongScalar(BigInt(tx.timestamp));

  // Type
  writer.writeIntScalar(tx.type);

  // Network
  writer.writeIntScalar(tx.network);

  // Nonce (optional, wrapped in list)
  writer.writeOptionalLongScalar(tx.nonce);

  // Recipient (optional, wrapped in list)
  writeOptionalAddress(writer, tx.recipient);

  // Token Address (optional, wrapped in list)
  writeOptionalAddress(writer, tx.tokenAddress);

  // Amount (optional Wei scalar, wrapped in list)
  writer.writeOptionalWeiScalar(tx.amount);

  // Fee (required Wei scalar, NOT wrapped)
  writer.writeWeiScalar(tx.fee);

  // Message (optional bytes, wrapped in list)
  writer.writeOptionalBytes(tx.message);

  // Payload (optional raw RLP, wrapped in list)
  const payloadBytes = encodePayload(tx.payload, tx.version);
  if (payloadBytes.length === 0 || isEmptyPayload(payloadBytes)) {
    writer.writeEmptyList();
  } else {
    writer.writeOptionalRaw(payloadBytes);
  }

  // Reference Hash (optional bytes32, wrapped in list)
  writer.writeOptionalBytes32(tx.referenceHash ? hexToBytes(tx.referenceHash) : null);

  // Signature (if requested and present, NOT wrapped - just raw 65 bytes)
  if (includeSignature && tx.signature) {
    writer.writeBytes(hexToBytes(tx.signature as Signature));
  }

  return writer.encode();
}

/**
 * Helper to write optional address (wrapped in list).
 */
function writeOptionalAddress(writer: RLPWriter, address: Address | null): void {
  if (address === null) {
    writer.writeEmptyList();
  } else {
    const sublist = writer.startList();
    sublist.writeBytes(hexToBytes(address));
    writer.addList(sublist);
  }
}

/**
 * Check if payload is empty (empty list encoding).
 */
function isEmptyPayload(bytes: Uint8Array): boolean {
  return bytes.length === 1 && bytes[0] === 0xc0;
}

/**
 * TxEncoder singleton for compatibility with Java API.
 */
export const TxEncoder = {
  encode: encodeTx,
};
