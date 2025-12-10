/**
 * Complete compatibility tests - verify TypeScript implementation matches Java.
 */

import { describe, expect, it } from 'vitest';
import {
  keyDerivationVectors,
  TEST_MNEMONIC,
  TEST_PASSWORD,
  testVectors,
} from './testVectors.generated';

import { PrivateKey } from '../crypto/PrivateKey';
import { BipVoteType, Network, TxPayloadType, TxType, TxVersion } from '../enums';
import { decodeTx } from '../serialization/TxDecoder';
import {
  createAddressAliasAddPayload,
  createAddressAliasRemovePayload,
  createAuthorityAddPayload,
  createAuthorityRemovePayload,
  createNetworkParamsSetPayload,
  createTokenBurnPayload,
  createTokenCreatePayload,
  createTokenMintPayload,
  createTokenUpdatePayload,
  createVotePayload,
} from '../tx/payloads';
import { TxBuilder } from '../tx/TxBuilder';
import type { Address, Hash, Hex } from '../types';
import { NATIVE_TOKEN } from '../types';
import { Amounts } from '../utils/Amounts';

describe('Compatibility Tests', () => {
  const privateKey = PrivateKey.fromMnemonic(TEST_MNEMONIC, TEST_PASSWORD, 0);

  describe('Key Derivation', () => {
    it.each(keyDerivationVectors)(
      'should derive correct address for index $index',
      (vector) => {
        const pk = PrivateKey.fromMnemonic(TEST_MNEMONIC, TEST_PASSWORD, vector.index);
        expect(pk.getAddress().toLowerCase()).toBe(vector.address.toLowerCase());
        expect(pk.toHex().toLowerCase()).toBe(vector.privateKey.toLowerCase());
      }
    );
  });

  describe('Transfer Transactions', () => {
    it('simple_transfer', () => {
      const vector = testVectors.find((v) => v.name === 'simple_transfer')!;

      const tx = TxBuilder.create()
        .version(TxVersion.V1)
        .type(TxType.TRANSFER)
        .network(Network.MAINNET)
        .timestamp(Number(vector.timestamp))
        .nonce(1n)
        .recipient('0x1111111111111111111111111111111111111111' as Address)
        .tokenAddress(NATIVE_TOKEN)
        .amount(Amounts.tokens(100n))
        .fee(Amounts.parseTokens('0.001'))
        .sign(privateKey);

      expect(tx.signature.toLowerCase()).toBe(vector.expected.signature.toLowerCase());
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
      expect(tx.size).toBe(vector.expected.size);
    });

    it('transfer_with_message', () => {
      const vector = testVectors.find((v) => v.name === 'transfer_with_message')!;

      const tx = TxBuilder.create()
        .version(TxVersion.V1)
        .type(TxType.TRANSFER)
        .network(Network.TESTNET)
        .timestamp(Number(vector.timestamp))
        .nonce(42n)
        .recipient('0x2222222222222222222222222222222222222222' as Address)
        .tokenAddress(NATIVE_TOKEN)
        .amount(Amounts.parseTokens('1.5'))
        .fee(Amounts.tokens(1n))
        .messageString('Hello GoldenEra!')
        .sign(privateKey);

      expect(tx.signature.toLowerCase()).toBe(vector.expected.signature.toLowerCase());
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
    });
  });

  describe('BIP Token Payloads', () => {
    it('bip_token_mint', () => {
      const vector = testVectors.find((v) => v.name === 'bip_token_mint')!;

      const tx = TxBuilder.create()
        .version(TxVersion.V1)
        .type(TxType.BIP_CREATE)
        .network(Network.MAINNET)
        .timestamp(Number(vector.timestamp))
        .nonce(10n)
        .fee(Amounts.parseTokens('0.01'))
        .payload(createTokenMintPayload(
          '0x3333333333333333333333333333333333333333' as Address,
          '0x4444444444444444444444444444444444444444' as Address,
          Amounts.tokens(1000000n)
        ))
        .sign(privateKey);

      expect(tx.signature.toLowerCase()).toBe(vector.expected.signature.toLowerCase());
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
    });

    it('bip_token_burn', () => {
      const vector = testVectors.find((v) => v.name === 'bip_token_burn')!;

      const tx = TxBuilder.create()
        .version(TxVersion.V1)
        .type(TxType.BIP_CREATE)
        .network(Network.MAINNET)
        .timestamp(Number(vector.timestamp))
        .nonce(11n)
        .fee(Amounts.parseTokens('0.01'))
        .payload(createTokenBurnPayload(
          '0x5555555555555555555555555555555555555555' as Address,
          '0x6666666666666666666666666666666666666666' as Address,
          Amounts.tokens(500n)
        ))
        .sign(privateKey);

      expect(tx.signature.toLowerCase()).toBe(vector.expected.signature.toLowerCase());
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
    });

    it('bip_token_create', () => {
      const vector = testVectors.find((v) => v.name === 'bip_token_create')!;

      const tx = TxBuilder.create()
        .version(TxVersion.V1)
        .type(TxType.BIP_CREATE)
        .network(Network.MAINNET)
        .timestamp(Number(vector.timestamp))
        .nonce(12n)
        .fee(Amounts.parseTokens('1'))
        .payload(createTokenCreatePayload({
          name: 'TestToken',
          smallestUnitName: 'TT',
          numberOfDecimals: 9,
          websiteUrl: 'https://test.token',
          logoUrl: 'https://test.token/logo.png',
          maxSupply: Amounts.tokens(1000000000n),
          userBurnable: true,
        }))
        .sign(privateKey);

      expect(tx.signature.toLowerCase()).toBe(vector.expected.signature.toLowerCase());
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
    });

    it('bip_token_update', () => {
      const vector = testVectors.find((v) => v.name === 'bip_token_update')!;

      const tx = TxBuilder.create()
        .version(TxVersion.V1)
        .type(TxType.BIP_CREATE)
        .network(Network.MAINNET)
        .timestamp(Number(vector.timestamp))
        .nonce(13n)
        .fee(Amounts.parseTokens('0.1'))
        .payload(createTokenUpdatePayload(
          '0x7777777777777777777777777777777777777777' as Address,
          {
            name: 'UpdatedToken',
            websiteUrl: 'https://updated.token',
          }
        ))
        .sign(privateKey);

      expect(tx.signature.toLowerCase()).toBe(vector.expected.signature.toLowerCase());
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
    });
  });

  describe('BIP Address Alias Payloads', () => {
    it('bip_address_alias_add', () => {
      const vector = testVectors.find((v) => v.name === 'bip_address_alias_add')!;

      const tx = TxBuilder.create()
        .version(TxVersion.V1)
        .type(TxType.BIP_CREATE)
        .network(Network.MAINNET)
        .timestamp(Number(vector.timestamp))
        .nonce(14n)
        .fee(Amounts.parseTokens('0.01'))
        .payload(createAddressAliasAddPayload(
          '0x8888888888888888888888888888888888888888' as Address,
          'my-alias'
        ))
        .sign(privateKey);

      expect(tx.signature.toLowerCase()).toBe(vector.expected.signature.toLowerCase());
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
    });

    it('bip_address_alias_remove', () => {
      const vector = testVectors.find((v) => v.name === 'bip_address_alias_remove')!;

      const tx = TxBuilder.create()
        .version(TxVersion.V1)
        .type(TxType.BIP_CREATE)
        .network(Network.MAINNET)
        .timestamp(Number(vector.timestamp))
        .nonce(15n)
        .fee(Amounts.parseTokens('0.01'))
        .payload(createAddressAliasRemovePayload('old-alias'))
        .sign(privateKey);

      expect(tx.signature.toLowerCase()).toBe(vector.expected.signature.toLowerCase());
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
    });
  });

  describe('BIP Authority Payloads', () => {
    it('bip_authority_add', () => {
      const vector = testVectors.find((v) => v.name === 'bip_authority_add')!;

      const tx = TxBuilder.create()
        .version(TxVersion.V1)
        .type(TxType.BIP_CREATE)
        .network(Network.MAINNET)
        .timestamp(Number(vector.timestamp))
        .nonce(16n)
        .fee(Amounts.parseTokens('0.01'))
        .payload(createAuthorityAddPayload(
          '0x9999999999999999999999999999999999999999' as Address
        ))
        .sign(privateKey);

      expect(tx.signature.toLowerCase()).toBe(vector.expected.signature.toLowerCase());
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
    });

    it('bip_authority_remove', () => {
      const vector = testVectors.find((v) => v.name === 'bip_authority_remove')!;

      const tx = TxBuilder.create()
        .version(TxVersion.V1)
        .type(TxType.BIP_CREATE)
        .network(Network.MAINNET)
        .timestamp(Number(vector.timestamp))
        .nonce(17n)
        .fee(Amounts.parseTokens('0.01'))
        .payload(createAuthorityRemovePayload(
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Address
        ))
        .sign(privateKey);

      expect(tx.signature.toLowerCase()).toBe(vector.expected.signature.toLowerCase());
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
    });
  });

  describe('BIP Network Params Payload', () => {
    it('bip_network_params_set', () => {
      const vector = testVectors.find((v) => v.name === 'bip_network_params_set')!;

      const tx = TxBuilder.create()
        .version(TxVersion.V1)
        .type(TxType.BIP_CREATE)
        .network(Network.MAINNET)
        .timestamp(Number(vector.timestamp))
        .nonce(18n)
        .fee(Amounts.parseTokens('0.01'))
        .payload(createNetworkParamsSetPayload({
          blockReward: Amounts.tokens(50n),
          minTxBaseFee: Amounts.parseTokens('0.0001'),
          minTxByteFee: Amounts.parseTokens('0.00001'),
        }))
        .sign(privateKey);

      expect(tx.signature.toLowerCase()).toBe(vector.expected.signature.toLowerCase());
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
    });
  });

  describe('BIP Vote Payloads', () => {
    it('bip_vote_approval', () => {
      const vector = testVectors.find((v) => v.name === 'bip_vote_approval')!;

      const tx = TxBuilder.create()
        .version(TxVersion.V1)
        .type(TxType.BIP_VOTE)
        .network(Network.MAINNET)
        .timestamp(Number(vector.timestamp))
        .nonce(100n)
        .fee(Amounts.parseTokens('0.001'))
        .referenceHash('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hash)
        .payload(createVotePayload(BipVoteType.APPROVAL))
        .sign(privateKey);

      expect(tx.signature.toLowerCase()).toBe(vector.expected.signature.toLowerCase());
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
    });

    it('bip_vote_disapproval', () => {
      const vector = testVectors.find((v) => v.name === 'bip_vote_disapproval')!;

      const tx = TxBuilder.create()
        .version(TxVersion.V1)
        .type(TxType.BIP_VOTE)
        .network(Network.MAINNET)
        .timestamp(Number(vector.timestamp))
        .nonce(101n)
        .fee(Amounts.parseTokens('0.001'))
        .referenceHash('0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321' as Hash)
        .payload(createVotePayload(BipVoteType.DISAPPROVAL))
        .sign(privateKey);

      expect(tx.signature.toLowerCase()).toBe(vector.expected.signature.toLowerCase());
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
    });
  });

  describe('Signature Verification', () => {
    it('should produce deterministic signatures', () => {
      const vector = testVectors[0]!;

      const tx1 = TxBuilder.create()
        .type(TxType.TRANSFER)
        .network(Network.MAINNET)
        .timestamp(Number(vector.timestamp))
        .nonce(1n)
        .recipient('0x1111111111111111111111111111111111111111' as Address)
        .tokenAddress(NATIVE_TOKEN)
        .amount(Amounts.tokens(100n))
        .fee(Amounts.parseTokens('0.001'))
        .sign(privateKey);

      const tx2 = TxBuilder.create()
        .type(TxType.TRANSFER)
        .network(Network.MAINNET)
        .timestamp(Number(vector.timestamp))
        .nonce(1n)
        .recipient('0x1111111111111111111111111111111111111111' as Address)
        .tokenAddress(NATIVE_TOKEN)
        .amount(Amounts.tokens(100n))
        .fee(Amounts.parseTokens('0.001'))
        .sign(privateKey);

      expect(tx1.signature).toBe(tx2.signature);
      expect(tx1.hash).toBe(tx2.hash);
    });
  });

  describe('Transaction Decoding', () => {
    it('should decode simple_transfer from RLP', () => {
      const vector = testVectors.find((v) => v.name === 'simple_transfer')!;
      const tx = decodeTx(vector.expected.rlpWithSig as Hex);
      const senderAddress = keyDerivationVectors?.[0]?.address.toLowerCase() as string;
      expect(senderAddress).toBeDefined();

      expect(tx.version).toBe(TxVersion.V1);
      expect(tx.type).toBe(TxType.TRANSFER);
      expect(tx.network).toBe(Network.MAINNET);
      expect(tx.timestamp).toBe(Number(vector.timestamp));
      expect(tx.nonce).toBe(1n);
      expect(tx.recipient?.toLowerCase()).toBe('0x1111111111111111111111111111111111111111');
      expect(tx.tokenAddress?.toLowerCase()).toBe(NATIVE_TOKEN.toLowerCase());
      expect(tx.amount).toBe(Amounts.tokens(100n));
      expect(tx.fee).toBe(Amounts.parseTokens('0.001'));
      expect(tx.signature.toLowerCase()).toBe(vector.expected.signature.toLowerCase());
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
      expect(tx.sender.toLowerCase()).toBe(senderAddress);
    });

    it('should decode transfer_with_message from RLP', () => {
      const vector = testVectors.find((v) => v.name === 'transfer_with_message')!;
      const tx = decodeTx(vector.expected.rlpWithSig as Hex);

      expect(tx.type).toBe(TxType.TRANSFER);
      expect(tx.network).toBe(Network.TESTNET);
      expect(tx.nonce).toBe(42n);
      expect(tx.message).not.toBeNull();
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
    });

    it('should decode bip_token_mint from RLP', () => {
      const vector = testVectors.find((v) => v.name === 'bip_token_mint')!;
      const tx = decodeTx(vector.expected.rlpWithSig as Hex);

      expect(tx.type).toBe(TxType.BIP_CREATE);
      expect(tx.payload).not.toBeNull();
      expect(tx.payload!.payloadType).toBe(TxPayloadType.BIP_TOKEN_MINT);
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
    });

    it('should decode bip_token_burn from RLP', () => {
      const vector = testVectors.find((v) => v.name === 'bip_token_burn')!;
      const tx = decodeTx(vector.expected.rlpWithSig as Hex);

      expect(tx.type).toBe(TxType.BIP_CREATE);
      expect(tx.payload).not.toBeNull();
      expect(tx.payload!.payloadType).toBe(TxPayloadType.BIP_TOKEN_BURN);
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
    });

    it('should decode bip_token_create from RLP', () => {
      const vector = testVectors.find((v) => v.name === 'bip_token_create')!;
      const tx = decodeTx(vector.expected.rlpWithSig as Hex);

      expect(tx.type).toBe(TxType.BIP_CREATE);
      expect(tx.payload).not.toBeNull();
      expect(tx.payload!.payloadType).toBe(TxPayloadType.BIP_TOKEN_CREATE);
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
    });

    it('should decode bip_vote_approval from RLP', () => {
      const vector = testVectors.find((v) => v.name === 'bip_vote_approval')!;
      const tx = decodeTx(vector.expected.rlpWithSig as Hex);

      expect(tx.type).toBe(TxType.BIP_VOTE);
      expect(tx.referenceHash).not.toBeNull();
      expect(tx.payload).not.toBeNull();
      expect(tx.payload!.payloadType).toBe(TxPayloadType.BIP_VOTE);
      expect(tx.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
    });

    it('should round-trip encode/decode all transactions', () => {
      for (const vector of testVectors) {
        const decoded = decodeTx(vector.expected.rlpWithSig as Hex);
        expect(decoded.hash.toLowerCase()).toBe(vector.expected.txHash.toLowerCase());
        expect(decoded.signature.toLowerCase()).toBe(vector.expected.signature.toLowerCase());
        expect(decoded.size).toBe(vector.expected.size);
      }
    });
  });
});
