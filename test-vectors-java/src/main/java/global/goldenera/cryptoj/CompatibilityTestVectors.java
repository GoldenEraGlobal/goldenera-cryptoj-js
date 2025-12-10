/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2025-2030 The GoldenEraGlobal Developers
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
package global.goldenera.cryptoj;

import java.security.Security;
import java.time.Instant;

import org.apache.tuweni.bytes.Bytes;
import org.bouncycastle.jce.provider.BouncyCastleProvider;

import global.goldenera.cryptoj.builder.TxBuilder;
import global.goldenera.cryptoj.common.Tx;
import global.goldenera.cryptoj.common.payloads.bip.TxBipAddressAliasAddPayloadImpl;
import global.goldenera.cryptoj.common.payloads.bip.TxBipAddressAliasRemovePayloadImpl;
import global.goldenera.cryptoj.common.payloads.bip.TxBipAuthorityAddPayloadImpl;
import global.goldenera.cryptoj.common.payloads.bip.TxBipAuthorityRemovePayloadImpl;
import global.goldenera.cryptoj.common.payloads.bip.TxBipNetworkParamsSetPayloadImpl;
import global.goldenera.cryptoj.common.payloads.bip.TxBipTokenBurnPayloadImpl;
import global.goldenera.cryptoj.common.payloads.bip.TxBipTokenCreatePayloadImpl;
import global.goldenera.cryptoj.common.payloads.bip.TxBipTokenMintPayloadImpl;
import global.goldenera.cryptoj.common.payloads.bip.TxBipTokenUpdatePayloadImpl;
import global.goldenera.cryptoj.common.payloads.bip.TxBipVotePayloadImpl;
import global.goldenera.cryptoj.datatypes.Address;
import global.goldenera.cryptoj.datatypes.Hash;
import global.goldenera.cryptoj.datatypes.PrivateKey;
import global.goldenera.cryptoj.enums.BipVoteType;
import global.goldenera.cryptoj.enums.Network;
import global.goldenera.cryptoj.enums.TxType;
import global.goldenera.cryptoj.serialization.tx.TxEncoder;
import global.goldenera.cryptoj.utils.Amounts;
import global.goldenera.cryptoj.utils.TxUtil;

/**
 * Generate compatibility test vectors for TypeScript implementation.
 * 
 * Usage: mvn compile exec:java
 * 
 * This will output TypeScript-compatible test vectors to stdout.
 */
public class CompatibilityTestVectors {

