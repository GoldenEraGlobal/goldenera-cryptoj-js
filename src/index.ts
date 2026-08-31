/**
 * @goldenera/cryptoj - GoldenEra Blockchain Transaction Library
 *
 * The MIT License (MIT)
 * Copyright (c) 2025-2030 The GoldenEraGlobal Developers
 */

// ============================================
// Types
// ============================================
export {
    ADDRESS_SIZE, bigintToHex, bytesToHex, HASH_SIZE, hexToBigint, hexToBytes, isAddress,
    isHash, isHex, isSignature, NATIVE_TOKEN, padHex, SIGNATURE_SIZE, toAddress,
    toHash,
    toSignature, ZERO_ADDRESS, ZERO_SIGNATURE,
    ZERO_HASH
} from './types';
export type { Address, Hash, Hex, Signature } from './types';

// ============================================
// Enums
// ============================================
export {
    AccountBalanceStateVersion, BipType, bipTypeFromCode, BipVoteType, bipVoteTypeFromCode, MiningLimitMode,
    miningLimitModeFromCode, MiningWindowStateVersion, Network, networkFromCode,
    MiningRewardMaturityStateVersion, NetworkParamsStateVersion, TxPayloadType, txPayloadTypeFromCode, TxPayloadVersion,
    txPayloadVersionFromCode, TxType, txTypeFromCode, TxVersion, txVersionFromCode,
    ValidatorStateVersion
} from './enums';

// ============================================
// Crypto
// ============================================
export { hash, isSignatureStructurallyValid, PrivateKey, recoverAddress, validateSignature } from './crypto/PrivateKey';

// ============================================
// Transaction
// ============================================
export type { SignedTx, Tx, TxInput, UnsignedTx } from './tx/Tx';
export { TxBuilder, TxBuilderError } from './tx/TxBuilder';

// ============================================
// Payloads
// ============================================
export type {
    AddressAliasAddPayload,
    AddressAliasRemovePayload, AnyTxPayload, AuthorityAddPayload,
    AuthorityRemovePayload,
    NetworkParamsSetPayload, NetworkParamsSetPayloadV1, NetworkParamsSetPayloadV2, TokenBurnPayload,
    TokenCreatePayload, TokenMintPayload, TokenUpdatePayload,
    ValidatorAddPayload, ValidatorAddPayloadV1, ValidatorAddPayloadV2,
    ValidatorMiningPolicySetPayload, ValidatorRemovePayload,
    VotePayload
} from './tx/payloads';
export type { TxPayload } from './tx/payloads/TxPayload';

export {
    createAddressAliasAddPayload,
    createAddressAliasRemovePayload, createApprovalVote, createAuthorityAddPayload,
    createAuthorityRemovePayload, createDisapprovalVote, createLegacyNetworkParamsSetPayload,
    createLegacyValidatorAddPayload, createNetworkParamsSetPayload, createTokenBurnPayload,
    createTokenCreatePayload, createTokenMintPayload, createTokenUpdatePayload,
    createValidatorAddPayload, createValidatorMiningPolicySetPayload, createValidatorRemovePayload,
    createVotePayload
} from './tx/payloads';

// ============================================
// Serialization
// ============================================
export { decodePayload, encodePayload } from './serialization/PayloadCodec';
export { decodeTx, TxDecoder } from './serialization/TxDecoder';
export { encodeTx, TxEncoder } from './serialization/TxEncoder';

// ============================================
// Consensus rules and state serialization
// ============================================
export {
    BASIS_POINTS_DENOMINATOR, MAX_MINING_REWARD_VESTING_BLOCKS, MAX_VALIDATOR_MINING_SHARE_BPS,
    MAX_VALIDATOR_MINING_WINDOW_BLOCKS, MIN_VALIDATOR_MINING_WINDOW_BLOCKS,
    validateLimitedPolicyForWindow, validateMiningPolicy, validateMiningRewardVestingBlocks,
    validateMiningWindowSize
} from './consensus/MiningConsensusRules';
export type {
    AccountBalanceState, MiningRewardMaturityState, MiningWindowState, NetworkParamsState,
    ValidatorState
} from './state/types';
export {
    decodeValidatorState, encodeValidatorState, VALIDATOR_STATE_ZERO
} from './state/ValidatorStateCodec';
export {
    decodeNetworkParamsState, encodeNetworkParamsState, NETWORK_PARAMS_STATE_ZERO
} from './state/NetworkParamsStateCodec';
export {
    appendMiningWindow, createEmptyMiningWindowState, decodeMiningWindowState,
    encodeMiningWindowState, MINING_WINDOW_STATE_ZERO, validateMiningWindowState
} from './state/MiningWindowStateCodec';
export {
    ACCOUNT_BALANCE_STATE_ZERO, ACCOUNT_BALANCE_STATE_ZERO_V2,
    burnIncludingLockedMiningReward, creditAccountBalance, creditLockedMiningReward,
    debitAccountBalance, decodeAccountBalanceState, encodeAccountBalanceState, spendableBalance,
    unlockMiningReward, upgradeAccountBalanceToV2,
    validateAccountBalanceState
} from './state/AccountBalanceStateCodec';
export {
    addMiningRewardMaturity, createMiningRewardMaturityState,
    decodeMiningRewardMaturityState, encodeMiningRewardMaturityState,
    MINING_REWARD_MATURITY_STATE_ZERO, validateMiningRewardMaturityState
} from './state/MiningRewardMaturityStateCodec';

// ============================================
// Utilities
// ============================================
export { Amounts, DECIMALS, WEI_PER_TOKEN } from './utils/Amounts';
export { hashForSigning, hashTx, sizeTx } from './utils/TxUtil';

// ============================================
// Re-exports from viem for convenience
// ============================================
export {
    checksumAddress, getAddress,
    isAddress as isValidChecksumAddress
} from 'viem';
