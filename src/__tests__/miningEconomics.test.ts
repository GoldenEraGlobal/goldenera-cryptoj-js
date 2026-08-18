import { describe, expect, it } from 'vitest';
import {
  BipType,
  MiningLimitMode,
  MiningWindowStateVersion,
  NetworkParamsStateVersion,
  TxPayloadType,
  TxPayloadVersion,
  TxVersion,
  ValidatorStateVersion,
} from '../enums';
import {
  createLegacyNetworkParamsSetPayload,
  createLegacyValidatorAddPayload,
  createNetworkParamsSetPayload,
  createValidatorAddPayload,
  createValidatorMiningPolicySetPayload,
} from '../tx/payloads';
import type { NetworkParamsSetPayloadV2 } from '../tx/payloads';
import { decodePayload, encodePayload } from '../serialization/PayloadCodec';
import {
  decodeInt,
  decodeLong,
  decodeOptionalBigint,
  rlpDecode,
  rlpEncode,
  RLPWriter,
} from '../serialization/rlp';
import { bytesToHex, hexToBytes, ZERO_ADDRESS, ZERO_HASH } from '../types';
import type { Address, Hash, Hex } from '../types';
import {
  MAX_VALIDATOR_MINING_SHARE_BPS,
  validateMiningRewardVestingBlocks,
  validateLimitedPolicyForWindow,
  validateMiningPolicy,
  validateMiningWindowSize,
} from '../consensus/MiningConsensusRules';
import {
  decodeValidatorState,
  encodeValidatorState,
  VALIDATOR_STATE_ZERO,
} from '../state/ValidatorStateCodec';
import type { MiningWindowState, NetworkParamsState, ValidatorState } from '../state/types';
import {
  decodeNetworkParamsState,
  encodeNetworkParamsState,
  NETWORK_PARAMS_STATE_ZERO,
} from '../state/NetworkParamsStateCodec';
import {
  appendMiningWindow,
  createEmptyMiningWindowState,
  decodeMiningWindowState,
  encodeMiningWindowState,
  MINING_WINDOW_STATE_ZERO,
} from '../state/MiningWindowStateCodec';
import { javaMiningEconomicsVectors as vectors } from './miningEconomics.java-vectors';
import { javaRlpAdversarialVectors } from './miningEconomics.java-adversarial-vectors';

const VALIDATOR = '0x1111111111111111111111111111111111111111' as Address;
const SECOND_VALIDATOR = '0x2222222222222222222222222222222222222222' as Address;
const HASH_1 = `0x${'00'.repeat(31)}01` as Hash;
const HASH_2 = `0x${'00'.repeat(31)}02` as Hash;

