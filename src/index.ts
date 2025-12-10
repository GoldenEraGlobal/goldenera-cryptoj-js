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
    toSignature, ZERO_ADDRESS,
    ZERO_HASH
} from './types';
export type { Address, Hash, Hex, Signature } from './types';

// ============================================
// Enums
// ============================================
export {
    BipVoteType, bipVoteTypeFromCode, Network, networkFromCode, TxPayloadType, txPayloadTypeFromCode, TxType, txTypeFromCode, TxVersion, txVersionFromCode
} from './enums';

// ============================================
// Crypto
// ============================================
export { hash, isSignatureStructurallyValid, PrivateKey, recoverAddress, validateSignature } from './crypto/PrivateKey';

// ============================================
// Transaction
// ============================================
export type { Tx, TxInput, UnsignedTx } from './tx/Tx';
export { TxBuilder, TxBuilderError } from './tx/TxBuilder';

// ============================================
// Payloads
// ============================================
export type {
    AddressAliasAddPayload,
    AddressAliasRemovePayload, AnyTxPayload, AuthorityAddPayload,
    AuthorityRemovePayload,
    NetworkParamsSetPayload, TokenBurnPayload,
    TokenCreatePayload, TokenMintPayload, TokenUpdatePayload,
    VotePayload
} from './tx/payloads';
export type { TxPayload } from './tx/payloads/TxPayload';

export {
    createAddressAliasAddPayload,
    createAddressAliasRemovePayload, createApprovalVote, createAuthorityAddPayload,
    createAuthorityRemovePayload, createDisapprovalVote, createNetworkParamsSetPayload, createTokenBurnPayload,
    createTokenCreatePayload, createTokenMintPayload, createTokenUpdatePayload,
    createVotePayload
} from './tx/payloads';

// ============================================
// Serialization
// ============================================
export { decodePayload, encodePayload } from './serialization/PayloadCodec';
export { decodeTx, TxDecoder } from './serialization/TxDecoder';
export { encodeTx, TxEncoder } from './serialization/TxEncoder';

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

