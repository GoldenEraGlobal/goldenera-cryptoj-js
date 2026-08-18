/**
 * BIP Payload type definitions.
 */

import type {
  BipVoteType,
  MiningLimitMode,
  TxPayloadType,
  TxPayloadVersion,
} from '../../enums';
import type { Address } from '../../types';
import type { TxPayload } from './TxPayload';

// ============================================
// Token Payloads
// ============================================

/**
 * Token Mint payload - creates new tokens.
 */
export interface TokenMintPayload extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_TOKEN_MINT;
  readonly payloadVersion: TxPayloadVersion.V1;
  readonly tokenAddress: Address;
  readonly recipient: Address;
  readonly amount: bigint;
}

/**
 * Token Burn payload - destroys tokens.
 */
export interface TokenBurnPayload extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_TOKEN_BURN;
  readonly payloadVersion: TxPayloadVersion.V1;
  readonly tokenAddress: Address;
  readonly sender: Address;
  readonly amount: bigint;
}

/**
 * Token Create payload - creates a new token type.
 */
export interface TokenCreatePayload extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_TOKEN_CREATE;
  readonly payloadVersion: TxPayloadVersion.V1;
  readonly name: string;
  readonly smallestUnitName: string;
  readonly numberOfDecimals: number;
  readonly websiteUrl: string | null;
  readonly logoUrl: string | null;
  readonly maxSupply: bigint | null;
  readonly userBurnable: boolean;
}

/**
 * Token Update payload - updates token metadata.
 */
export interface TokenUpdatePayload extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_TOKEN_UPDATE;
  readonly payloadVersion: TxPayloadVersion.V1;
  readonly tokenAddress: Address;
  readonly name: string | null;
  readonly smallestUnitName: string | null;
  readonly websiteUrl: string | null;
  readonly logoUrl: string | null;
}

// ============================================
// Vote Payload
// ============================================

/**
 * BIP Vote payload - votes on a BIP proposal.
 */
export interface VotePayload extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_VOTE;
  readonly payloadVersion: TxPayloadVersion.V1;
  readonly voteType: BipVoteType;
}

// ============================================
// Address Alias Payloads
// ============================================

/**
 * Add address alias payload.
 */
export interface AddressAliasAddPayload extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_ADDRESS_ALIAS_ADD;
  readonly payloadVersion: TxPayloadVersion.V1;
  readonly address: Address;
  readonly alias: string;
}

/**
 * Remove address alias payload.
 */
export interface AddressAliasRemovePayload extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_ADDRESS_ALIAS_REMOVE;
  readonly payloadVersion: TxPayloadVersion.V1;
  readonly alias: string;
}

// ============================================
// Authority Payloads
// ============================================

/**
 * Add authority payload.
 */
export interface AuthorityAddPayload extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_AUTHORITY_ADD;
  readonly payloadVersion: TxPayloadVersion.V1;
  readonly authorityAddress: Address;
}

/**
 * Remove authority payload.
 */
export interface AuthorityRemovePayload extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_AUTHORITY_REMOVE;
  readonly payloadVersion: TxPayloadVersion.V1;
  readonly authorityAddress: Address;
}

// ============================================
// Validator Payloads
// ============================================

/**
 * Add validator payload.
 */
export interface ValidatorAddPayloadV1 extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_VALIDATOR_ADD;
  readonly payloadVersion: TxPayloadVersion.V1;
  readonly validatorAddress: Address;
}

export interface ValidatorAddPayloadV2 extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_VALIDATOR_ADD;
  readonly payloadVersion: TxPayloadVersion.V2;
  readonly validatorAddress: Address;
  readonly miningLimitMode: MiningLimitMode;
  readonly maxMiningShareBps: bigint;
}

export type ValidatorAddPayload = ValidatorAddPayloadV1 | ValidatorAddPayloadV2;

/**
 * Remove validator payload.
 */
export interface ValidatorRemovePayload extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_VALIDATOR_REMOVE;
  readonly payloadVersion: TxPayloadVersion.V1;
  readonly validatorAddress: Address;
}

// ============================================
// Network Params Payload
// ============================================

/**
 * Set network parameters payload.
 */
export interface NetworkParamsSetPayloadV1 extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_NETWORK_PARAMS_SET;
  readonly payloadVersion: TxPayloadVersion.V1;
  readonly blockReward: bigint | null;
  readonly blockRewardPoolAddress: Address | null;
  readonly targetMiningTimeMs: bigint | null;
  readonly asertHalfLifeBlocks: bigint | null;
  readonly minDifficulty: bigint | null;
  readonly minTxBaseFee: bigint | null;
  readonly minTxByteFee: bigint | null;
}

export interface NetworkParamsSetPayloadV2 extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_NETWORK_PARAMS_SET;
  readonly payloadVersion: TxPayloadVersion.V2;
  readonly blockReward: bigint | null;
  readonly blockRewardPoolAddress: Address | null;
  readonly targetMiningTimeMs: bigint | null;
  readonly asertHalfLifeBlocks: bigint | null;
  readonly minDifficulty: bigint | null;
  readonly minTxBaseFee: bigint | null;
  readonly minTxByteFee: bigint | null;
  readonly validatorMiningWindowBlocks: bigint | null;
  readonly miningRewardVestingBlocks: bigint | null;
}

export type NetworkParamsSetPayload = NetworkParamsSetPayloadV1 | NetworkParamsSetPayloadV2;

export interface ValidatorMiningPolicySetPayload extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_VALIDATOR_MINING_POLICY_SET;
  readonly payloadVersion: TxPayloadVersion.V1;
  readonly validatorAddress: Address;
  readonly miningLimitMode: MiningLimitMode;
  readonly maxMiningShareBps: bigint;
}

// ============================================
// Union type of all payloads
// ============================================

export type AnyTxPayload =
  | TokenMintPayload
  | TokenBurnPayload
  | TokenCreatePayload
  | TokenUpdatePayload
  | VotePayload
  | AddressAliasAddPayload
  | AddressAliasRemovePayload
  | AuthorityAddPayload
  | AuthorityRemovePayload
  | ValidatorAddPayload
  | ValidatorRemovePayload
  | NetworkParamsSetPayload
  | ValidatorMiningPolicySetPayload;
