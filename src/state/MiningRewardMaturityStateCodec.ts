import { MiningRewardMaturityStateVersion } from '../enums';
import { RLPWriter } from '../serialization/rlp';
import type { Address } from '../types';
import { hexToBytes } from '../types';
import type { MiningRewardMaturityState } from './types';
import { addressAt, bigintAt, decodeRlpList, listAt } from './codecHelpers';

export const MINING_REWARD_MATURITY_STATE_ZERO: MiningRewardMaturityState =
  immutableMiningRewardMaturityState(new Map());

export function createMiningRewardMaturityState(
  rewards: ReadonlyMap<Address, bigint> = new Map()
): MiningRewardMaturityState {
  return immutableMiningRewardMaturityState(rewards);
}

export function addMiningRewardMaturity(
  state: MiningRewardMaturityState,
  address: Address,
  amount: bigint
): MiningRewardMaturityState {
  validateMiningRewardMaturityState(state);
  if (amount <= 0n) throw new Error('Mining reward maturity amount must be positive');
  const rewards = new Map(state.rewards);
  const normalized = normalizeAddress(address);
  rewards.set(normalized, (rewards.get(normalized) ?? 0n) + amount);
  return immutableMiningRewardMaturityState(rewards);
}

export function validateMiningRewardMaturityState(state: MiningRewardMaturityState): void {
  if (state.version !== MiningRewardMaturityStateVersion.V1) {
    throw new Error(`Unsupported MiningRewardMaturityState version: ${String(state.version)}`);
  }
  const addresses = new Set<Address>();
  for (const [address, amount] of state.rewards) {
    if (amount <= 0n) throw new Error('Mining reward maturities require a positive amount');
    const normalized = normalizeAddress(address);
    if (addresses.has(normalized)) {
      throw new Error('Mining reward maturity addresses must be unique');
    }
    addresses.add(normalized);
  }
}

export function encodeMiningRewardMaturityState(state: MiningRewardMaturityState): Uint8Array {
  validateMiningRewardMaturityState(state);
  const writer = new RLPWriter();
  writer.writeIntScalar(state.version);
  writer.writeList((entries) => {
    const sorted = [...state.rewards.entries()]
      .map(([address, amount]) => [normalizeAddress(address), amount] as const)
      .sort(([left], [right]) => compareAddresses(left, right));
    for (const [address, amount] of sorted) {
      entries.writeList((entry) => {
        entry.writeBytes(hexToBytes(address));
        entry.writeBigIntegerScalar(amount);
      });
    }
  });
  return writer.encode();
}

export function decodeMiningRewardMaturityState(data: Uint8Array): MiningRewardMaturityState {
  const decoded = decodeRlpList(data, 'MiningRewardMaturityState', 2);
  const version = Number(
    bigintAt(decoded, 0, 'MiningRewardMaturityState version')
  ) as MiningRewardMaturityStateVersion;
  if (version !== MiningRewardMaturityStateVersion.V1) {
    throw new Error(`Unsupported MiningRewardMaturityState version: ${version}`);
  }
  const rewards = new Map<Address, bigint>();
  let previous: Address | null = null;
  for (const value of listAt(decoded, 1, 'rewards')) {
    if (!Array.isArray(value) || value.length !== 2) {
      throw new Error('Mining reward maturity entry must have exactly two fields');
    }
    const address = normalizeAddress(addressAt(value, 0, 'reward address'));
    if (previous !== null && compareAddresses(previous, address) >= 0) {
      throw new Error('Mining reward maturity entries must use canonical address order');
    }
    const amount = bigintAt(value, 1, 'reward amount');
    if (amount <= 0n || rewards.has(address)) {
      throw new Error('Mining reward maturity amounts must be positive and unique');
    }
    rewards.set(address, amount);
    previous = address;
  }
  return immutableMiningRewardMaturityState(rewards);
}

function immutableMiningRewardMaturityState(
  rewards: ReadonlyMap<Address, bigint>
): MiningRewardMaturityState {
  const normalized = new Map<Address, bigint>();
  for (const [address, amount] of rewards) {
    const key = normalizeAddress(address);
    if (normalized.has(key)) throw new Error('Mining reward maturity addresses must be unique');
    normalized.set(key, amount);
  }
  const state = Object.freeze({
    version: MiningRewardMaturityStateVersion.V1,
    rewards: immutableReadonlyMap(normalized),
  });
  validateMiningRewardMaturityState(state);
  return state;
}

function immutableReadonlyMap<K, V>(source: ReadonlyMap<K, V>): ReadonlyMap<K, V> {
  const data = new Map(source);
  let view: ReadonlyMap<K, V>;
  view = Object.freeze({
    get size(): number { return data.size; },
    has: (key: K): boolean => data.has(key),
    get: (key: K): V | undefined => data.get(key),
    entries: (): MapIterator<[K, V]> => data.entries(),
    keys: (): MapIterator<K> => data.keys(),
    values: (): MapIterator<V> => data.values(),
    forEach: (callback: (value: V, key: K, map: ReadonlyMap<K, V>) => void, thisArg?: unknown): void => {
      data.forEach((value, key) => callback.call(thisArg, value, key, view));
    },
    [Symbol.iterator]: (): MapIterator<[K, V]> => data.entries(),
    get [Symbol.toStringTag](): string { return 'ReadonlyMap'; },
  });
  return view;
}

function normalizeAddress(address: Address): Address {
  return address.toLowerCase() as Address;
}

function compareAddresses(left: Address, right: Address): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
