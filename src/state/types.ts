import type {
  AccountBalanceStateVersion,
  MiningRewardMaturityStateVersion,
  MiningLimitMode,
  MiningWindowStateVersion,
  NetworkParamsStateVersion,
  ValidatorStateVersion,
} from '../enums';
import type { Address, Hash } from '../types';

export interface ValidatorState {
  readonly version: ValidatorStateVersion;
  readonly createdAtBlockHeight: bigint;
  readonly createdAtTimestamp: bigint | null;
  readonly originTxHash: Hash;
  /** V1 decoders expose the effective legacy UNLIMITED/0 policy. */
  readonly miningLimitMode: MiningLimitMode;
  readonly maxMiningShareBps: bigint;
  readonly policyUpdatedByTxHash: Hash | null;
  readonly policyUpdatedAtBlockHeight: bigint;
  readonly policyUpdatedAtTimestamp: bigint | null;
}

export interface NetworkParamsState {
  readonly version: NetworkParamsStateVersion;
  readonly blockReward: bigint;
  readonly blockRewardPoolAddress: Address;
  readonly targetMiningTimeMs: bigint;
  readonly asertHalfLifeBlocks: bigint;
  readonly asertAnchorHeight: bigint;
  readonly minDifficulty: bigint;
  readonly minTxBaseFee: bigint;
  readonly minTxByteFee: bigint;
  readonly updatedByTxHash: Hash;
  readonly currentAuthorityCount: bigint;
  readonly currentValidatorCount: bigint;
  /** V1 decoders expose currentValidatorCount as the effective legacy value. */
  readonly currentUnlimitedValidatorCount: bigint;
  /** V1 decoders expose zero because this field was absent from V1. */
  readonly validatorMiningWindowBlocks: bigint;
  /** V1 decoders expose zero because this field was absent from V1. */
  readonly miningRewardVestingBlocks: bigint;
  /** Sorted multiset containing one BPS value for each active LIMITED validator. */
  readonly limitedValidatorMiningSharesBps: readonly bigint[];
  readonly updatedAtBlockHeight: bigint;
  readonly updatedAtTimestamp: bigint;
}

export interface AccountBalanceState {
  readonly version: AccountBalanceStateVersion;
  readonly balance: bigint;
  /** V1 decoders expose zero because this field was absent from V1. */
  readonly lockedMiningReward: bigint;
  /** V1 decoders expose zero because this field was absent from V1. */
  readonly pendingMiningRewardCancellation: bigint;
  readonly updatedAtBlockHeight: bigint;
  readonly updatedAtTimestamp: bigint | null;
}

export interface MiningRewardMaturityState {
  readonly version: MiningRewardMaturityStateVersion;
  readonly rewards: ReadonlyMap<Address, bigint>;
}

export interface MiningWindowState {
  readonly version: MiningWindowStateVersion;
  readonly windowSize: bigint;
  readonly orderedValidatorIdentities: readonly Address[];
  readonly validatorBlockCounts: ReadonlyMap<Address, bigint>;
  readonly lastUpdatedBlockHeight: bigint;
}
