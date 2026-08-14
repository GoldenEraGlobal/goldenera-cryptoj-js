import { MiningWindowStateVersion } from '../enums';
import { validateMiningWindowSize } from '../consensus/MiningConsensusRules';
import { RLPWriter } from '../serialization/rlp';
import type { Address } from '../types';
import { hexToBytes } from '../types';
import type { MiningWindowState } from './types';
import {
  addressAt,
  bigintAt,
  decodeRlpList,
  listAt,
  longAt,
} from './codecHelpers';

export const MINING_WINDOW_STATE_ZERO: MiningWindowState = Object.freeze({
  version: MiningWindowStateVersion.V1,
  windowSize: 0n,
  orderedValidatorIdentities: Object.freeze([]) as readonly Address[],
  validatorBlockCounts: new Map<Address, bigint>(),
  lastUpdatedBlockHeight: 0n,
});

export function createEmptyMiningWindowState(
  windowSize: bigint,
  lastUpdatedBlockHeight: bigint
): MiningWindowState {
  validateMiningWindowSize(windowSize);
  return {
    version: MiningWindowStateVersion.V1,
    windowSize,
    orderedValidatorIdentities: [],
    validatorBlockCounts: new Map(),
    lastUpdatedBlockHeight,
  };
}

/** Return a new state after atomically evicting (when full) and appending. */
export function appendMiningWindow(
  state: MiningWindowState,
  validatorIdentity: Address,
  blockHeight: bigint
): MiningWindowState {
  validateMiningWindowState(state);
  validateMiningWindowSize(state.windowSize);
  const validator = normalizeAddress(validatorIdentity);
  const ordered = state.orderedValidatorIdentities.map(normalizeAddress);
  const counts = normalizedCounts(state.validatorBlockCounts);
  if (BigInt(ordered.length) === state.windowSize) {
    const evicted = ordered.shift()!;
    const remaining = (counts.get(evicted) ?? 0n) - 1n;
    if (remaining === 0n) counts.delete(evicted);
    else counts.set(evicted, remaining);
  }
  ordered.push(validator);
  counts.set(validator, (counts.get(validator) ?? 0n) + 1n);
  return {
    version: state.version,
    windowSize: state.windowSize,
    orderedValidatorIdentities: ordered,
    validatorBlockCounts: counts,
    lastUpdatedBlockHeight: blockHeight,
  };
}

export function validateMiningWindowState(state: MiningWindowState): void {
  if (state.version !== MiningWindowStateVersion.V1) {
    throw new Error(`Unsupported MiningWindowState version: ${String(state.version)}`);
  }
  if (
    state.windowSize === 0n &&
    state.orderedValidatorIdentities.length === 0 &&
    state.validatorBlockCounts.size === 0 &&
    state.lastUpdatedBlockHeight === 0n
  ) {
    return;
  }
  validateMiningWindowSize(state.windowSize);
  if (BigInt(state.orderedValidatorIdentities.length) > state.windowSize) {
    throw new Error('Mining window contains more entries than windowSize');
  }
  const derived = new Map<Address, bigint>();
  for (const identity of state.orderedValidatorIdentities) {
    const normalized = normalizeAddress(identity);
    derived.set(normalized, (derived.get(normalized) ?? 0n) + 1n);
  }
  const supplied = normalizedCounts(state.validatorBlockCounts);
  if (derived.size !== supplied.size) {
    throw new Error('Mining-window count map does not match ordered identities');
  }
  for (const [address, count] of derived) {
    if (supplied.get(address) !== count) {
      throw new Error('Mining-window count map does not match ordered identities');
    }
  }
}

export function encodeMiningWindowState(state: MiningWindowState): Uint8Array {
  validateMiningWindowState(state);
  const writer = new RLPWriter();
  writer.writeIntScalar(state.version);
  writer.writeLongScalar(state.windowSize);
  writer.writeList((identities) => {
    for (const address of state.orderedValidatorIdentities) {
      identities.writeBytes(hexToBytes(normalizeAddress(address)));
    }
  });
  writer.writeList((entries) => {
    const sorted = [...normalizedCounts(state.validatorBlockCounts).entries()].sort(([a], [b]) =>
      compareCanonicalAddresses(a, b)
    );
    for (const [address, count] of sorted) {
      entries.writeList((entry) => {
        entry.writeBytes(hexToBytes(address));
        entry.writeLongScalar(count);
      });
    }
  });
  writer.writeLongScalar(state.lastUpdatedBlockHeight);
  return writer.encode();
}

export function decodeMiningWindowState(data: Uint8Array): MiningWindowState {
  const decoded = decodeRlpList(data, 'MiningWindowState', 5);
  const version = Number(bigintAt(decoded, 0, 'MiningWindowState version')) as MiningWindowStateVersion;
  if (version !== MiningWindowStateVersion.V1) {
    throw new Error(`Unsupported MiningWindowState version: ${version}`);
  }
  const identities = listAt(decoded, 2, 'orderedValidatorIdentities').map((_, index, list) =>
    addressAt(list, index, 'validator identity')
  );
  const countEntries = listAt(decoded, 3, 'validatorBlockCounts');
  const counts = new Map<Address, bigint>();
  let previousAddress: Address | null = null;
  for (const value of countEntries) {
    if (!Array.isArray(value) || value.length !== 2) {
      throw new Error('Mining-window count entry must have exactly two fields');
    }
    const address = addressAt(value, 0, 'validator count address');
    if (previousAddress !== null && compareCanonicalAddresses(previousAddress, address) >= 0) {
      throw new Error('Mining-window count entries must use canonical address order');
    }
    const count = longAt(value, 1, 'validator block count');
    if (count < 1n || counts.has(address)) {
      throw new Error('Mining-window counts must be positive and unique');
    }
    counts.set(address, count);
    previousAddress = address;
  }
  const state: MiningWindowState = {
    version,
    windowSize: longAt(decoded, 1, 'windowSize'),
    orderedValidatorIdentities: identities,
    validatorBlockCounts: counts,
    lastUpdatedBlockHeight: longAt(decoded, 4, 'lastUpdatedBlockHeight'),
  };
  validateMiningWindowState(state);
  return state;
}

function normalizeAddress(address: Address): Address {
  return address.toLowerCase() as Address;
}

function normalizedCounts(counts: ReadonlyMap<Address, bigint>): Map<Address, bigint> {
  const normalized = new Map<Address, bigint>();
  for (const [address, count] of counts) {
    if (count < 1n) throw new Error('Mining-window counts must be positive and unique');
    const key = normalizeAddress(address);
    if (normalized.has(key)) throw new Error('Mining-window counts must be positive and unique');
    normalized.set(key, count);
  }
  return normalized;
}

/** ASCII/code-unit lexical ordering, matching Java String.compareTo without locale/ICU input. */
function compareCanonicalAddresses(left: Address, right: Address): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
