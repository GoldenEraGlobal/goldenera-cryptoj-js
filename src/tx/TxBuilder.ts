/**
 * User-friendly Transaction Builder for wallet applications.
 *
 * Provides a fluent API for building and signing transactions with sensible defaults.
 *
 * @example
 * // Simple transfer
 * const tx = await TxBuilder.create()
 *   .type(TxType.TRANSFER)
 *   .network(Network.MAINNET)
 *   .recipient('0x1234...')
 *   .amount(Amounts.tokens(100n))
 *   .fee(Amounts.parseTokens('0.001'))
 *   .nonce(1n)
 *   .sign(privateKey);
 *
 * @example
 * // BIP transaction with payload
 * const tx = await TxBuilder.create()
 *   .type(TxType.BIP_CREATE)
 *   .network(Network.MAINNET)
 *   .fee(Amounts.parseTokens('0.01'))
 *   .nonce(1n)
 *   .payload(createTokenMintPayload(tokenAddr, recipient, amount))
 *   .sign(privateKey);
 */

import { PrivateKey } from '../crypto/PrivateKey';
import { Network, TxType, TxVersion } from '../enums';
import type { Address, Hash, Hex, Signature } from '../types';
import { NATIVE_TOKEN, hexToBytes } from '../types';
import { hashForSigning, hashTx, sizeTx } from '../utils/TxUtil';
import type { Tx, TxInput, UnsignedTx } from './Tx';
import type { TxPayload } from './payloads/TxPayload';

/**
 * Error thrown when transaction building fails.
 */
export class TxBuilderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TxBuilderError';
  }
}

/**
 * Transaction Builder with fluent API.
 */
export class TxBuilder {
  private _version: TxVersion = TxVersion.V1;
  private _timestamp: number = Date.now();
  private _type: TxType | null = null;
  private _network: Network | null = null;
  private _nonce: bigint | null = null;
  private _recipient: Address | null = null;
  private _tokenAddress: Address | null = null;
  private _amount: bigint | null = null;
  private _fee: bigint = 0n;
  private _message: Uint8Array | null = null;
  private _payload: TxPayload | null = null;
  private _referenceHash: Hash | null = null;

  private constructor() {}

  /**
   * Create a new transaction builder.
   */
  static create(): TxBuilder {
    return new TxBuilder();
  }

  /**
   * Create a builder from existing input.
   */
  static from(input: TxInput): TxBuilder {
    const builder = new TxBuilder();
    builder._type = input.type;
    builder._network = input.network;
    builder._nonce = input.nonce;

    if (input.version !== undefined) builder._version = input.version;
    if (input.timestamp !== undefined) builder._timestamp = input.timestamp;
    if (input.fee !== undefined) builder._fee = input.fee;
    if (input.recipient !== undefined) builder._recipient = input.recipient;
    if (input.tokenAddress !== undefined) builder._tokenAddress = input.tokenAddress;
    if (input.amount !== undefined) builder._amount = input.amount;
    if (input.payload !== undefined) builder._payload = input.payload;
    if (input.referenceHash !== undefined) builder._referenceHash = input.referenceHash;

    // Handle message conversion
    if (input.message !== undefined && input.message !== null) {
      if (typeof input.message === 'string') {
        if (input.message.startsWith('0x')) {
          builder._message = hexToBytes(input.message as Hex);
        } else {
          builder._message = new TextEncoder().encode(input.message);
        }
      } else if (input.message instanceof Uint8Array) {
        builder._message = input.message;
      }
    }

    return builder;
  }

  // ============================================
  // Builder Methods
  // ============================================

  /** Set transaction version (default: V1) */
  version(version: TxVersion): this {
    this._version = version;
    return this;
  }

  /** Set timestamp in milliseconds (default: Date.now()) */
  timestamp(timestamp: number | Date): this {
    this._timestamp = typeof timestamp === 'number' ? timestamp : timestamp.getTime();
    return this;
  }

  /** Set transaction type (required) */
  type(type: TxType): this {
    this._type = type;
    return this;
  }

  /** Set network (required) */
  network(network: Network): this {
    this._network = network;
    return this;
  }

  /** Set nonce (required) */
  nonce(nonce: bigint | number): this {
    this._nonce = BigInt(nonce);
    return this;
  }

  /** Set recipient address (required for TRANSFER) */
  recipient(recipient: Address): this {
    this._recipient = recipient;
    return this;
  }