        static {
                if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                        Security.addProvider(new BouncyCastleProvider());
                }
        }

        private static final String TEST_MNEMONIC = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
        private static final String TEST_PASSWORD = "";
        private static long timestampCounter = 1702200000000L;

        public static void main(String[] args) throws Exception {
                PrivateKey privateKey = PrivateKey.load(TEST_MNEMONIC, TEST_PASSWORD, 0);

                System.out.println("// Auto-generated test vectors from Java");
                System.out.println("export const testVectors = [");

                // Transfer tests
                generateTransferTest(privateKey);
                generateTransferWithMessageTest(privateKey);

                // BIP Create tests - all payloads
                generateTokenMintTest(privateKey);
                generateTokenBurnTest(privateKey);
                generateTokenCreateTest(privateKey);
                generateTokenUpdateTest(privateKey);
                generateAddressAliasAddTest(privateKey);
                generateAddressAliasRemoveTest(privateKey);
                generateAuthorityAddTest(privateKey);
                generateAuthorityRemoveTest(privateKey);
                generateNetworkParamsSetTest(privateKey);

                // BIP Vote test
                generateVoteApprovalTest(privateKey);
                generateVoteDisapprovalTest(privateKey);

                System.out.println("];");

                // Key derivation vectors
                System.out.println("");
                System.out.println("// Key derivation test vectors");
                System.out.println("export const keyDerivationVectors = [");
                for (int i = 0; i < 5; i++) {
                        PrivateKey pk = PrivateKey.load(TEST_MNEMONIC, TEST_PASSWORD, i);
                        System.out.println("  {");
                        System.out.println("    index: " + i + ",");
                        System.out.println("    privateKey: '" + pk.toHexString() + "',");
                        System.out.println("    address: '" + pk.getAddress().toHexString() + "',");
                        System.out.println("  },");
                }
                System.out.println("];");
        }

        private static void generateTransferTest(PrivateKey privateKey) throws Exception {
                Tx tx = TxBuilder.create()
                                .type(TxType.TRANSFER)
                                .network(Network.MAINNET)
                                .timestamp(Instant.ofEpochMilli(nextTimestamp()))
                                .nonce(1L)
                                .recipient(Address.fromHexString("0x1111111111111111111111111111111111111111"))
                                .amount(Amounts.tokens(100))
                                .fee(Amounts.tokensDecimal("0.001"))
                                .sign(privateKey);
                printTestVector("simple_transfer", tx);
        }

        private static void generateTransferWithMessageTest(PrivateKey privateKey) throws Exception {
                Tx tx = TxBuilder.create()
                                .type(TxType.TRANSFER)
                                .network(Network.TESTNET)
                                .timestamp(Instant.ofEpochMilli(nextTimestamp()))
                                .nonce(42L)
                                .recipient(Address.fromHexString("0x2222222222222222222222222222222222222222"))
                                .amount(Amounts.tokensDecimal("1.5"))
                                .fee(Amounts.tokens(1))
                                .message("Hello GoldenEra!")
                                .sign(privateKey);
                printTestVector("transfer_with_message", tx);
        }

        private static void generateTokenMintTest(PrivateKey privateKey) throws Exception {
                Tx tx = TxBuilder.create()
                                .type(TxType.BIP_CREATE)
                                .network(Network.MAINNET)
                                .timestamp(Instant.ofEpochMilli(nextTimestamp()))
                                .nonce(10L)
                                .fee(Amounts.tokensDecimal("0.01"))
                                .payload(TxBipTokenMintPayloadImpl.builder()
                                                .tokenAddress(Address.fromHexString(
                                                                "0x3333333333333333333333333333333333333333"))
                                                .recipient(Address.fromHexString(
                                                                "0x4444444444444444444444444444444444444444"))
                                                .amount(Amounts.tokens(1000000))
                                                .build())
                                .sign(privateKey);
                printTestVector("bip_token_mint", tx);
        }

        private static void generateTokenBurnTest(PrivateKey privateKey) throws Exception {
                Tx tx = TxBuilder.create()
                                .type(TxType.BIP_CREATE)
                                .network(Network.MAINNET)
                                .timestamp(Instant.ofEpochMilli(nextTimestamp()))
                                .nonce(11L)
                                .fee(Amounts.tokensDecimal("0.01"))
                                .payload(TxBipTokenBurnPayloadImpl.builder()
                                                .tokenAddress(Address.fromHexString(
                                                                "0x5555555555555555555555555555555555555555"))
                                                .sender(Address.fromHexString(
                                                                "0x6666666666666666666666666666666666666666"))
                                                .amount(Amounts.tokens(500))
                                                .build())
                                .sign(privateKey);
                printTestVector("bip_token_burn", tx);
        }

        private static void generateTokenCreateTest(PrivateKey privateKey) throws Exception {
                Tx tx = TxBuilder.create()
                                .type(TxType.BIP_CREATE)
                                .network(Network.MAINNET)
                                .timestamp(Instant.ofEpochMilli(nextTimestamp()))
                                .nonce(12L)
                                .fee(Amounts.tokensDecimal("1"))
                                .payload(TxBipTokenCreatePayloadImpl.builder()
                                                .name("TestToken")
                                                .smallestUnitName("TT")
                                                .numberOfDecimals(9)
                                                .websiteUrl("https://test.token")
                                                .logoUrl("https://test.token/logo.png")
                                                .maxSupply(Amounts.tokens(1000000000).toBigInteger())
                                                .userBurnable(true)
                                                .build())
                                .sign(privateKey);
                printTestVector("bip_token_create", tx);
        }

        private static void generateTokenUpdateTest(PrivateKey privateKey) throws Exception {
                Tx tx = TxBuilder.create()
                                .type(TxType.BIP_CREATE)
                                .network(Network.MAINNET)
                                .timestamp(Instant.ofEpochMilli(nextTimestamp()))
                                .nonce(13L)
                                .fee(Amounts.tokensDecimal("0.1"))
                                .payload(TxBipTokenUpdatePayloadImpl.builder()
                                                .tokenAddress(Address.fromHexString(
                                                                "0x7777777777777777777777777777777777777777"))
                                                .name("UpdatedToken")
                                                .websiteUrl("https://updated.token")
                                                .build())
                                .sign(privateKey);
                printTestVector("bip_token_update", tx);
        }

        private static void generateAddressAliasAddTest(PrivateKey privateKey) throws Exception {
                Tx tx = TxBuilder.create()
                                .type(TxType.BIP_CREATE)
                                .network(Network.MAINNET)
                                .timestamp(Instant.ofEpochMilli(nextTimestamp()))
                                .nonce(14L)
                                .fee(Amounts.tokensDecimal("0.01"))
                                .payload(TxBipAddressAliasAddPayloadImpl.builder()
                                                .address(Address.fromHexString(
                                                                "0x8888888888888888888888888888888888888888"))
                                                .alias("my-alias")
                                                .build())
                                .sign(privateKey);
                printTestVector("bip_address_alias_add", tx);
        }

        private static void generateAddressAliasRemoveTest(PrivateKey privateKey) throws Exception {
                Tx tx = TxBuilder.create()
                                .type(TxType.BIP_CREATE)
                                .network(Network.MAINNET)
                                .timestamp(Instant.ofEpochMilli(nextTimestamp()))
                                .nonce(15L)
                                .fee(Amounts.tokensDecimal("0.01"))
                                .payload(TxBipAddressAliasRemovePayloadImpl.builder()
                                                .alias("old-alias")
                                                .build())
                                .sign(privateKey);
                printTestVector("bip_address_alias_remove", tx);
        }

        private static void generateAuthorityAddTest(PrivateKey privateKey) throws Exception {
                Tx tx = TxBuilder.create()
                                .type(TxType.BIP_CREATE)
                                .network(Network.MAINNET)
                                .timestamp(Instant.ofEpochMilli(nextTimestamp()))
                                .nonce(16L)
                                .fee(Amounts.tokensDecimal("0.01"))
                                .payload(TxBipAuthorityAddPayloadImpl.builder()
                                                .address(Address.fromHexString(
                                                                "0x9999999999999999999999999999999999999999"))
                                                .build())
                                .sign(privateKey);
                printTestVector("bip_authority_add", tx);
        }

        private static void generateAuthorityRemoveTest(PrivateKey privateKey) throws Exception {
                Tx tx = TxBuilder.create()
                                .type(TxType.BIP_CREATE)
                                .network(Network.MAINNET)
                                .timestamp(Instant.ofEpochMilli(nextTimestamp()))
                                .nonce(17L)
                                .fee(Amounts.tokensDecimal("0.01"))
                                .payload(TxBipAuthorityRemovePayloadImpl.builder()
                                                .address(Address.fromHexString(
                                                                "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"))
                                                .build())
                                .sign(privateKey);
                printTestVector("bip_authority_remove", tx);
        }

        private static void generateNetworkParamsSetTest(PrivateKey privateKey) throws Exception {
                Tx tx = TxBuilder.create()
                                .type(TxType.BIP_CREATE)
                                .network(Network.MAINNET)
                                .timestamp(Instant.ofEpochMilli(nextTimestamp()))
                                .nonce(18L)
                                .fee(Amounts.tokensDecimal("0.01"))
                                .payload(TxBipNetworkParamsSetPayloadImpl.builder()
                                                .blockReward(Amounts.tokens(50))
                                                .minTxBaseFee(Amounts.tokensDecimal("0.0001"))
                                                .minTxByteFee(Amounts.tokensDecimal("0.00001"))
                                                .build())
                                .sign(privateKey);
                printTestVector("bip_network_params_set", tx);
        }

        private static void generateVoteApprovalTest(PrivateKey privateKey) throws Exception {
                Tx tx = TxBuilder.create()
                                .type(TxType.BIP_VOTE)
                                .network(Network.MAINNET)
                                .timestamp(Instant.ofEpochMilli(nextTimestamp()))
                                .nonce(100L)
                                .fee(Amounts.tokensDecimal("0.001"))
                                .referenceHash(Hash.fromHexString(
                                                "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"))
                                .payload(TxBipVotePayloadImpl.builder()
                                                .type(BipVoteType.APPROVAL)
                                                .build())
                                .sign(privateKey);
                printTestVector("bip_vote_approval", tx);
        }

        private static void generateVoteDisapprovalTest(PrivateKey privateKey) throws Exception {
                Tx tx = TxBuilder.create()
                                .type(TxType.BIP_VOTE)
                                .network(Network.MAINNET)
                                .timestamp(Instant.ofEpochMilli(nextTimestamp()))
                                .nonce(101L)
                                .fee(Amounts.tokensDecimal("0.001"))
                                .referenceHash(Hash.fromHexString(
                                                "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321"))
                                .payload(TxBipVotePayloadImpl.builder()
                                                .type(BipVoteType.DISAPPROVAL)
                                                .build())
                                .sign(privateKey);
                printTestVector("bip_vote_disapproval", tx);
        }

        private static long nextTimestamp() {
                return timestampCounter++;
        }

        private static void printTestVector(String name, Tx tx) {
                Bytes rlpWithSig = TxEncoder.INSTANCE.encode(tx, true);
                Bytes rlpWithoutSig = TxEncoder.INSTANCE.encode(tx, false);
                Hash hashForSigning = TxUtil.hashForSigning(tx);

                System.out.println("  {");
                System.out.println("    name: '" + name + "',");
                System.out.println("    timestamp: " + tx.getTimestamp().toEpochMilli() + "n,");
                System.out.println("    expected: {");
                System.out.println("      hashForSigning: '" + hashForSigning.toHexString() + "',");
                System.out.println("      txHash: '" + tx.getHash().toHexString() + "',");
                System.out.println("      signature: '" + tx.getSignature().toHexString() + "',");
                System.out.println("      rlpWithoutSig: '" + rlpWithoutSig.toHexString() + "',");
                System.out.println("      rlpWithSig: '" + rlpWithSig.toHexString() + "',");
                System.out.println("      size: " + tx.getSize() + ",");
                System.out.println("    },");
                System.out.println("  },");
        }
}
