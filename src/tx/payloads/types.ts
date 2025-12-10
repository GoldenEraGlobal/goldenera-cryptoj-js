/**
 * BIP Payload type definitions.
 */

import type { BipVoteType, TxPayloadType } from '../../enums';
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
  readonly tokenAddress: Address;
  readonly recipient: Address;
  readonly amount: bigint;
}

/**
 * Token Burn payload - destroys tokens.
 */
export interface TokenBurnPayload extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_TOKEN_BURN;
  readonly tokenAddress: Address;
  readonly sender: Address;
  readonly amount: bigint;
}

/**
 * Token Create payload - creates a new token type.
 */
export interface TokenCreatePayload extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_TOKEN_CREATE;
  readonly name: string;
  readonly smallestUnitName: string;
  readonly numberOfDecimals: number;
  readonly websiteUrl: string;
  readonly logoUrl: string;
  readonly maxSupply: bigint;
  readonly userBurnable: boolean;
}

/**
 * Token Update payload - updates token metadata.
 */
export interface TokenUpdatePayload extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_TOKEN_UPDATE;
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
  readonly address: Address;
  readonly alias: string;
}

/**
 * Remove address alias payload.
 */
export interface AddressAliasRemovePayload extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_ADDRESS_ALIAS_REMOVE;
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
  readonly authorityAddress: Address;
}

/**
 * Remove authority payload.
 */
export interface AuthorityRemovePayload extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_AUTHORITY_REMOVE;
  readonly authorityAddress: Address;
}

// ============================================
// Network Params Payload
// ============================================

/**
 * Set network parameters payload.
 */
export interface NetworkParamsSetPayload extends TxPayload {
  readonly payloadType: TxPayloadType.BIP_NETWORK_PARAMS_SET;
  readonly blockReward: bigint | null;
  readonly blockRewardPoolAddress: Address | null;
  readonly targetMiningTimeMs: bigint | null;
  readonly asertHalfLifeBlocks: bigint | null;
  readonly minDifficulty: bigint | null;
  readonly minTxBaseFee: bigint | null;
  readonly minTxByteFee: bigint | null;
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
  | NetworkParamsSetPayload;
