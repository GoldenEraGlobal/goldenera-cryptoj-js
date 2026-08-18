import { describe, expect, it } from 'vitest';
import { AccountBalanceStateVersion, MiningRewardMaturityStateVersion } from '../enums';
import {
  ACCOUNT_BALANCE_STATE_ZERO,
  burnIncludingLockedMiningReward,
  creditAccountBalance,
  creditLockedMiningReward,
  decodeAccountBalanceState,
  debitAccountBalance,
  encodeAccountBalanceState,
  spendableBalance,
  unlockMiningReward,
  upgradeAccountBalanceToV2,
} from '../state/AccountBalanceStateCodec';
import {
  addMiningRewardMaturity,
  decodeMiningRewardMaturityState,
  encodeMiningRewardMaturityState,
  MINING_REWARD_MATURITY_STATE_ZERO,
} from '../state/MiningRewardMaturityStateCodec';
import type { AccountBalanceState } from '../state/types';
import { bytesToHex, hexToBytes } from '../types';
import type { Address, Hex } from '../types';
import { javaMiningEconomicsVectors as vectors } from './miningEconomics.java-vectors';

const FIRST = '0x1111111111111111111111111111111111111111' as Address;
const SECOND = '0x2222222222222222222222222222222222222222' as Address;

describe('vesting-period Java golden vectors', () => {
  it('preserves AccountBalanceState V1 and matches V2 mining-reward fields', () => {
    const v1 = decodeAccountBalanceState(fromHex(vectors.state.accountBalanceV1));
    expect(v1).toEqual({
      version: AccountBalanceStateVersion.V1,
      balance: 10n,
      lockedMiningReward: 0n,
      pendingMiningRewardCancellation: 0n,
      updatedAtBlockHeight: 5n,
      updatedAtTimestamp: 1_000n,
    });
    expectHex(encodeAccountBalanceState(v1), vectors.state.accountBalanceV1);

    const v2: AccountBalanceState = {
      version: AccountBalanceStateVersion.V2,
      balance: 10n,
      lockedMiningReward: 4n,
      pendingMiningRewardCancellation: 3n,
      updatedAtBlockHeight: 5n,
      updatedAtTimestamp: 1_000n,
    };
    expect(spendableBalance(v2)).toBe(6n);
    expectHex(encodeAccountBalanceState(v2), vectors.state.accountBalanceV2);
    expect(decodeAccountBalanceState(fromHex(vectors.state.accountBalanceV2))).toEqual(v2);
    expect(debitAccountBalance(v2, 6n, 6n, 1_000n).balance).toBe(4n);
    expect(() => debitAccountBalance(v2, 7n, 6n, 1_000n)).toThrow('Insufficient spendable');
    expect(creditAccountBalance(v2, 2n, 6n, 1_000n).balance).toBe(12n);
  });

  it('matches locked-reward burn and maturity cancellation semantics', () => {
    const upgraded = upgradeAccountBalanceToV2(ACCOUNT_BALANCE_STATE_ZERO);
    const rewarded = creditLockedMiningReward(upgraded, 25n, 1n, 1_000n);
    expect(rewarded.balance).toBe(25n);
    expect(rewarded.lockedMiningReward).toBe(25n);

    const burned = burnIncludingLockedMiningReward(rewarded, 25n, 2n, 1_000n);
    expect(burned.balance).toBe(0n);
    expect(burned.lockedMiningReward).toBe(0n);
    expect(burned.pendingMiningRewardCancellation).toBe(25n);

    const matured = unlockMiningReward(burned, 25n, 10n, 1_000n);
    expect(spendableBalance(matured)).toBe(0n);
    expect(matured.pendingMiningRewardCancellation).toBe(0n);
  });

  it('encodes maturity rewards in canonical address order', () => {
    let state = MINING_REWARD_MATURITY_STATE_ZERO;
    state = addMiningRewardMaturity(state, SECOND, 2n);
    state = addMiningRewardMaturity(state, FIRST, 1n);
    expectHex(encodeMiningRewardMaturityState(state), vectors.state.miningRewardMaturity);

    const decoded = decodeMiningRewardMaturityState(fromHex(vectors.state.miningRewardMaturity));
    expect(decoded.version).toBe(MiningRewardMaturityStateVersion.V1);
    expect([...decoded.rewards]).toEqual([
      [FIRST, 1n],
      [SECOND, 2n],
    ]);
    expect(Object.isFrozen(decoded.rewards)).toBe(true);
    expect('set' in decoded.rewards).toBe(false);
    expectHex(
      encodeMiningRewardMaturityState(MINING_REWARD_MATURITY_STATE_ZERO),
      vectors.state.miningRewardMaturityZero
    );
  });

  it('rejects invalid reward locks, malformed fields, and non-canonical maturities', () => {
    expect(() =>
      encodeAccountBalanceState({
        version: AccountBalanceStateVersion.V2,
        balance: 3n,
        lockedMiningReward: 4n,
        pendingMiningRewardCancellation: 0n,
        updatedAtBlockHeight: 1n,
        updatedAtTimestamp: 1_000n,
      })
    ).toThrow('cannot exceed balance');
    expect(() => decodeAccountBalanceState(fromHex('0xc8020a05c38203e804'))).toThrow(
      'field count'
    );

    const nonCanonical = fromHex(
      `0xf001eed694${'22'.repeat(20)}02d694${'11'.repeat(20)}01`
    );
    expect(() => decodeMiningRewardMaturityState(nonCanonical)).toThrow('canonical address order');
    expect(() => addMiningRewardMaturity(MINING_REWARD_MATURITY_STATE_ZERO, FIRST, 0n)).toThrow(
      'positive'
    );
  });
});

function fromHex(hex: string): Uint8Array {
  return hexToBytes(hex as Hex);
}

function expectHex(actual: Uint8Array, expected: string): void {
  expect(bytesToHex(actual)).toBe(expected);
}