describe('mining economics Java golden vectors', () => {
  it('preserves implicit V1 payload bytes and defaults factories to latest versions', () => {
    const validatorV1 = createLegacyValidatorAddPayload(VALIDATOR);
    expectHex(encodePayload(validatorV1, TxVersion.V1), vectors.payload.validatorAddV1);
    expect(decodePayload(fromHex(vectors.payload.validatorAddV1), TxVersion.V1)).toEqual(validatorV1);

    const validatorV2 = createValidatorAddPayload(VALIDATOR, {
      miningLimitMode: MiningLimitMode.LIMITED,
      maxMiningShareBps: 3_000n,
    });
    expect(validatorV2.payloadVersion).toBe(TxPayloadVersion.V2);
    expectHex(encodePayload(validatorV2, TxVersion.V1), vectors.payload.validatorAddV2);
    expect(decodePayload(fromHex(vectors.payload.validatorAddV2), TxVersion.V1)).toEqual(validatorV2);

    const networkV1 = createLegacyNetworkParamsSetPayload({});
    expectHex(encodePayload(networkV1, TxVersion.V1), vectors.payload.networkParamsV1);
    expect(decodePayload(fromHex(vectors.payload.networkParamsV1), TxVersion.V1)).toEqual(networkV1);

    const networkV2 = createNetworkParamsSetPayload({
      validatorMiningWindowBlocks: 100n,
      miningRewardVestingBlocks: 86_400n,
    });
    expect(networkV2.payloadVersion).toBe(TxPayloadVersion.V2);
    expectHex(encodePayload(networkV2, TxVersion.V1), vectors.payload.networkParamsV2);
    expect(decodePayload(fromHex(vectors.payload.networkParamsV2), TxVersion.V1)).toEqual(networkV2);

    const networkV2WithoutResize = createNetworkParamsSetPayload({});
    expectHex(
      encodePayload(networkV2WithoutResize, TxVersion.V1),
      vectors.payload.networkParamsV2WithoutResize
    );
  });

  it('matches the new independently-versioned policy payload', () => {
    const payload = createValidatorMiningPolicySetPayload(VALIDATOR, {
      miningLimitMode: MiningLimitMode.UNLIMITED,
      maxMiningShareBps: 0n,
    });
    expect(payload.payloadVersion).toBe(TxPayloadVersion.V1);
    expectHex(encodePayload(payload, TxVersion.V1), vectors.payload.validatorMiningPolicySet);
    expect(decodePayload(fromHex(vectors.payload.validatorMiningPolicySet), TxVersion.V1)).toEqual(
      payload
    );
  });

  it('structurally round-trips out-of-range network params for node rejection', () => {
    const payload: NetworkParamsSetPayloadV2 = {
      payloadType: TxPayloadType.BIP_NETWORK_PARAMS_SET,
      payloadVersion: TxPayloadVersion.V2,
      blockReward: null,
      blockRewardPoolAddress: null,
      targetMiningTimeMs: null,
      asertHalfLifeBlocks: null,
      minDifficulty: null,
      minTxBaseFee: null,
      minTxByteFee: null,
      validatorMiningWindowBlocks: 10_001n,
      miningRewardVestingBlocks: null,
    };
    expectHex(encodePayload(payload, TxVersion.V1), vectors.payload.networkParamsV2OutOfRange);
    expect(decodePayload(fromHex(vectors.payload.networkParamsV2OutOfRange), TxVersion.V1)).toEqual(
      payload
    );
  });

  it('matches ValidatorState V1 and V2 and resolves V1 effective defaults', () => {
    const v1 = decodeValidatorState(fromHex(vectors.state.validatorV1));
    expect(v1.miningLimitMode).toBe(MiningLimitMode.UNLIMITED);
    expect(v1.maxMiningShareBps).toBe(0n);
    expect(v1.policyUpdatedByTxHash).toBeNull();
    expectHex(encodeValidatorState(v1), vectors.state.validatorV1);

    const v2: ValidatorState = {
      version: ValidatorStateVersion.V2,
      createdAtBlockHeight: 5n,
      createdAtTimestamp: 1_000n,
      originTxHash: HASH_1,
      miningLimitMode: MiningLimitMode.LIMITED,
      maxMiningShareBps: 4_000n,
      policyUpdatedByTxHash: HASH_2,
      policyUpdatedAtBlockHeight: 10n,
      policyUpdatedAtTimestamp: 2_000n,
    };
    expectHex(encodeValidatorState(v2), vectors.state.validatorV2);
    expect(decodeValidatorState(fromHex(vectors.state.validatorV2))).toEqual(v2);
    expectHex(encodeValidatorState(VALIDATOR_STATE_ZERO), vectors.state.validatorZero);
    expect(decodeValidatorState(fromHex(vectors.state.validatorZero))).toEqual(VALIDATOR_STATE_ZERO);
  });

  it('matches NetworkParamsState V1 and V2 and resolves V1 effective defaults', () => {
    const v1 = decodeNetworkParamsState(fromHex(vectors.state.networkParamsV1));
    expect(v1.version).toBe(NetworkParamsStateVersion.V1);
    expect(v1.currentUnlimitedValidatorCount).toBe(v1.currentValidatorCount);
    expect(v1.validatorMiningWindowBlocks).toBe(0n);
    expect(v1.miningRewardVestingBlocks).toBe(0n);
    expect(v1.limitedValidatorMiningSharesBps).toEqual([]);
    expectHex(encodeNetworkParamsState(v1), vectors.state.networkParamsV1);

    const v2 = networkParamsV2();
    expectHex(encodeNetworkParamsState(v2), vectors.state.networkParamsV2);
    const decodedV2 = decodeNetworkParamsState(fromHex(vectors.state.networkParamsV2));
    expect(decodedV2).toEqual(v2);
    expect(Object.isFrozen(decodedV2.limitedValidatorMiningSharesBps)).toBe(true);
    expectHex(encodeNetworkParamsState(NETWORK_PARAMS_STATE_ZERO), vectors.state.networkParamsZero);
    expect(decodeNetworkParamsState(fromHex(vectors.state.networkParamsZero))).toEqual(
      NETWORK_PARAMS_STATE_ZERO
    );
  });

  it('matches canonical mining-window bytes and performs atomic eviction', () => {
    const counts = new Map<Address, bigint>([
      [SECOND_VALIDATOR, 1n],
      [VALIDATOR, 2n],
    ]);
    const state: MiningWindowState = {
      version: MiningWindowStateVersion.V1,
      windowSize: 100n,
      orderedValidatorIdentities: [VALIDATOR, SECOND_VALIDATOR, VALIDATOR],
      validatorBlockCounts: counts,
      lastUpdatedBlockHeight: 12n,
    };
    expectHex(encodeMiningWindowState(state), vectors.state.miningWindow);
    expectMiningWindowEqual(decodeMiningWindowState(fromHex(vectors.state.miningWindow)), state);
    expectHex(encodeMiningWindowState(MINING_WINDOW_STATE_ZERO), vectors.state.miningWindowZero);

    let full = createEmptyMiningWindowState(100n, 9n);
    for (let i = 0; i < 100; i++) {
      full = appendMiningWindow(full, i === 0 ? VALIDATOR : SECOND_VALIDATOR, BigInt(10 + i));
    }
    const evicted = appendMiningWindow(full, SECOND_VALIDATOR, 110n);
    expect(evicted.validatorBlockCounts.has(VALIDATOR)).toBe(false);
    expect(evicted.validatorBlockCounts.get(SECOND_VALIDATOR)).toBe(100n);
  });
});

