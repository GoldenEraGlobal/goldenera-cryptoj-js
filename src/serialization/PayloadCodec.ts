/**
 * Payload encoder/decoder.
 * Encodes BIP payloads to RLP format matching Java implementation.
 */

import {
  MiningLimitMode,
  miningLimitModeFromCode,
  TxPayloadType,
  txPayloadTypeFromCode,
  TxPayloadVersion,
  txPayloadVersionFromCode,
  TxVersion,
} from '../enums';
import {
  validateMiningPolicy,
} from '../consensus/MiningConsensusRules';
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
  validateSupportedPayloadVersion(payload);

  const writer = new RLPWriter();

  // Payload type as first element
  writer.writeIntScalar(payload.payloadType);

  const explicitVersion =
    (payload.payloadType === TxPayloadType.BIP_VALIDATOR_ADD &&
      payload.payloadVersion === TxPayloadVersion.V2) ||
    (payload.payloadType === TxPayloadType.BIP_NETWORK_PARAMS_SET &&
      payload.payloadVersion === TxPayloadVersion.V2) ||
    payload.payloadType === TxPayloadType.BIP_VALIDATOR_MINING_POLICY_SET;
  if (explicitVersion) writer.writeIntScalar(payload.payloadVersion);

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
      writeOptionalString(writer, p.websiteUrl ?? null);
      writeOptionalString(writer, p.logoUrl ?? null);
      // maxSupply is optional BigInteger in Java
      writeOptionalBigInteger(writer, p.maxSupply ?? null);
      writer.writeIntScalar(p.userBurnable ? 1 : 0);
      break;
    }

    case TxPayloadType.BIP_TOKEN_UPDATE: {
      const p = payload as AnyTxPayload & { payloadType: TxPayloadType.BIP_TOKEN_UPDATE };
      writer.writeBytes(hexToBytes(p.tokenAddress));
      writeOptionalString(writer, p.name ?? null);
      writeOptionalString(writer, p.smallestUnitName ?? null);
      writeOptionalString(writer, p.websiteUrl ?? null);
      writeOptionalString(writer, p.logoUrl ?? null);
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
    
    case TxPayloadType.BIP_VALIDATOR_ADD: {
      const p = payload as AnyTxPayload & { payloadType: TxPayloadType.BIP_VALIDATOR_ADD };
      writer.writeBytes(hexToBytes(p.validatorAddress));
      if (p.payloadVersion === TxPayloadVersion.V2) {
        validateMiningPolicy(p.miningLimitMode, p.maxMiningShareBps);
        writer.writeIntScalar(p.miningLimitMode);
        writer.writeLongScalar(p.maxMiningShareBps);
      }
      break;
    }

    case TxPayloadType.BIP_VALIDATOR_REMOVE: {
      const p = payload as AnyTxPayload & { payloadType: TxPayloadType.BIP_VALIDATOR_REMOVE };
      writer.writeBytes(hexToBytes(p.validatorAddress));
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
      if (p.payloadVersion === TxPayloadVersion.V2) {
        writer.writeOptionalLongScalar(p.validatorMiningWindowBlocks);
        writer.writeOptionalLongScalar(p.miningRewardVestingBlocks);
      }
      break;
    }

    case TxPayloadType.BIP_VALIDATOR_MINING_POLICY_SET: {
      const p = payload as AnyTxPayload & {
        payloadType: TxPayloadType.BIP_VALIDATOR_MINING_POLICY_SET;
      };
      if (p.payloadVersion !== TxPayloadVersion.V1) {
        throw new Error(`Unsupported validator mining policy payload version: ${p.payloadVersion}`);
      }
      validateMiningPolicy(p.miningLimitMode, p.maxMiningShareBps);
      writer.writeBytes(hexToBytes(p.validatorAddress));
      writer.writeIntScalar(p.miningLimitMode);
      writer.writeLongScalar(p.maxMiningShareBps);
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

function validateSupportedPayloadVersion(payload: TxPayload): void {
  const supportsV2 =
    payload.payloadType === TxPayloadType.BIP_VALIDATOR_ADD ||
    payload.payloadType === TxPayloadType.BIP_NETWORK_PARAMS_SET;
  if (supportsV2) {
    if (
      payload.payloadVersion !== TxPayloadVersion.V1 &&
      payload.payloadVersion !== TxPayloadVersion.V2
    ) {
      throw new Error(`Unsupported payload version ${payload.payloadVersion} for ${payload.payloadType}`);
    }
    return;
  }
  if (payload.payloadVersion !== TxPayloadVersion.V1) {
    throw new Error(`Unsupported payload version ${payload.payloadVersion} for ${payload.payloadType}`);
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
  let payloadVersion = TxPayloadVersion.V1;
  let fieldOffset = 1;
  if (type === TxPayloadType.BIP_VALIDATOR_ADD) {
    if (data.length === 5) {
      payloadVersion = txPayloadVersionFromCode(decodeInt(data[1] as Uint8Array));
      fieldOffset = 2;
      if (payloadVersion !== TxPayloadVersion.V2) {
        throw new Error(`Unsupported validator-add payload version: ${payloadVersion}`);
      }
    } else if (data.length !== 2) {
      throw new Error(`Invalid RLP field count ${data.length} for BIP_VALIDATOR_ADD`);
    }
  } else if (type === TxPayloadType.BIP_NETWORK_PARAMS_SET) {
    if (data.length === 11) {
      payloadVersion = txPayloadVersionFromCode(decodeInt(data[1] as Uint8Array));
      fieldOffset = 2;
      if (payloadVersion !== TxPayloadVersion.V2) {
        throw new Error(`Unsupported network-params payload version: ${payloadVersion}`);
      }
    } else if (data.length !== 8) {
      throw new Error(`Invalid RLP field count ${data.length} for BIP_NETWORK_PARAMS_SET`);
    }
  } else if (type === TxPayloadType.BIP_VALIDATOR_MINING_POLICY_SET) {
    if (data.length !== 5) {
      throw new Error(`Invalid RLP field count ${data.length} for BIP_VALIDATOR_MINING_POLICY_SET`);
    }
    payloadVersion = txPayloadVersionFromCode(decodeInt(data[1] as Uint8Array));
    fieldOffset = 2;
    if (payloadVersion !== TxPayloadVersion.V1) {
      throw new Error(`Unsupported validator mining policy payload version: ${payloadVersion}`);
    }
  } else {
    const expectedFields = implicitV1FieldCount(type);
    if (data.length !== expectedFields) {
      throw new Error(`Invalid RLP field count ${data.length} for payload type ${type}`);
    }
  }

  switch (type) {
    case TxPayloadType.BIP_TOKEN_MINT:
      return {
        payloadType: type,
        payloadVersion: TxPayloadVersion.V1,
        tokenAddress: decodeAddress(data[1] as Uint8Array),
        recipient: decodeAddress(data[2] as Uint8Array),
        amount: decodeBigint(data[3] as Uint8Array),
      };

    case TxPayloadType.BIP_TOKEN_BURN:
      return {
        payloadType: type,
        payloadVersion: TxPayloadVersion.V1,
        tokenAddress: decodeAddress(data[1] as Uint8Array),
        sender: decodeAddress(data[2] as Uint8Array),
        amount: decodeBigint(data[3] as Uint8Array),
      };

    case TxPayloadType.BIP_TOKEN_CREATE:
      return {
        payloadType: type,
        payloadVersion: TxPayloadVersion.V1,
        name: decodeString(data[1] as Uint8Array),
        smallestUnitName: decodeString(data[2] as Uint8Array),
        numberOfDecimals: decodeInt(data[3] as Uint8Array),
        websiteUrl: decodeOptionalString(data[4]),
        logoUrl: decodeOptionalString(data[5]),
        maxSupply: decodeOptionalBigint(data[6]),
        userBurnable: decodeInt(data[7] as Uint8Array) === 1,
      };

    case TxPayloadType.BIP_TOKEN_UPDATE:
      return {
        payloadType: type,
        payloadVersion: TxPayloadVersion.V1,
        tokenAddress: decodeAddress(data[1] as Uint8Array),
        name: decodeOptionalString(data[2]),
        smallestUnitName: decodeOptionalString(data[3]),
        websiteUrl: decodeOptionalString(data[4]),
        logoUrl: decodeOptionalString(data[5]),
      };

    case TxPayloadType.BIP_VOTE:
      return {
        payloadType: type,
        payloadVersion: TxPayloadVersion.V1,
        voteType: decodeInt(data[1] as Uint8Array),
      };

    case TxPayloadType.BIP_ADDRESS_ALIAS_ADD:
      // Java order: alias first, then address
      return {
        payloadType: type,
        payloadVersion: TxPayloadVersion.V1,
        alias: decodeString(data[1] as Uint8Array),
        address: decodeAddress(data[2] as Uint8Array),
      };

    case TxPayloadType.BIP_ADDRESS_ALIAS_REMOVE:
      return {
        payloadType: type,
        payloadVersion: TxPayloadVersion.V1,
        alias: decodeString(data[1] as Uint8Array),
      };

    case TxPayloadType.BIP_AUTHORITY_ADD:
      return {
        payloadType: type,
        payloadVersion: TxPayloadVersion.V1,
        authorityAddress: decodeAddress(data[1] as Uint8Array),
      };

    case TxPayloadType.BIP_AUTHORITY_REMOVE:
      return {
        payloadType: type,
        payloadVersion: TxPayloadVersion.V1,
        authorityAddress: decodeAddress(data[1] as Uint8Array),
      };

    case TxPayloadType.BIP_VALIDATOR_ADD: {
      const validatorAddress = decodeAddress(data[fieldOffset] as Uint8Array);
      if (payloadVersion === TxPayloadVersion.V1) {
        return { payloadType: type, payloadVersion, validatorAddress };
      }
      const miningLimitMode = miningLimitModeFromCode(
        decodeInt(data[fieldOffset + 1] as Uint8Array)
      );
      const maxMiningShareBps = decodeBigint(data[fieldOffset + 2] as Uint8Array);
      validateMiningPolicy(miningLimitMode, maxMiningShareBps);
      return {
        payloadType: type,
        payloadVersion: TxPayloadVersion.V2,
        validatorAddress,
        miningLimitMode,
        maxMiningShareBps,
      };
    }

    case TxPayloadType.BIP_VALIDATOR_REMOVE:
      return {
        payloadType: type,
        payloadVersion: TxPayloadVersion.V1,
        validatorAddress: decodeAddress(data[1] as Uint8Array),
      };

    case TxPayloadType.BIP_NETWORK_PARAMS_SET: {
      const base = {
        payloadType: type,
        blockReward: decodeOptionalBigint(data[fieldOffset]),
        blockRewardPoolAddress: decodeOptionalAddress(data[fieldOffset + 1]),
        targetMiningTimeMs: decodeOptionalBigint(data[fieldOffset + 2]),
        asertHalfLifeBlocks: decodeOptionalBigint(data[fieldOffset + 3]),
        minDifficulty: decodeOptionalBigint(data[fieldOffset + 4]),
        minTxBaseFee: decodeOptionalBigint(data[fieldOffset + 5]),
        minTxByteFee: decodeOptionalBigint(data[fieldOffset + 6]),
      };
      if (payloadVersion === TxPayloadVersion.V1) return { ...base, payloadVersion };
      const validatorMiningWindowBlocks = decodeOptionalBigint(data[fieldOffset + 7]);
      const miningRewardVestingBlocks = decodeOptionalBigint(data[fieldOffset + 8]);
      return { ...base, payloadVersion, validatorMiningWindowBlocks, miningRewardVestingBlocks };
    }

    case TxPayloadType.BIP_VALIDATOR_MINING_POLICY_SET: {
      const validatorAddress = decodeAddress(data[fieldOffset] as Uint8Array);
      const miningLimitMode: MiningLimitMode = miningLimitModeFromCode(
        decodeInt(data[fieldOffset + 1] as Uint8Array)
      );
      const maxMiningShareBps = decodeBigint(data[fieldOffset + 2] as Uint8Array);
      validateMiningPolicy(miningLimitMode, maxMiningShareBps);
      return {
        payloadType: type,
        payloadVersion: TxPayloadVersion.V1,
        validatorAddress,
        miningLimitMode,
        maxMiningShareBps,
      };
    }

    default:
      throw new Error(`Unknown payload type: ${type}`);
  }
}

function implicitV1FieldCount(type: TxPayloadType): number {
  switch (type) {
    case TxPayloadType.BIP_TOKEN_MINT:
    case TxPayloadType.BIP_TOKEN_BURN:
      return 4;
    case TxPayloadType.BIP_TOKEN_CREATE:
      return 8;
    case TxPayloadType.BIP_TOKEN_UPDATE:
      return 6;
    case TxPayloadType.BIP_ADDRESS_ALIAS_ADD:
      return 3;
    case TxPayloadType.BIP_ADDRESS_ALIAS_REMOVE:
    case TxPayloadType.BIP_AUTHORITY_ADD:
    case TxPayloadType.BIP_AUTHORITY_REMOVE:
    case TxPayloadType.BIP_VOTE:
    case TxPayloadType.BIP_VALIDATOR_REMOVE:
      return 2;
    default:
      throw new Error(`Invalid implicit-V1 payload type: ${type}`);
  }
}
