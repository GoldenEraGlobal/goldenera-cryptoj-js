import RLP from 'rlp';
import { describe, expect, it } from 'vitest';
import { PrivateKey } from '../crypto/PrivateKey';
import { decodeTx } from '../serialization/TxDecoder';
import { encodeTx } from '../serialization/TxEncoder';
import { bytesToHex, hexToBytes, ZERO_SIGNATURE } from '../types';
import type { Hex } from '../types';
import { Amounts } from '../utils/Amounts';
import { hashForSigning } from '../utils/TxUtil';
import { TEST_MNEMONIC, testVectors } from './testVectors.generated';

const signed = testVectors[0]!.expected.rlpWithSig as Hex;
const unsigned = testVectors[0]!.expected.rlpWithoutSig as Hex;

describe('Java CryptoJ conformance', () => {
  it('derives Unicode-passphrase keys from the same raw UTF-8 bytes as Java', () => {
    expect(PrivateKey.fromMnemonic(TEST_MNEMONIC, 'é', 0).toHex()).toBe(
      '0xdff4f0dc7ed990b6f0fa0ec17f44bc448f4f3a9809e7cb6dc426768da56c2090'
    );
    expect(PrivateKey.fromMnemonic(TEST_MNEMONIC, 'žluťoučký', 0).toHex()).toBe(
      '0xe133a193111593bb1c8ea3319fbff983386047d369cca01b4984320f001b4c3f'
    );
    expect(PrivateKey.fromMnemonicLegacyJs(TEST_MNEMONIC, 'é', 0).toHex()).toBe(
      '0x608d0ab7caa808f5424c94c8c974e71fd31d6ff7c09692feb5208ed7362dc312'
    );
  });

  it('round-trips Java unsigned transactions and preserves null', () => {
    const tx = decodeTx(unsigned);
    expect(tx.signature).toBeNull();
    expect(tx.sender).toBeNull();
    expect(bytesToHex(encodeTx(tx, true))).toBe(unsigned);
    expect(tx.hash).toBe(hashForSigning(tx));
  });

  it('preserves nullable and signed Java long values', () => {
    const missingNonce = mutate((fields) => (fields[4] = []));
    expect(decodeTx(missingNonce).nonce).toBeNull();
    expect(bytesToHex(encodeTx(decodeTx(missingNonce), true))).toBe(missingNonce);

    const negativeNonce = mutate((fields) => {
      fields[4] = [hexToBytes('0xffffffffffffffff')];
    });
    expect(decodeTx(negativeNonce).nonce).toBe(-1n);
    expect(bytesToHex(encodeTx(decodeTx(negativeNonce), true))).toBe(negativeNonce);

    const negativeTimestamp = mutate((fields) => {
      fields[1] = hexToBytes('0xffffffffffffffff');
    });
    expect(decodeTx(negativeTimestamp).timestamp).toBe(-1n);

    const unsafeTimestamp = mutate((fields) => {
      fields[1] = hexToBytes('0x20000000000001');
    });
    expect(decodeTx(unsafeTimestamp).timestamp).toBe(9_007_199_254_740_993n);
    expect(bytesToHex(encodeTx(decodeTx(unsafeTimestamp), true))).toBe(unsafeTimestamp);
  });

  it('matches Java signature and transaction-shape validation', () => {
    const extraField = mutate((fields) => fields.push(new Uint8Array([1])));
    expect(() => decodeTx(extraField)).toThrow('field count');

    const highS = mutate((fields) => {
      const signature = fields[12] as Uint8Array;
      const n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
      const s = BigInt(bytesToHex(signature.slice(32, 64)));
      signature.set(hexToBytes(`0x${(n - s).toString(16).padStart(64, '0')}`), 32);
      signature[64] = signature[64] === 27 ? 28 : 27;
    });
    expect(() => decodeTx(highS)).toThrow('structurally invalid');

    const zeroSignature = mutate((fields) => {
      fields[12] = new Uint8Array(65);
    });
    const zeroTx = decodeTx(zeroSignature);
    expect(zeroTx.signature).toBe(ZERO_SIGNATURE);
    expect(zeroTx.sender).toBeNull();
    expect(bytesToHex(encodeTx(zeroTx, true))).toBe(zeroSignature);
  });

  it('enforces Java Wei range', () => {
    const overflow = mutate((fields) => {
      fields[8] = hexToBytes(`0x01${'00'.repeat(32)}`);
    });
    expect(() => decodeTx(overflow)).toThrow('UInt256');
  });

  it('matches Java amount parsing behavior', () => {
    expect(Amounts.parseTokens('123.456789012')).toBe(12_345_678_901n);
    expect(Amounts.parseTokens('1.2.3')).toBe(12_300_000n);
    expect(() => Amounts.parseTokens('-1')).toThrow('positive');
    expect(() => Amounts.parseTokens('')).toThrow('Invalid');
    expect(() => Amounts.parseTokens('.')).toThrow('Invalid');
  });
});

function mutate(change: (fields: unknown[]) => void): Hex {
  const fields = structuredClone(RLP.decode(hexToBytes(signed))) as unknown[];
  change(fields);
  return bytesToHex(RLP.encode(fields as Parameters<typeof RLP.encode>[0]));
}