describe('mining economics consensus validation', () => {
  it('locks all protocol numeric codes', () => {
    expect(MiningLimitMode.LIMITED).toBe(0);
    expect(MiningLimitMode.UNLIMITED).toBe(1);
    expect(TxPayloadVersion.V1).toBe(1);
    expect(TxPayloadVersion.V2).toBe(2);
    expect(ValidatorStateVersion.V1).toBe(1);
    expect(ValidatorStateVersion.V2).toBe(2);
    expect(NetworkParamsStateVersion.V1).toBe(1);
    expect(NetworkParamsStateVersion.V2).toBe(2);
    expect(TxPayloadType.BIP_VALIDATOR_MINING_POLICY_SET).toBe(12);
    expect(BipType.VALIDATOR_MINING_POLICY_SET).toBe(11);
  });

  it('uses the canonical policy and window boundaries', () => {
    expect(() => validateMiningPolicy(MiningLimitMode.LIMITED, 1n)).not.toThrow();
    expect(() =>
      validateMiningPolicy(MiningLimitMode.LIMITED, MAX_VALIDATOR_MINING_SHARE_BPS)
    ).not.toThrow();
    expect(() => validateMiningPolicy(MiningLimitMode.UNLIMITED, 0n)).not.toThrow();
    expect(() => validateMiningPolicy(MiningLimitMode.LIMITED, 0n)).toThrow();
    expect(() => validateMiningPolicy(MiningLimitMode.LIMITED, 4_001n)).toThrow();
    expect(() => validateMiningPolicy(MiningLimitMode.UNLIMITED, 1n)).toThrow();
    expect(() => validateMiningWindowSize(100n)).not.toThrow();
    expect(() => validateMiningWindowSize(10_000n)).not.toThrow();
    expect(() => validateMiningWindowSize(99n)).toThrow();
    expect(() => validateMiningWindowSize(10_001n)).toThrow();
    expect(() => validateMiningRewardVestingBlocks(0n)).not.toThrow();
    expect(() => validateMiningRewardVestingBlocks(1_000_000n)).not.toThrow();
    expect(() => validateMiningRewardVestingBlocks(-1n)).toThrow();
    expect(() => validateMiningRewardVestingBlocks(1_000_001n)).toThrow();
    expect(() => validateLimitedPolicyForWindow(100n, 100n)).not.toThrow();
    expect(() => validateLimitedPolicyForWindow(100n, 99n)).toThrow(
      'must allow at least one block'
    );
  });

  it('rejects non-canonical decoded payloads and state', () => {
    expect(() =>
      decodePayload(fromHex('0xd90c019411111111111111111111111111111111111111110101'), TxVersion.V1)
    ).toThrow();
    expect(() => encodeNetworkParamsState({ ...networkParamsV2(), currentUnlimitedValidatorCount: 0n }))
      .toThrow();
  });

  it('enforces the canonical LIMITED-validator BPS multiset on encode and decode', () => {
    const emptyValidatorSet: NetworkParamsState = {
      ...networkParamsV2(),
      currentValidatorCount: 0n,
      currentUnlimitedValidatorCount: 0n,
      limitedValidatorMiningSharesBps: [],
    };
    expect(decodeNetworkParamsState(encodeNetworkParamsState(emptyValidatorSet))).toEqual(
      emptyValidatorSet
    );

    const duplicateShares: NetworkParamsState = {
      ...networkParamsV2(),
      currentValidatorCount: 4n,
      currentUnlimitedValidatorCount: 1n,
      limitedValidatorMiningSharesBps: [1_000n, 1_000n, 2_000n],
    };
    expect(decodeNetworkParamsState(encodeNetworkParamsState(duplicateShares))).toEqual(
      duplicateShares
    );

    expect(() =>
      encodeNetworkParamsState({
        ...networkParamsV2(),
        currentValidatorCount: 4n,
        currentUnlimitedValidatorCount: 2n,
        limitedValidatorMiningSharesBps: [2_000n, 1_000n],
      })
    ).toThrow('must be sorted');
    expect(() =>
      encodeNetworkParamsState({
        ...networkParamsV2(),
        limitedValidatorMiningSharesBps: [],
      })
    ).toThrow('summary is inconsistent');
    expect(() =>
      encodeNetworkParamsState({
        ...emptyValidatorSet,
        currentUnlimitedValidatorCount: 1n,
      })
    ).toThrow('must be 0 for an empty validator set');
    expect(() =>
      encodeNetworkParamsState({
        ...networkParamsV2(),
        validatorMiningWindowBlocks: 100n,
        limitedValidatorMiningSharesBps: [99n],
      })
    ).toThrow('must allow at least one block');

    const inconsistent = rlpDecode(fromHex(vectors.state.networkParamsV2));
    if (!Array.isArray(inconsistent)) throw new Error('Expected NetworkParamsState list vector');
    inconsistent[16] = [];
    expect(() => decodeNetworkParamsState(rlpEncode(inconsistent))).toThrow(
      'summary is inconsistent'
    );

    const unsorted = rlpDecode(fromHex(vectors.state.networkParamsV2));
    if (!Array.isArray(unsorted)) throw new Error('Expected NetworkParamsState list vector');
    unsorted[11] = fromHex('0x04');
    unsorted[16] = [fromHex('0x07d0'), fromHex('0x03e8')];
    expect(() => decodeNetworkParamsState(rlpEncode(unsorted))).toThrow('must be sorted');
  });

  it('matches hard-coded Java signed-scalar boundaries and rejects non-canonical widths', () => {
    for (const { scalar, value } of javaRlpAdversarialVectors.validLongs) {
      expect(decodeLong(fromHex(scalar))).toBe(value);
    }
    for (const { scalar, error } of javaRlpAdversarialVectors.invalidScalars) {
      expect(() => decodeLong(fromHex(scalar))).toThrow(error);
    }

    expect(decodeInt(fromHex('0x7fffffff'))).toBe(2_147_483_647);
    expect(decodeInt(fromHex('0x80000000'))).toBe(-2_147_483_648);
    expect(decodeInt(fromHex('0xffffffff'))).toBe(-1);
    expect(() => decodeInt(fromHex('0x0100000000'))).toThrow('32-bit width');

    const longWriter = new RLPWriter();
    longWriter.writeLongScalar(-9_223_372_036_854_775_808n);
    expect(bytesToHex(longWriter.encode())).toBe(javaRlpAdversarialVectors.encodedLongMinList);
    expect(() => new RLPWriter().writeLongScalar(9_223_372_036_854_775_808n)).toThrow(
      'signed 64-bit range'
    );
    expect(() => new RLPWriter().writeLongScalar(-9_223_372_036_854_775_809n)).toThrow(
      'signed 64-bit range'
    );
    expect(() => new RLPWriter().writeBigIntegerScalar(-1n)).toThrow('non-negative');
  });

  it('requires Java optional values to be empty or single-scalar RLP lists', () => {
    expect(decodeOptionalBigint([])).toBeNull();
    expect(decodeOptionalBigint([new Uint8Array()])).toBe(0n);
    expect(decodeOptionalBigint([fromHex('0x01')])).toBe(1n);
    expect(() => decodeOptionalBigint(fromHex('0x01'))).toThrow('must be an RLP list');
    expect(() => decodeOptionalBigint([fromHex('0x01'), fromHex('0x02')])).toThrow(
      'exactly one element'
    );
    expect(() => decodeOptionalBigint([[fromHex('0x01')]])).toThrow('must be an RLP scalar');
    expect(() => decodeOptionalBigint([fromHex('0x0001')])).toThrow('minimal encoding');
  });

  it('returns runtime-immutable mining-window snapshots without shared mutable collections', () => {
    const empty = createEmptyMiningWindowState(100n, 5n);
    expect(Object.isFrozen(empty)).toBe(true);
    expect(Object.isFrozen(empty.orderedValidatorIdentities)).toBe(true);
    expect(Object.isFrozen(empty.validatorBlockCounts)).toBe(true);
    expect('set' in empty.validatorBlockCounts).toBe(false);

    expect(() => (empty.orderedValidatorIdentities as Address[]).push(VALIDATOR)).toThrow();
    expect(() =>
      (empty.validatorBlockCounts as Map<Address, bigint>).set(VALIDATOR, 1n)
    ).toThrow();
    expect(empty.orderedValidatorIdentities).toHaveLength(0);
    expect(empty.validatorBlockCounts.size).toBe(0);

    const decoded = decodeMiningWindowState(fromHex(vectors.state.miningWindow));
    expect(() =>
      (decoded.validatorBlockCounts as Map<Address, bigint>).clear()
    ).toThrow();
    expect(decoded.validatorBlockCounts.get(VALIDATOR)).toBe(2n);
    expect(MINING_WINDOW_STATE_ZERO.validatorBlockCounts.size).toBe(0);
  });

  it('uses binary canonical address ordering independent of map insertion order', () => {
    const firstOrder = miningWindowWithCounts(
      new Map<Address, bigint>([
        [VALIDATOR, 2n],
        [SECOND_VALIDATOR, 1n],
      ])
    );
    const reverseOrder = miningWindowWithCounts(
      new Map<Address, bigint>([
        [SECOND_VALIDATOR, 1n],
        [VALIDATOR, 2n],
      ])
    );
    expect(bytesToHex(encodeMiningWindowState(firstOrder))).toBe(
      bytesToHex(encodeMiningWindowState(reverseOrder))
    );
    expectHex(encodeMiningWindowState(reverseOrder), vectors.state.miningWindow);

    const canonicalEntries =
      `d694${'11'.repeat(20)}02d694${'22'.repeat(20)}01`;
    const nonCanonicalEntries =
      `d694${'22'.repeat(20)}01d694${'11'.repeat(20)}02`;
    const nonCanonical = vectors.state.miningWindow.replace(
      canonicalEntries,
      nonCanonicalEntries
    );
    expect(nonCanonical).not.toBe(vectors.state.miningWindow);
    expect(() => decodeMiningWindowState(fromHex(nonCanonical))).toThrow(
      'Mining-window count entries must use canonical address order'
    );
  });
});

