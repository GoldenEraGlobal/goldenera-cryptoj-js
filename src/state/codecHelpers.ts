import type { Address, Hash } from '../types';
import {
  decodeAddress,
  decodeBigint,
  decodeHash,
  decodeLong,
  decodeOptionalBigint,
  rlpDecode,
} from '../serialization/rlp';

export type DecodedRlp = Uint8Array | DecodedRlp[];

export function decodeRlpTopLevelList(data: Uint8Array, name: string): DecodedRlp[] {
  if (data.length === 0) throw new Error(`Cannot decode empty ${name} bytes`);
  const decoded = rlpDecode(data);
  if (!Array.isArray(decoded)) throw new Error(`${name} must be an RLP list`);
  return decoded;
}

export function decodeRlpList(data: Uint8Array, name: string, fields: number): DecodedRlp[] {
  const decoded = decodeRlpTopLevelList(data, name);
  if (decoded.length !== fields) {
    throw new Error(`${name} must have exactly ${fields} fields`);
  }
  return decoded;
}

export function bytesAt(list: DecodedRlp[], index: number, name: string): Uint8Array {
  const value = list[index];
  if (!(value instanceof Uint8Array)) throw new Error(`${name} must be an RLP scalar`);
  return value;
}

export function listAt(list: DecodedRlp[], index: number, name: string): DecodedRlp[] {
  const value = list[index];
  if (!Array.isArray(value)) throw new Error(`${name} must be an RLP list`);
  return value;
}

export function bigintAt(list: DecodedRlp[], index: number, name: string): bigint {
  return decodeBigint(bytesAt(list, index, name));
}

export function longAt(list: DecodedRlp[], index: number, name: string): bigint {
  return decodeLong(bytesAt(list, index, name));
}

export function optionalBigintAt(list: DecodedRlp[], index: number): bigint | null {
  return decodeOptionalBigint(list[index]);
}

export function addressAt(list: DecodedRlp[], index: number, name: string): Address {
  return decodeAddress(bytesAt(list, index, name));
}

export function hashAt(list: DecodedRlp[], index: number, name: string): Hash {
  return decodeHash(bytesAt(list, index, name));
}
