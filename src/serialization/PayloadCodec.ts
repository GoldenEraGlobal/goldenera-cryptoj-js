/**
 * Payload encoder/decoder.
 * Encodes BIP payloads to RLP format matching Java implementation.
 */

import { TxPayloadType, txPayloadTypeFromCode, TxVersion } from '../enums';
import type { TxPayload } from '../tx/payloads/TxPayload';
import type { AnyTxPayload } from '../tx/payloads/types';
import type { Address } from '../types';
import { hexToBytes } from '../types';
import {
  decodeAddress,
  decodeBigint,
  decodeInt,
  decodeOptionalAddress,
  decodeOptionalBigint,
  decodeOptionalString,
  decodeString,
  EMPTY_LIST,
  encodeString,
  rlpDecode,
  RLPWriter
} from './rlp';

// ============================================
// Payload Encoder
// ============================================

export function encodePayload(payload: TxPayload | null, _version: TxVersion): Uint8Array {
  if (payload === null) {
    return EMPTY_LIST;
  }

  const writer = new RLPWriter();

  // Payload type as first element
  writer.writeIntScalar(payload.payloadType);

  switch (payload.payloadType) {
    case TxPayloadType.BIP_TOKEN_MINT: {
      const p = payload as AnyTxPayload & { payloadType: TxPayloadType.BIP_TOKEN_MINT };
      writer.writeBytes(hexToBytes(p.tokenAddress));
      writer.writeBytes(hexToBytes(p.recipient));
      writer.writeBigIntegerScalar(p.amount);
      break;
    }

    case TxPayloadType.BIP_TOKEN_BURN: {
      const p = payload as AnyTxPayload & { payloadType: TxPayloadType.BIP_TOKEN_BURN };
      writer.writeBytes(hexToBytes(p.tokenAddress));
      writer.writeBytes(hexToBytes(p.sender));
      writer.writeBigIntegerScalar(p.amount);
      break;
    }

    case TxPayloadType.BIP_TOKEN_CREATE: {
      const p = payload as AnyTxPayload & { payloadType: TxPayloadType.BIP_TOKEN_CREATE };
      writer.writeBytes(encodeString(p.name));
      writer.writeBytes(encodeString(p.smallestUnitName));
      writer.writeIntScalar(p.numberOfDecimals);
      // websiteUrl and logoUrl are optional in Java
      writeOptionalString(writer, p.websiteUrl || null);
      writeOptionalString(writer, p.logoUrl || null);
      // maxSupply is optional BigInteger in Java
      writeOptionalBigInteger(writer, p.maxSupply);
      writer.writeIntScalar(p.userBurnable ? 1 : 0);
      break;
    }

    case TxPayloadType.BIP_TOKEN_UPDATE: {
      const p = payload as AnyTxPayload & { payloadType: TxPayloadType.BIP_TOKEN_UPDATE };
      writer.writeBytes(hexToBytes(p.tokenAddress));
      writeOptionalString(writer, p.name);
      writeOptionalString(writer, p.smallestUnitName);
      writeOptionalString(writer, p.websiteUrl);
      writeOptionalString(writer, p.logoUrl);
      break;
    }

    case TxPayloadType.BIP_VOTE: {
      const p = payload as AnyTxPayload & { payloadType: TxPayloadType.BIP_VOTE };
      writer.writeIntScalar(p.voteType);
      break;
    }

    case TxPayloadType.BIP_ADDRESS_ALIAS_ADD: {
      const p = payload as AnyTxPayload & { payloadType: TxPayloadType.BIP_ADDRESS_ALIAS_ADD };
      // Java order: alias first, then address
      writer.writeBytes(encodeString(p.alias));
      writer.writeBytes(hexToBytes(p.address));
      break;
    }

    case TxPayloadType.BIP_ADDRESS_ALIAS_REMOVE: {
      const p = payload as AnyTxPayload & { payloadType: TxPayloadType.BIP_ADDRESS_ALIAS_REMOVE };
      writer.writeBytes(encodeString(p.alias));
      break;
    }

    case TxPayloadType.BIP_AUTHORITY_ADD: {
      const p = payload as AnyTxPayload & { payloadType: TxPayloadType.BIP_AUTHORITY_ADD };
      writer.writeBytes(hexToBytes(p.authorityAddress));
      break;
    }

    case TxPayloadType.BIP_AUTHORITY_REMOVE: {
      const p = payload as AnyTxPayload & { payloadType: TxPayloadType.BIP_AUTHORITY_REMOVE };
      writer.writeBytes(hexToBytes(p.authorityAddress));
      break;
    }

    case TxPayloadType.BIP_NETWORK_PARAMS_SET: {
      const p = payload as AnyTxPayload & { payloadType: TxPayloadType.BIP_NETWORK_PARAMS_SET };
      writer.writeOptionalWeiScalar(p.blockReward);
      writeOptionalAddressField(writer, p.blockRewardPoolAddress);
      writer.writeOptionalLongScalar(p.targetMiningTimeMs);
      writer.writeOptionalLongScalar(p.asertHalfLifeBlocks);
      writeOptionalBigInteger(writer, p.minDifficulty);
      writer.writeOptionalWeiScalar(p.minTxBaseFee);
      writer.writeOptionalWeiScalar(p.minTxByteFee);
      break;
    }

    default:
      throw new Error(`Unknown payload type: ${(payload as TxPayload).payloadType}`);
  }

  return writer.encode();
}