function networkParamsV2(): NetworkParamsState {
  return {
    version: NetworkParamsStateVersion.V2,
    blockReward: 10n,
    blockRewardPoolAddress: ZERO_ADDRESS,
    targetMiningTimeMs: 30_000n,
    asertHalfLifeBlocks: 100n,
    asertAnchorHeight: 5n,
    minDifficulty: 10n,
    minTxBaseFee: 1n,
    minTxByteFee: 1n,
    updatedByTxHash: ZERO_HASH,
    currentAuthorityCount: 2n,
    currentValidatorCount: 3n,
    currentUnlimitedValidatorCount: 2n,
    validatorMiningWindowBlocks: 1_000n,
    limitedValidatorMiningSharesBps: [1_000n],
    miningRewardVestingBlocks: 86_400n,
    updatedAtBlockHeight: 5n,
    updatedAtTimestamp: 1_000n,
  };
}

function miningWindowWithCounts(counts: ReadonlyMap<Address, bigint>): MiningWindowState {
  return {
    version: MiningWindowStateVersion.V1,
    windowSize: 100n,
    orderedValidatorIdentities: [VALIDATOR, SECOND_VALIDATOR, VALIDATOR],
    validatorBlockCounts: counts,
    lastUpdatedBlockHeight: 12n,
  };
}

function fromHex(hex: string): Uint8Array {
  return hexToBytes(hex as Hex);
}

function expectHex(actual: Uint8Array, expected: string): void {
  expect(bytesToHex(actual)).toBe(expected);
}

function expectMiningWindowEqual(actual: MiningWindowState, expected: MiningWindowState): void {
  expect(actual.version).toBe(expected.version);
  expect(actual.windowSize).toBe(expected.windowSize);
  expect(actual.orderedValidatorIdentities).toEqual(expected.orderedValidatorIdentities);
  expect([...actual.validatorBlockCounts]).toEqual([
    [VALIDATOR, 2n],
    [SECOND_VALIDATOR, 1n],
  ]);
  expect(actual.lastUpdatedBlockHeight).toBe(expected.lastUpdatedBlockHeight);
}
