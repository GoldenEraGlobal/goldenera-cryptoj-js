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
// Payload and consensus versions
// ============================================

/** Version of an individual payload. This is independent from TxVersion. */
export enum TxPayloadVersion {
  V1 = 1,
  V2 = 2,
}

export function txPayloadVersionFromCode(code: number): TxPayloadVersion {
  if (code === 1) return TxPayloadVersion.V1;
  if (code === 2) return TxPayloadVersion.V2;
  throw new Error(`Unknown TxPayloadVersion code: ${code}`);
}

export enum MiningLimitMode {
  LIMITED = 0,
  UNLIMITED = 1,
}

export function miningLimitModeFromCode(code: number): MiningLimitMode {
  if (code === 0) return MiningLimitMode.LIMITED;
  if (code === 1) return MiningLimitMode.UNLIMITED;
  throw new Error(`Unknown MiningLimitMode code: ${code}`);
}

export enum ValidatorStateVersion {
  V1 = 1,
  V2 = 2,
}

export enum NetworkParamsStateVersion {
  V1 = 1,
  V2 = 2,
}

export enum MiningWindowStateVersion {
  V1 = 1,
}

export enum AccountBalanceStateVersion {
  V1 = 1,
  V2 = 2,
}

export enum MiningRewardMaturityStateVersion {
  V1 = 1,
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
  BIP_VALIDATOR_ADD = 10,
  BIP_VALIDATOR_REMOVE = 11,
  BIP_VALIDATOR_MINING_POLICY_SET = 12,
}

export function txPayloadTypeFromCode(code: number): TxPayloadType {
  const types = Object.values(TxPayloadType).filter((v) => typeof v === 'number') as number[];
  if (types.includes(code)) {
    return code as TxPayloadType;
  }
  throw new Error(`Unknown TxPayloadType code: ${code}`);
}

// ============================================
// Stored BIP type
// ============================================

export enum BipType {
  UNKNOWN = -1,
  AUTHORITY_ADD = 0,
  AUTHORITY_REMOVE = 1,
  ADDRESS_ALIAS_ADD = 2,
  ADDRESS_ALIAS_REMOVE = 3,
  TOKEN_CREATE = 4,
  TOKEN_UPDATE = 5,
  TOKEN_MINT = 6,
  TOKEN_BURN = 7,
  NETWORK_PARAMS_SET = 8,
  VALIDATOR_ADD = 9,
  VALIDATOR_REMOVE = 10,
  VALIDATOR_MINING_POLICY_SET = 11,
}

export function bipTypeFromCode(code: number): BipType {
  const types = Object.values(BipType).filter((value) => typeof value === 'number') as number[];
  if (types.includes(code)) return code as BipType;
  throw new Error(`Unknown BipType code: ${code}`);
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
