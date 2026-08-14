import { MiningLimitMode, ValidatorStateVersion } from '../enums';
import { miningLimitModeFromCode } from '../enums';
import { validateMiningPolicy } from '../consensus/MiningConsensusRules';
import { RLPWriter } from '../serialization/rlp';
import { hexToBytes, ZERO_HASH } from '../types';
import type { ValidatorState } from './types';
import { bigintAt, decodeRlpTopLevelList, hashAt, longAt, optionalBigintAt } from './codecHelpers';

export const VALIDATOR_STATE_ZERO: ValidatorState = Object.freeze({
  version: ValidatorStateVersion.V1,
  createdAtBlockHeight: -(1n << 63n),
  createdAtTimestamp: 0n,
  originTxHash: ZERO_HASH,
  miningLimitMode: MiningLimitMode.UNLIMITED,
  maxMiningShareBps: 0n,
  policyUpdatedByTxHash: null,
  policyUpdatedAtBlockHeight: -(1n << 63n),
  policyUpdatedAtTimestamp: null,
});

export function encodeValidatorState(state: ValidatorState): Uint8Array {
  const writer = new RLPWriter();
  writer.writeIntScalar(state.version);
  writer.writeLongScalar(state.createdAtBlockHeight);
  writer.writeOptionalLongScalar(state.createdAtTimestamp);
  writer.writeBytes(hexToBytes(state.originTxHash));
  if (state.version === ValidatorStateVersion.V2) {
    validateMiningPolicy(state.miningLimitMode, state.maxMiningShareBps);
    if (state.policyUpdatedByTxHash === null || state.policyUpdatedAtTimestamp === null) {
      throw new Error('ValidatorState V2 requires policy audit metadata');
    }
    writer.writeIntScalar(state.miningLimitMode);
    writer.writeLongScalar(state.maxMiningShareBps);
    writer.writeBytes(hexToBytes(state.policyUpdatedByTxHash));
    writer.writeLongScalar(state.policyUpdatedAtBlockHeight);
    writer.writeLongScalar(state.policyUpdatedAtTimestamp);
  } else if (state.version !== ValidatorStateVersion.V1) {
    throw new Error(`Unsupported ValidatorState version: ${String(state.version)}`);
  }
  return writer.encode();
}

export function decodeValidatorState(data: Uint8Array): ValidatorState {
  const preliminary = decodeRlpTopLevelList(data, 'ValidatorState');
  const version = Number(bigintAt(preliminary, 0, 'ValidatorState version')) as ValidatorStateVersion;
  const expectedFields = version === ValidatorStateVersion.V1 ? 4 : version === ValidatorStateVersion.V2 ? 9 : 0;
  if (preliminary.length !== expectedFields) {
    throw new Error(`Invalid ValidatorState field count for version ${version}: ${preliminary.length}`);
  }
  const createdAtBlockHeight = longAt(preliminary, 1, 'createdAtBlockHeight');
  const createdAtTimestamp = optionalBigintAt(preliminary, 2);
  const originTxHash = hashAt(preliminary, 3, 'originTxHash');
  if (version === ValidatorStateVersion.V1) {
    return {
      version,
      createdAtBlockHeight,
      createdAtTimestamp,
      originTxHash,
      miningLimitMode: MiningLimitMode.UNLIMITED,
      maxMiningShareBps: 0n,
      policyUpdatedByTxHash: null,
      policyUpdatedAtBlockHeight: -(1n << 63n),
      policyUpdatedAtTimestamp: null,
    };
  }
  if (version !== ValidatorStateVersion.V2) {
    throw new Error(`Unknown ValidatorState version: ${version}`);
  }
  const miningLimitMode = miningLimitModeFromCode(Number(bigintAt(preliminary, 4, 'miningLimitMode')));
  const maxMiningShareBps = bigintAt(preliminary, 5, 'maxMiningShareBps');
  validateMiningPolicy(miningLimitMode, maxMiningShareBps);
  return {
    version,
    createdAtBlockHeight,
    createdAtTimestamp,
    originTxHash,
    miningLimitMode,
    maxMiningShareBps,
    policyUpdatedByTxHash: hashAt(preliminary, 6, 'policyUpdatedByTxHash'),
    policyUpdatedAtBlockHeight: longAt(preliminary, 7, 'policyUpdatedAtBlockHeight'),
    policyUpdatedAtTimestamp: bigintAt(preliminary, 8, 'policyUpdatedAtTimestamp'),
  };
}
