import { AccountBalanceStateVersion } from '../enums';
import { RLPWriter } from '../serialization/rlp';
import type { AccountBalanceState } from './types';
import { bigintAt, decodeRlpTopLevelList, longAt, optionalBigintAt } from './codecHelpers';

export const ACCOUNT_BALANCE_STATE_ZERO: AccountBalanceState = Object.freeze({
  version: AccountBalanceStateVersion.V1,
  balance: 0n,
  lockedMiningReward: 0n,
  pendingMiningRewardCancellation: 0n,
  updatedAtBlockHeight: -(1n << 63n),
  updatedAtTimestamp: 0n,
});

export const ACCOUNT_BALANCE_STATE_ZERO_V2: AccountBalanceState = Object.freeze({
  ...ACCOUNT_BALANCE_STATE_ZERO,
  version: AccountBalanceStateVersion.V2,
});

export function spendableBalance(state: AccountBalanceState): bigint {
  validateAccountBalanceState(state);
  return state.balance - state.lockedMiningReward;
}

export function validateAccountBalanceState(state: AccountBalanceState): void {
  if (
    state.version !== AccountBalanceStateVersion.V1 &&
    state.version !== AccountBalanceStateVersion.V2
  ) {
    throw new Error(`Unsupported AccountBalanceState version: ${String(state.version)}`);
  }
  if (
    state.balance < 0n ||
    state.lockedMiningReward < 0n ||
    state.pendingMiningRewardCancellation < 0n
  ) {
    throw new Error('Account balance and mining reward fields cannot be negative');
  }
  if (
    state.version === AccountBalanceStateVersion.V1 &&
    (state.lockedMiningReward !== 0n || state.pendingMiningRewardCancellation !== 0n)
  ) {
    throw new Error('AccountBalanceState V1 cannot contain mining reward fields');
  }
  if (state.lockedMiningReward > state.balance) {
    throw new Error('Locked mining reward cannot exceed balance');
  }
}

export function encodeAccountBalanceState(state: AccountBalanceState): Uint8Array {
  validateAccountBalanceState(state);
  const writer = new RLPWriter();
  writer.writeIntScalar(state.version);
  writer.writeBigIntegerScalar(state.balance);
  writer.writeLongScalar(state.updatedAtBlockHeight);
  writer.writeOptionalLongScalar(state.updatedAtTimestamp);
  if (state.version === AccountBalanceStateVersion.V2) {
    writer.writeBigIntegerScalar(state.lockedMiningReward);
    writer.writeBigIntegerScalar(state.pendingMiningRewardCancellation);
  }
  return writer.encode();
}

export function decodeAccountBalanceState(data: Uint8Array): AccountBalanceState {
  const decoded = decodeRlpTopLevelList(data, 'AccountBalanceState');
  const version = Number(bigintAt(decoded, 0, 'AccountBalanceState version')) as AccountBalanceStateVersion;
  const expectedFields =
    version === AccountBalanceStateVersion.V1 ? 4 : version === AccountBalanceStateVersion.V2 ? 6 : 0;
  if (decoded.length !== expectedFields) {
    throw new Error(`Invalid AccountBalanceState field count for version ${version}: ${decoded.length}`);
  }
  const state: AccountBalanceState = {
    version,
    balance: bigintAt(decoded, 1, 'balance'),
    updatedAtBlockHeight: longAt(decoded, 2, 'updatedAtBlockHeight'),
    updatedAtTimestamp: optionalBigintAt(decoded, 3),
    lockedMiningReward:
      version === AccountBalanceStateVersion.V2 ? bigintAt(decoded, 4, 'lockedMiningReward') : 0n,
    pendingMiningRewardCancellation:
      version === AccountBalanceStateVersion.V2
        ? bigintAt(decoded, 5, 'pendingMiningRewardCancellation')
        : 0n,
  };
  validateAccountBalanceState(state);
  return Object.freeze(state);
}

export function upgradeAccountBalanceToV2(state: AccountBalanceState): AccountBalanceState {
  validateAccountBalanceState(state);
  return state.version === AccountBalanceStateVersion.V2
    ? state
    : Object.freeze({ ...state, version: AccountBalanceStateVersion.V2 });
}

export function creditAccountBalance(
  state: AccountBalanceState,
  amount: bigint,
  blockHeight: bigint,
  timestamp: bigint | null
): AccountBalanceState {
  if (amount < 0n) throw new Error('Cannot credit negative amount');
  validateAccountBalanceState(state);
  return Object.freeze({
    ...state,
    balance: state.balance + amount,
    updatedAtBlockHeight: blockHeight,
    updatedAtTimestamp: timestamp,
  });
}

export function debitAccountBalance(
  state: AccountBalanceState,
  amount: bigint,
  blockHeight: bigint,
  timestamp: bigint | null
): AccountBalanceState {
  if (amount < 0n) throw new Error('Cannot debit negative amount');
  validateAccountBalanceState(state);
  if (amount > state.balance - state.lockedMiningReward) {
    throw new Error('Insufficient spendable funds');
  }
  return Object.freeze({
    ...state,
    balance: state.balance - amount,
    updatedAtBlockHeight: blockHeight,
    updatedAtTimestamp: timestamp,
  });
}

export function creditLockedMiningReward(
  state: AccountBalanceState,
  amount: bigint,
  blockHeight: bigint,
  timestamp: bigint | null
): AccountBalanceState {
  if (amount < 0n) throw new Error('Cannot credit negative mining reward');
  validateAccountBalanceState(state);
  return Object.freeze({
    ...state,
    version: AccountBalanceStateVersion.V2,
    balance: state.balance + amount,
    lockedMiningReward: state.lockedMiningReward + amount,
    updatedAtBlockHeight: blockHeight,
    updatedAtTimestamp: timestamp,
  });
}

export function burnIncludingLockedMiningReward(
  state: AccountBalanceState,
  amount: bigint,
  blockHeight: bigint,
  timestamp: bigint | null
): AccountBalanceState {
  if (amount < 0n) throw new Error('Cannot burn negative amount');
  validateAccountBalanceState(state);
  if (amount > state.balance) throw new Error('Insufficient total funds');
  const spendable = state.balance - state.lockedMiningReward;
  const lockedBurned = amount > spendable ? amount - spendable : 0n;
  const next: AccountBalanceState = {
    ...state,
    balance: state.balance - amount,
    lockedMiningReward: state.lockedMiningReward - lockedBurned,
    pendingMiningRewardCancellation: state.pendingMiningRewardCancellation + lockedBurned,
    updatedAtBlockHeight: blockHeight,
    updatedAtTimestamp: timestamp,
  };
  return Object.freeze(next);
}

export function unlockMiningReward(
  state: AccountBalanceState,
  amount: bigint,
  blockHeight: bigint,
  timestamp: bigint | null
): AccountBalanceState {
  if (amount < 0n) throw new Error('Cannot unlock negative mining reward');
  validateAccountBalanceState(state);
  const cancellationApplied =
    state.pendingMiningRewardCancellation < amount
      ? state.pendingMiningRewardCancellation
      : amount;
  const amountToUnlock = amount - cancellationApplied;
  if (amountToUnlock > state.lockedMiningReward) {
    throw new Error('Cannot mature more than locked and cancelled mining reward');
  }
  return Object.freeze({
    ...state,
    version: AccountBalanceStateVersion.V2,
    lockedMiningReward: state.lockedMiningReward - amountToUnlock,
    pendingMiningRewardCancellation:
      state.pendingMiningRewardCancellation - cancellationApplied,
    updatedAtBlockHeight: blockHeight,
    updatedAtTimestamp: timestamp,
  });
}
