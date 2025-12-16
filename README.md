# @goldenera/cryptoj

[![Build and Release](https://github.com/GoldenEraGlobal/goldenera-cryptoj-js/actions/workflows/build-release.yml/badge.svg)](https://github.com/GoldenEraGlobal/goldenera-cryptoj-js/actions/workflows/build-release.yml)
[![npm version](https://badge.fury.io/js/@goldenera%2Fcryptoj.svg)](https://www.npmjs.com/package/@goldenera/cryptoj)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

GoldenEra Blockchain Transaction Library for TypeScript/JavaScript.

This is the TypeScript port of the Java `cryptoj` library, providing a type-safe API for building, signing, and serializing GoldenEra blockchain transactions.

## Installation

```bash
pnpm add @goldenera/cryptoj
# or
npm install @goldenera/cryptoj
# or
yarn add @goldenera/cryptoj
```


## Features

- 🔐 **Secure Key Management** - BIP-39 mnemonic generation, BIP-32/BIP-44 HD key derivation
- 📝 **Transaction Builder** - Fluent API for building all transaction types
- 🔄 **RLP Serialization** - Full encode/decode support compatible with Java implementation
- 💰 **Amount Utilities** - Easy conversion between tokens and wei
- 🔍 **Type-Safe** - Full TypeScript support with branded types
- ⚡ **Modern** - Uses native BigInt, ESM/CJS dual package

## Quick Start

### Generate a Wallet

```typescript
import { PrivateKey } from '@goldenera/cryptoj';

// Generate a new 12-word mnemonic
const mnemonic = PrivateKey.generateMnemonic();
console.log('Mnemonic:', mnemonic);

// Derive private key from mnemonic
const privateKey = PrivateKey.fromMnemonic(mnemonic, '', 0);

// Get address
const address = privateKey.getAddress();
console.log('Address:', address);
```

### Simple Transfer

```typescript
import { TxBuilder, TxType, Network, Amounts } from '@goldenera/cryptoj';

const tx = TxBuilder.create()
  .type(TxType.TRANSFER)
  .network(Network.MAINNET)
  .recipient('0x1234567890123456789012345678901234567890')
  .amount(Amounts.tokens(100n))        // 100 tokens
  .fee(Amounts.parseTokens('0.001'))   // 0.001 token fee
  .nonce(1n)
  .sign(privateKey);

console.log('Transaction Hash:', tx.hash);
console.log('Transaction Size:', tx.size, 'bytes');
```

### Token Mint (BIP Transaction)

```typescript
import { 
  TxBuilder, 
  TxType, 
  Network, 
  Amounts,
  createTokenMintPayload 
} from '@goldenera/cryptoj';

const mintPayload = createTokenMintPayload(
  '0x...tokenAddress',  // Token contract address
  '0x...recipient',     // Recipient address
  Amounts.tokens(1000n) // Amount to mint
);

const tx = TxBuilder.create()
  .type(TxType.BIP_CREATE)
  .network(Network.MAINNET)
  .fee(Amounts.parseTokens('0.01'))
  .nonce(1n)
  .payload(mintPayload)
  .sign(privateKey);
```

### Vote on BIP Proposal

```typescript
import { 
  TxBuilder, 
  TxType, 
  Network, 
  Amounts,
  createApprovalVote 
} from '@goldenera/cryptoj';

const tx = TxBuilder.create()
  .type(TxType.BIP_VOTE)
  .network(Network.MAINNET)
  .fee(Amounts.parseTokens('0.001'))
  .nonce(2n)
  .payload(createApprovalVote())
  .referenceHash('0x...bipProposalHash')
  .sign(privateKey);
```

### Serialize/Deserialize Transaction

```typescript
import { TxEncoder, TxDecoder, bytesToHex } from '@goldenera/cryptoj';

// Encode transaction to RLP bytes
const rlpBytes = TxEncoder.encode(tx, true);
console.log('RLP Hex:', bytesToHex(rlpBytes));

// Decode RLP bytes back to transaction
const decodedTx = TxDecoder.decode(rlpBytes);
console.log('Decoded Hash:', decodedTx.hash);
```

## API Reference

### Types

| Type | Description |
|------|-------------|
| `Address` | 20-byte Ethereum-style address (0x-prefixed) |
| `Hash` | 32-byte Keccak-256 hash |
| `Signature` | 65-byte ECDSA signature (r, s, v) |
| `Hex` | Generic hex string |

### Enums

| Enum | Values |
|------|--------|
| `Network` | `MAINNET`, `TESTNET` |
| `TxType` | `TRANSFER`, `BIP_CREATE`, `BIP_VOTE` |
| `TxVersion` | `V1` |
| `TxPayloadType` | Various BIP payload types |
| `BipVoteType` | `APPROVAL`, `DISAPPROVAL` |

### Classes

#### `PrivateKey`

```typescript
// Static methods
PrivateKey.create()                               // Generate random key
PrivateKey.generateMnemonic()                     // Generate 12-word mnemonic
PrivateKey.fromMnemonic(mnemonic, password, idx)  // Derive from mnemonic
PrivateKey.wrap(bytes)                            // Wrap existing key

// Instance methods
privateKey.getAddress()                           // Get derived address
privateKey.getPublicKey()                         // Get public key
privateKey.sign(hash)                             // Sign a hash
privateKey.toHex()                                // Get hex representation
```

#### `TxBuilder`

Fluent builder for creating transactions:

```typescript
TxBuilder.create()
  .version(TxVersion.V1)          // Optional, default: V1
  .timestamp(Date.now())          // Optional, default: now
  .type(TxType.TRANSFER)          // Required
  .network(Network.MAINNET)       // Required
  .nonce(1n)                      // Required
  .recipient(address)             // For TRANSFER
  .amount(wei)                    // For TRANSFER
  .tokenAddress(address)          // Optional, null = native
  .fee(wei)                       // Required
  .message(bytes)                 // Optional
  .payload(payload)               // For BIP_*
  .referenceHash(hash)            // For BIP_VOTE
  .sign(privateKey)               // Build + sign
```

### Amounts

```typescript
import { Amounts } from '@goldenera/cryptoj';

Amounts.tokens(100n)              // 100 tokens in wei
Amounts.parseTokens('1.5')        // Parse decimal string
Amounts.formatTokens(wei)         // Format wei to string
Amounts.zero()                    // 0n
```

### Payload Factories

```typescript
createTokenMintPayload(tokenAddress, recipient, amount)
createTokenBurnPayload(tokenAddress, fromAddress, amount)
createTokenCreatePayload({ name, symbol, decimals, maxSupply, ... })
createTokenUpdatePayload(tokenAddress, { name?, symbol?, ... })
createVotePayload(voteType)
createApprovalVote()
createDisapprovalVote()
createAddressAliasAddPayload(address, alias)
createAddressAliasRemovePayload(alias)
createAuthorityAddPayload(authorityAddress)
createAuthorityRemovePayload(authorityAddress)
createNetworkParamsSetPayload({ blockReward?, ... })
```

## Development

```bash
# Install dependencies
pnpm install

# Type check
pnpm run typecheck

# Build
pnpm run build

# Run tests
pnpm test

# Run tests once
pnpm run test:run
```

## CI/CD

This project uses GitHub Actions for continuous integration:

- **Build**: Compiles TypeScript, runs type checks and tests on every push/PR
- **Release**: Automatically publishes to npm when pushing to `main` branch

### Required Secrets

Set these in your GitHub repository settings:

- `NPM_TOKEN`: npm access token for publishing (create at [npmjs.com](https://www.npmjs.com/settings/~/tokens))

## License

MIT License - Copyright (c) 2025-2030 The GoldenEraGlobal Developers
