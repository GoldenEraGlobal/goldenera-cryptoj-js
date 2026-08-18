import { MiningLimitMode } from '../enums';

export const BASIS_POINTS_DENOMINATOR = 10_000n;
export const MAX_VALIDATOR_MINING_SHARE_BPS = 4_000n;
export const MIN_VALIDATOR_MINING_WINDOW_BLOCKS = 100n;
export const MAX_VALIDATOR_MINING_WINDOW_BLOCKS = 10_000n;
export const MAX_MINING_REWARD_VESTING_BLOCKS = 1_000_000n;

export function validateMiningPolicy(
  mode: MiningLimitMode,
  maxMiningShareBps: bigint
): void {
  if (mode === MiningLimitMode.UNLIMITED) {
    if (maxMiningShareBps !== 0n) {
      throw new Error('UNLIMITED mining policy requires maxMiningShareBps = 0');
    }
    return;
  }
  if (mode !== MiningLimitMode.LIMITED) {
    throw new Error(`Unknown MiningLimitMode code: ${String(mode)}`);
  }
  if (maxMiningShareBps < 1n || maxMiningShareBps > MAX_VALIDATOR_MINING_SHARE_BPS) {
    throw new Error(
      `LIMITED mining policy requires maxMiningShareBps in range 1..${MAX_VALIDATOR_MINING_SHARE_BPS}`
    );
  }
}

export function validateMiningWindowSize(validatorMiningWindowBlocks: bigint): void {
  if (
    validatorMiningWindowBlocks < MIN_VALIDATOR_MINING_WINDOW_BLOCKS ||
    validatorMiningWindowBlocks > MAX_VALIDATOR_MINING_WINDOW_BLOCKS
  ) {
    throw new Error(
      `validatorMiningWindowBlocks must be in range ${MIN_VALIDATOR_MINING_WINDOW_BLOCKS}..${MAX_VALIDATOR_MINING_WINDOW_BLOCKS}`
    );
  }
}

export function validateMiningRewardVestingBlocks(miningRewardVestingBlocks: bigint): void {
  if (
    miningRewardVestingBlocks < 0n ||
    miningRewardVestingBlocks > MAX_MINING_REWARD_VESTING_BLOCKS
  ) {
    throw new Error(
      `miningRewardVestingBlocks must be in range 0..${MAX_MINING_REWARD_VESTING_BLOCKS}`
    );
  }
}

export function validateLimitedPolicyForWindow(
  validatorMiningWindowBlocks: bigint,
  maxMiningShareBps: bigint
): void {
  validateMiningWindowSize(validatorMiningWindowBlocks);
  validateMiningPolicy(MiningLimitMode.LIMITED, maxMiningShareBps);
  if (validatorMiningWindowBlocks * maxMiningShareBps < BASIS_POINTS_DENOMINATOR) {
    throw new Error(
      'LIMITED mining policy must allow at least one block in the configured window'
    );
  }
}
