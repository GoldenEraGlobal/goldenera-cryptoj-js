/**
 * Payload exports and factory functions.
 */

export type { TxPayload } from './TxPayload';
export type {
  AddressAliasAddPayload,
  AddressAliasRemovePayload, AnyTxPayload, AuthorityAddPayload,
  AuthorityRemovePayload,
  NetworkParamsSetPayload, TokenBurnPayload,
  TokenCreatePayload, TokenMintPayload, TokenUpdatePayload,
  ValidatorAddPayload, ValidatorRemovePayload,
  VotePayload
} from './types';

import { BipVoteType, TxPayloadType } from '../../enums';
import type { Address } from '../../types';
import type {
  AddressAliasAddPayload,
  AddressAliasRemovePayload,
  AuthorityAddPayload,
  AuthorityRemovePayload,
  NetworkParamsSetPayload,
  TokenBurnPayload,
  TokenCreatePayload,
  TokenMintPayload,
  TokenUpdatePayload,
  ValidatorAddPayload,
  ValidatorRemovePayload,
  VotePayload,
} from './types';

// ============================================
// Factory Functions
// ============================================

/**
 * Create a Token Mint payload.
 */
export function createTokenMintPayload(
  tokenAddress: Address,
  recipient: Address,
  amount: bigint
): TokenMintPayload {
  return {
    payloadType: TxPayloadType.BIP_TOKEN_MINT,
    tokenAddress,
    recipient,
    amount,
  };
}

/**
 * Create a Token Burn payload.
 */
export function createTokenBurnPayload(
  tokenAddress: Address,
  sender: Address,
  amount: bigint
): TokenBurnPayload {
  return {
    payloadType: TxPayloadType.BIP_TOKEN_BURN,
    tokenAddress,
    sender,
    amount,
  };
}

/**
 * Create a Token Create payload.
 */
export function createTokenCreatePayload(params: {
  name: string;
  smallestUnitName: string;
  numberOfDecimals: number;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  maxSupply?: bigint | null;
  userBurnable?: boolean;
}): TokenCreatePayload {
  return {
    payloadType: TxPayloadType.BIP_TOKEN_CREATE,
    name: params.name,
    smallestUnitName: params.smallestUnitName,
    numberOfDecimals: params.numberOfDecimals,
    websiteUrl: params.websiteUrl ?? null,
    logoUrl: params.logoUrl ?? null,
    maxSupply: params.maxSupply ?? null,
    userBurnable: params.userBurnable ?? false,
  };
}

/**
 * Create a Token Update payload.
 */
export function createTokenUpdatePayload(
  tokenAddress: Address,
  updates: {
    name?: string | null;
    smallestUnitName?: string | null;
    websiteUrl?: string | null;
    logoUrl?: string | null;
  }
): TokenUpdatePayload {
  return {
    payloadType: TxPayloadType.BIP_TOKEN_UPDATE,
    tokenAddress,
    name: updates.name ?? null,
    smallestUnitName: updates.smallestUnitName ?? null,
    websiteUrl: updates.websiteUrl ?? null,
    logoUrl: updates.logoUrl ?? null,
  };
}

/**
 * Create a Vote payload.
 */
export function createVotePayload(voteType: BipVoteType): VotePayload {
  return {
    payloadType: TxPayloadType.BIP_VOTE,
    voteType,
  };
}

/**
 * Create an approval vote payload.
 */
export function createApprovalVote(): VotePayload {
  return createVotePayload(BipVoteType.APPROVAL);
}

/**
 * Create a disapproval vote payload.
 */
export function createDisapprovalVote(): VotePayload {
  return createVotePayload(BipVoteType.DISAPPROVAL);
}

/**
 * Create an Add Address Alias payload.
 */
export function createAddressAliasAddPayload(address: Address, alias: string): AddressAliasAddPayload {
  return {
    payloadType: TxPayloadType.BIP_ADDRESS_ALIAS_ADD,
    address,
    alias,
  };
}

/**
 * Create a Remove Address Alias payload.
 */
export function createAddressAliasRemovePayload(alias: string): AddressAliasRemovePayload {
  return {
    payloadType: TxPayloadType.BIP_ADDRESS_ALIAS_REMOVE,
    alias,
  };
}

/**
 * Create an Authority Add payload.
 */
export function createAuthorityAddPayload(authorityAddress: Address): AuthorityAddPayload {
  return {
    payloadType: TxPayloadType.BIP_AUTHORITY_ADD,
    authorityAddress,
  };
}

/**
 * Create an Authority Remove payload.
 */
export function createAuthorityRemovePayload(authorityAddress: Address): AuthorityRemovePayload {
  return {
    payloadType: TxPayloadType.BIP_AUTHORITY_REMOVE,
    authorityAddress,
  };
}

/**
 * Create an Validator Add payload.
 */
export function createValidatorAddPayload(validatorAddress: Address): ValidatorAddPayload {
  return {
    payloadType: TxPayloadType.BIP_VALIDATOR_ADD,
    validatorAddress,
  };
}

/**
 * Create an Validator Remove payload.
 */
export function createValidatorRemovePayload(validatorAddress: Address): ValidatorRemovePayload {
  return {
    payloadType: TxPayloadType.BIP_VALIDATOR_REMOVE,
    validatorAddress,
  };
}

/**
 * Create a Network Params Set payload.
 */
export function createNetworkParamsSetPayload(params: {
  blockReward?: bigint | null;
  blockRewardPoolAddress?: Address | null;
  targetMiningTimeMs?: bigint | null;
  asertHalfLifeBlocks?: bigint | null;
  minDifficulty?: bigint | null;
  minTxBaseFee?: bigint | null;
  minTxByteFee?: bigint | null;
}): NetworkParamsSetPayload {
  return {
    payloadType: TxPayloadType.BIP_NETWORK_PARAMS_SET,
    blockReward: params.blockReward ?? null,
    blockRewardPoolAddress: params.blockRewardPoolAddress ?? null,
    targetMiningTimeMs: params.targetMiningTimeMs ?? null,
    asertHalfLifeBlocks: params.asertHalfLifeBlocks ?? null,
    minDifficulty: params.minDifficulty ?? null,
    minTxBaseFee: params.minTxBaseFee ?? null,
    minTxByteFee: params.minTxByteFee ?? null,
  };
}
