/**
 * Enum definitions matching Java implementation.
 * Each enum has a numeric code for RLP serialization.
 */

// ============================================
// Network
// ============================================

export enum Network {
  MAINNET = 0,
  TESTNET = 1,
}

export function networkFromCode(code: number): Network {
  if (code === 0) return Network.MAINNET;
  if (code === 1) return Network.TESTNET;
  throw new Error(`Unknown Network code: ${code}`);
}

// ============================================
// TxVersion
// ============================================

export enum TxVersion {
  V1 = 1,
}

export function txVersionFromCode(code: number): TxVersion {
  if (code === 1) return TxVersion.V1;
  throw new Error(`Unknown TxVersion code: ${code}`);
}

// ============================================
// TxType
// ============================================

export enum TxType {
  TRANSFER = 0,
  BIP_CREATE = 1,
  BIP_VOTE = 2,
}

export function txTypeFromCode(code: number): TxType {
  if (code === 0) return TxType.TRANSFER;
  if (code === 1) return TxType.BIP_CREATE;
  if (code === 2) return TxType.BIP_VOTE;
  throw new Error(`Unknown TxType code: ${code}`);
}

// ============================================
// TxPayloadType
// ============================================

export enum TxPayloadType {
  BIP_ADDRESS_ALIAS_ADD = 0,
  BIP_ADDRESS_ALIAS_REMOVE = 1,
  BIP_AUTHORITY_ADD = 2,
  BIP_AUTHORITY_REMOVE = 3,
  BIP_NETWORK_PARAMS_SET = 4,
  BIP_TOKEN_BURN = 5,
  BIP_TOKEN_CREATE = 6,
  BIP_TOKEN_MINT = 7,
  BIP_TOKEN_UPDATE = 8,
  BIP_VOTE = 9,
}

export function txPayloadTypeFromCode(code: number): TxPayloadType {
  const types = Object.values(TxPayloadType).filter((v) => typeof v === 'number') as number[];
  if (types.includes(code)) {
    return code as TxPayloadType;
  }
  throw new Error(`Unknown TxPayloadType code: ${code}`);
}

// ============================================
// BipVoteType
// ============================================

export enum BipVoteType {
  DISAPPROVAL = 0,
  APPROVAL = 1,
}

export function bipVoteTypeFromCode(code: number): BipVoteType {
  if (code === 0) return BipVoteType.DISAPPROVAL;
  if (code === 1) return BipVoteType.APPROVAL;
  throw new Error(`Unknown BipVoteType code: ${code}`);
}