  /** Set token address (NATIVE_TOKEN = 0x00 for native token, null for BIP transactions) */
  tokenAddress(tokenAddress: Address | null): this {
    this._tokenAddress = tokenAddress;
    return this;
  }

  /** Set amount in wei */
  amount(amount: bigint): this {
    this._amount = amount;
    return this;
  }

  /** Set transaction fee in wei */
  fee(fee: bigint): this {
    this._fee = fee;
    return this;
  }

  /** Set message from bytes */
  message(message: Uint8Array): this {
    this._message = message;
    return this;
  }

  /** Set message from string (UTF-8 encoded) */
  messageString(message: string): this {
    this._message = new TextEncoder().encode(message);
    return this;
  }

  /** Set message from hex string */
  messageHex(message: Hex): this {
    this._message = hexToBytes(message);
    return this;
  }

  /** Set BIP payload */
  payload(payload: TxPayload): this {
    this._payload = payload;
    return this;
  }

  /** Set reference hash (for BIP_VOTE) */
  referenceHash(hash: Hash): this {
    this._referenceHash = hash;
    return this;
  }

  // ============================================
  // Validation
  // ============================================

  private validate(): void {
    if (this._type === null) {
      throw new TxBuilderError('Transaction type is required');
    }
    if (this._network === null) {
      throw new TxBuilderError('Network is required');
    }
    if (this._nonce === null) {
      throw new TxBuilderError('Nonce is required');
    }

    // Type-specific validations
    switch (this._type) {
      case TxType.TRANSFER:
        if (this._recipient === null) {
          throw new TxBuilderError('Recipient is required for TRANSFER transactions');
        }
        break;

      case TxType.BIP_CREATE:
        if (this._payload === null) {
          throw new TxBuilderError('Payload is required for BIP_CREATE transactions');
        }
        // BIP_CREATE must have null amount
        if (this._amount !== null) {
          throw new TxBuilderError(
            'BIP_CREATE transactions must have null amount. Use payload amount for TOKEN_MINT/BURN operations.'
          );
        }
        break;

      case TxType.BIP_VOTE:
        if (this._payload === null) {
          throw new TxBuilderError('Payload is required for BIP_VOTE transactions');
        }
        if (this._referenceHash === null) {
          throw new TxBuilderError('Reference hash is required for BIP_VOTE transactions');
        }
        // BIP_VOTE must have null amount
        if (this._amount !== null) {
          throw new TxBuilderError('BIP_VOTE transactions must have null amount.');
        }
        break;
    }
  }

  // ============================================
  // Build Methods
  // ============================================

  /**
   * Build an unsigned transaction.
   */
  buildUnsigned(): UnsignedTx {
    this.validate();

    return {
      version: this._version,
      timestamp: this._timestamp,
      type: this._type!,
      network: this._network!,
      nonce: this._nonce!,
      recipient: this._recipient,
      tokenAddress: this._tokenAddress,
      amount: this._amount,
      fee: this._fee,
      message: this._message,
      payload: this._payload,
      referenceHash: this._referenceHash,
      signature: null,
    };
  }

  /**
   * Build and sign the transaction.
   *
   * @param privateKey - Private key to sign with
   * @returns Fully signed transaction
   */
  sign(privateKey: PrivateKey): Tx {
    const unsignedTx = this.buildUnsigned();

    // Calculate hash for signing
    const txHashForSigning = hashForSigning(unsignedTx);

    // Sign the hash
    const signature = privateKey.sign(txHashForSigning);

    // Build signed transaction
    const sender = privateKey.getAddress();

    const tx: Tx = {
      ...unsignedTx,
      signature,
      sender,
      hash: null as any, // Will be calculated
      size: 0, // Will be calculated
    };

    // Calculate hash and size
    (tx as any).hash = hashTx(tx);
    (tx as any).size = sizeTx(tx);

    return tx;
  }

  /**
   * Compute the transaction hash that would be signed.
   */
  computeSigningHash(): Hash {
    const unsignedTx = this.buildUnsigned();
    return hashForSigning(unsignedTx);
  }

  /**
   * Estimate the transaction size in bytes.
   * Note: Actual signed transaction will have additional 65 bytes for signature.
   */
  estimateSize(): number {
    const unsignedTx = this.buildUnsigned();
    // Create a mock signed tx to estimate size
    const mockTx: Tx = {
      ...unsignedTx,
      signature: '0x' + '00'.repeat(65) as Signature,
      sender: NATIVE_TOKEN,
      hash: '0x' + '00'.repeat(32) as Hash,
      size: 0,
    };
    return sizeTx(mockTx);
  }
}
