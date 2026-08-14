import { NetworkParamsStateVersion } from '../enums';
import { validateMiningWindowSize } from '../consensus/MiningConsensusRules';
import { RLPWriter } from '../serialization/rlp';
import { hexToBytes, ZERO_ADDRESS, ZERO_HASH } from '../types';
import type { NetworkParamsState } from './types';
import {
  addressAt,
  bigintAt,
  decodeRlpTopLevelList,
  hashAt,
  longAt,
} from './codecHelpers';

export const NETWORK_PARAMS_STATE_ZERO: NetworkParamsState = Object.freeze({
  version: NetworkParamsStateVersion.V1,
  blockReward: 0n,
  blockRewardPoolAddress: ZERO_ADDRESS,
  targetMiningTimeMs: 0n,
  asertHalfLifeBlocks: 0n,
  asertAnchorHeight: 0n,
  minDifficulty: 0n,
  minTxBaseFee: 0n,
  minTxByteFee: 0n,
  updatedByTxHash: ZERO_HASH,
  currentAuthorityCount: 0n,
  currentValidatorCount: 0n,
  currentUnlimitedValidatorCount: 0n,
  validatorMiningWindowBlocks: 0n,
  updatedAtBlockHeight: -(1n << 63n),
  updatedAtTimestamp: 0n,
});

export function encodeNetworkParamsState(state: NetworkParamsState): Uint8Array {
  if (state.version !== NetworkParamsStateVersion.V1 && state.version !== NetworkParamsStateVersion.V2) {
    throw new Error(`Unsupported NetworkParamsState version: ${String(state.version)}`);
  }
  if (state.version === NetworkParamsStateVersion.V2) {
    validateMiningWindowSize(state.validatorMiningWindowBlocks);
    if (
      state.currentUnlimitedValidatorCount < 1n ||
      state.currentUnlimitedValidatorCount > state.currentValidatorCount
    ) {
      throw new Error('currentUnlimitedValidatorCount must be in range 1..currentValidatorCount');
    }
  }
  const writer = new RLPWriter();
  writer.writeIntScalar(state.version);
  writer.writeBigIntegerScalar(state.blockReward);
  writer.writeBytes(hexToBytes(state.blockRewardPoolAddress));
  writer.writeLongScalar(state.targetMiningTimeMs);
  writer.writeLongScalar(state.asertHalfLifeBlocks);
  writer.writeLongScalar(state.asertAnchorHeight);
  writer.writeBigIntegerScalar(state.minDifficulty);
  writer.writeBigIntegerScalar(state.minTxBaseFee);
  writer.writeBigIntegerScalar(state.minTxByteFee);
  writer.writeBytes(hexToBytes(state.updatedByTxHash));
  writer.writeLongScalar(state.currentAuthorityCount);
  writer.writeLongScalar(state.currentValidatorCount);
  writer.writeLongScalar(state.updatedAtBlockHeight);
  writer.writeLongScalar(state.updatedAtTimestamp);
  if (state.version === NetworkParamsStateVersion.V2) {
    writer.writeLongScalar(state.validatorMiningWindowBlocks);
    writer.writeLongScalar(state.currentUnlimitedValidatorCount);
  }
  return writer.encode();
}

export function decodeNetworkParamsState(data: Uint8Array): NetworkParamsState {
  const decoded = decodeRlpTopLevelList(data, 'NetworkParamsState');
  const version = Number(bigintAt(decoded, 0, 'NetworkParamsState version')) as NetworkParamsStateVersion;
  const expectedFields =
    version === NetworkParamsStateVersion.V1 ? 14 : version === NetworkParamsStateVersion.V2 ? 16 : 0;
  if (decoded.length !== expectedFields) {
    throw new Error(`Invalid NetworkParamsState field count for version ${version}: ${decoded.length}`);
  }
  if (version !== NetworkParamsStateVersion.V1 && version !== NetworkParamsStateVersion.V2) {
    throw new Error(`Unknown NetworkParamsState version: ${version}`);
  }
  const currentValidatorCount = longAt(decoded, 11, 'currentValidatorCount');
  const common = {
    version,
    blockReward: bigintAt(decoded, 1, 'blockReward'),
    blockRewardPoolAddress: addressAt(decoded, 2, 'blockRewardPoolAddress'),
    targetMiningTimeMs: longAt(decoded, 3, 'targetMiningTimeMs'),
    asertHalfLifeBlocks: longAt(decoded, 4, 'asertHalfLifeBlocks'),
    asertAnchorHeight: longAt(decoded, 5, 'asertAnchorHeight'),
    minDifficulty: bigintAt(decoded, 6, 'minDifficulty'),
    minTxBaseFee: bigintAt(decoded, 7, 'minTxBaseFee'),
    minTxByteFee: bigintAt(decoded, 8, 'minTxByteFee'),
    updatedByTxHash: hashAt(decoded, 9, 'updatedByTxHash'),
    currentAuthorityCount: longAt(decoded, 10, 'currentAuthorityCount'),
    currentValidatorCount,
    updatedAtBlockHeight: longAt(decoded, 12, 'updatedAtBlockHeight'),
    updatedAtTimestamp: longAt(decoded, 13, 'updatedAtTimestamp'),
  };
  if (version === NetworkParamsStateVersion.V1) {
    return {
      ...common,
      currentUnlimitedValidatorCount: currentValidatorCount,
      validatorMiningWindowBlocks: 0n,
    };
  }
  const validatorMiningWindowBlocks = longAt(decoded, 14, 'validatorMiningWindowBlocks');
  const currentUnlimitedValidatorCount = longAt(decoded, 15, 'currentUnlimitedValidatorCount');
  validateMiningWindowSize(validatorMiningWindowBlocks);
  if (currentUnlimitedValidatorCount < 1n || currentUnlimitedValidatorCount > currentValidatorCount) {
    throw new Error('currentUnlimitedValidatorCount must be in range 1..currentValidatorCount');
  }
  return {
    ...common,
    validatorMiningWindowBlocks,
    currentUnlimitedValidatorCount,
  };
}