function writeOptionalString(writer: RLPWriter, value: string | null): void {
  if (value === null) {
    writer.writeEmptyList();
  } else {
    const sublist = writer.startList();
    sublist.writeBytes(encodeString(value));
    writer.addList(sublist);
  }
}

function writeOptionalAddressField(writer: RLPWriter, address: Address | null): void {
  if (address === null) {
    writer.writeEmptyList();
  } else {
    const sublist = writer.startList();
    sublist.writeBytes(hexToBytes(address));
    writer.addList(sublist);
  }
}

function writeOptionalBigInteger(writer: RLPWriter, value: bigint | null): void {
  if (value === null) {
    writer.writeEmptyList();
  } else {
    const sublist = writer.startList();
    sublist.writeBigIntegerScalar(value);
    writer.addList(sublist);
  }
}

// ============================================
// Payload Decoder
// ============================================

export function decodePayload(data: Uint8Array | unknown[], _version: TxVersion): AnyTxPayload | null {
  // Check for empty/null payload
  if (data instanceof Uint8Array) {
    if (data.length === 0 || (data.length === 1 && data[0] === 0xc0)) {
      return null;
    }
    // Decode the RLP
    const decoded = rlpDecode(data);
    if (!Array.isArray(decoded)) {
      throw new Error('Invalid payload: expected list');
    }
    data = decoded;
  }

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  // Payload comes wrapped in optional list: [[payloadType, field1, field2, ...]]
  // Unwrap the optional wrapper if present
  if (data.length === 1 && Array.isArray(data[0])) {
    data = data[0] as unknown[];
  }

  // Empty inner list means null payload
  if (data.length === 0) {
    return null;
  }

  const typeBytes = data[0] as Uint8Array;
  const type = txPayloadTypeFromCode(decodeInt(typeBytes));

  switch (type) {
    case TxPayloadType.BIP_TOKEN_MINT:
      return {
        payloadType: type,
        tokenAddress: decodeAddress(data[1] as Uint8Array),
        recipient: decodeAddress(data[2] as Uint8Array),
        amount: decodeBigint(data[3] as Uint8Array),
      };

    case TxPayloadType.BIP_TOKEN_BURN:
      return {
        payloadType: type,
        tokenAddress: decodeAddress(data[1] as Uint8Array),
        sender: decodeAddress(data[2] as Uint8Array),
        amount: decodeBigint(data[3] as Uint8Array),
      };

    case TxPayloadType.BIP_TOKEN_CREATE:
      return {
        payloadType: type,
        name: decodeString(data[1] as Uint8Array),
        smallestUnitName: decodeString(data[2] as Uint8Array),
        numberOfDecimals: decodeInt(data[3] as Uint8Array),
        websiteUrl: decodeOptionalString(data[4]) ?? '',
        logoUrl: decodeOptionalString(data[5]) ?? '',
        maxSupply: decodeOptionalBigint(data[6]) ?? 0n,
        userBurnable: decodeInt(data[7] as Uint8Array) === 1,
      };

    case TxPayloadType.BIP_TOKEN_UPDATE:
      return {
        payloadType: type,
        tokenAddress: decodeAddress(data[1] as Uint8Array),
        name: decodeOptionalString(data[2]),
        smallestUnitName: decodeOptionalString(data[3]),
        websiteUrl: decodeOptionalString(data[4]),
        logoUrl: decodeOptionalString(data[5]),
      };

    case TxPayloadType.BIP_VOTE:
      return {
        payloadType: type,
        voteType: decodeInt(data[1] as Uint8Array),
      };

    case TxPayloadType.BIP_ADDRESS_ALIAS_ADD:
      // Java order: alias first, then address
      return {
        payloadType: type,
        alias: decodeString(data[1] as Uint8Array),
        address: decodeAddress(data[2] as Uint8Array),
      };

    case TxPayloadType.BIP_ADDRESS_ALIAS_REMOVE:
      return {
        payloadType: type,
        alias: decodeString(data[1] as Uint8Array),
      };

    case TxPayloadType.BIP_AUTHORITY_ADD:
      return {
        payloadType: type,
        authorityAddress: decodeAddress(data[1] as Uint8Array),
      };

    case TxPayloadType.BIP_AUTHORITY_REMOVE:
      return {
        payloadType: type,
        authorityAddress: decodeAddress(data[1] as Uint8Array),
      };

    case TxPayloadType.BIP_NETWORK_PARAMS_SET:
      return {
        payloadType: type,
        blockReward: decodeOptionalBigint(data[1]),
        blockRewardPoolAddress: decodeOptionalAddress(data[2]),
        targetMiningTimeMs: decodeOptionalBigint(data[3]),
        asertHalfLifeBlocks: decodeOptionalBigint(data[4]),
        minDifficulty: decodeOptionalBigint(data[5]),
        minTxBaseFee: decodeOptionalBigint(data[6]),
        minTxByteFee: decodeOptionalBigint(data[7]),
      };

    default:
      throw new Error(`Unknown payload type: ${type}`);
  }
}
