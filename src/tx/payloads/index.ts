/**
 * Payload exports and factory functions.
 */

export type { TxPayload } from './TxPayload';
export type {
  AddressAliasAddPayload,
  AddressAliasRemovePayload, AnyTxPayload, AuthorityAddPayload,
  AuthorityRemovePayload,
  NetworkParamsSetPayload, NetworkParamsSetPayloadV1, NetworkParamsSetPayloadV2, TokenBurnPayload,
  TokenCreatePayload, TokenMintPayload, TokenUpdatePayload,
  ValidatorAddPayload, ValidatorAddPayloadV1, ValidatorAddPayloadV2,
  ValidatorMiningPolicySetPayload, ValidatorRemovePayload,
  VotePayload
} from './types';

import { MiningLimitMode, BipVoteType, TxPayloadType, TxPayloadVersion } from '../../enums';
import { validateMiningPolicy, validateMiningWindowSize } from '../../consensus/MiningConsensusRules';
import type { Address } from '../../types';
import type {
  AddressAliasAddPayload,
  AddressAliasRemovePayload,
  AuthorityAddPayload,
  AuthorityRemovePayload,
  NetworkParamsSetPayloadV1,
  NetworkParamsSetPayloadV2,
  TokenBurnPayload,
  TokenCreatePayload,
  TokenMintPayload,
  TokenUpdatePayload,
  ValidatorAddPayloadV1,
  ValidatorAddPayloadV2,
  ValidatorMiningPolicySetPayload,
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
    payloadVersion: TxPayloadVersion.V1,
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
    payloadVersion: TxPayloadVersion.V1,
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
    payloadVersion: TxPayloadVersion.V1,
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
    payloadVersion: TxPayloadVersion.V1,
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
    payloadVersion: TxPayloadVersion.V1,
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
    payloadVersion: TxPayloadVersion.V1,
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
    payloadVersion: TxPayloadVersion.V1,
    alias,
  };
}

/**
 * Create an Authority Add payload.
 */
export function createAuthorityAddPayload(authorityAddress: Address): AuthorityAddPayload {
  return {
    payloadType: TxPayloadType.BIP_AUTHORITY_ADD,
    payloadVersion: TxPayloadVersion.V1,
    authorityAddress,
  };
}

/**
 * Create an Authority Remove payload.
 */
export function createAuthorityRemovePayload(authorityAddress: Address): AuthorityRemovePayload {
  return {
    payloadType: TxPayloadType.BIP_AUTHORITY_REMOVE,
    payloadVersion: TxPayloadVersion.V1,
    authorityAddress,
  };
}

/**
 * Create an Validator Add payload.
 */
export function createValidatorAddPayload(
  validatorAddress: Address,
  policy: { miningLimitMode: MiningLimitMode; maxMiningShareBps: bigint }
): ValidatorAddPayloadV2 {
  validateMiningPolicy(policy.miningLimitMode, policy.maxMiningShareBps);
  return {
    payloadType: TxPayloadType.BIP_VALIDATOR_ADD,
    payloadVersion: TxPayloadVersion.V2,
    validatorAddress,
    miningLimitMode: policy.miningLimitMode,
    maxMiningShareBps: policy.maxMiningShareBps,
  };
}

/** Build the historical implicit-V1 validator-add payload. */
export function createLegacyValidatorAddPayload(validatorAddress: Address): ValidatorAddPayloadV1 {
  return {
    payloadType: TxPayloadType.BIP_VALIDATOR_ADD,
    payloadVersion: TxPayloadVersion.V1,
    validatorAddress,
  };
}

/**
 * Create an Validator Remove payload.
 */
export function createValidatorRemovePayload(validatorAddress: Address): ValidatorRemovePayload {
  return {
    payloadType: TxPayloadType.BIP_VALIDATOR_REMOVE,
    payloadVersion: TxPayloadVersion.V1,
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
  validatorMiningWindowBlocks?: bigint | null;
}): NetworkParamsSetPayloadV2 {
  const validatorMiningWindowBlocks = params.validatorMiningWindowBlocks ?? null;
  if (validatorMiningWindowBlocks !== null) {
    validateMiningWindowSize(validatorMiningWindowBlocks);
  }
  return {
    payloadType: TxPayloadType.BIP_NETWORK_PARAMS_SET,
    payloadVersion: TxPayloadVersion.V2,
    blockReward: params.blockReward ?? null,
    blockRewardPoolAddress: params.blockRewardPoolAddress ?? null,
    targetMiningTimeMs: params.targetMiningTimeMs ?? null,
    asertHalfLifeBlocks: params.asertHalfLifeBlocks ?? null,
    minDifficulty: params.minDifficulty ?? null,
    minTxBaseFee: params.minTxBaseFee ?? null,
    minTxByteFee: params.minTxByteFee ?? null,
    validatorMiningWindowBlocks,
  };
}

/** Build the historical implicit-V1 network-params payload. */
export function createLegacyNetworkParamsSetPayload(params: {
  blockReward?: bigint | null;
  blockRewardPoolAddress?: Address | null;
  targetMiningTimeMs?: bigint | null;
  asertHalfLifeBlocks?: bigint | null;
  minDifficulty?: bigint | null;
  minTxBaseFee?: bigint | null;
  minTxByteFee?: bigint | null;
}): NetworkParamsSetPayloadV1 {
  return {
    payloadType: TxPayloadType.BIP_NETWORK_PARAMS_SET,
    payloadVersion: TxPayloadVersion.V1,
    blockReward: params.blockReward ?? null,
    blockRewardPoolAddress: params.blockRewardPoolAddress ?? null,
    targetMiningTimeMs: params.targetMiningTimeMs ?? null,
    asertHalfLifeBlocks: params.asertHalfLifeBlocks ?? null,
    minDifficulty: params.minDifficulty ?? null,
    minTxBaseFee: params.minTxBaseFee ?? null,
    minTxByteFee: params.minTxByteFee ?? null,
  };
}

export function createValidatorMiningPolicySetPayload(
  validatorAddress: Address,
  policy: { miningLimitMode: MiningLimitMode; maxMiningShareBps: bigint }
): ValidatorMiningPolicySetPayload {
  validateMiningPolicy(policy.miningLimitMode, policy.maxMiningShareBps);
  return {
    payloadType: TxPayloadType.BIP_VALIDATOR_MINING_POLICY_SET,
    payloadVersion: TxPayloadVersion.V1,
    validatorAddress,
    miningLimitMode: policy.miningLimitMode,
    maxMiningShareBps: policy.maxMiningShareBps,
  };
}
