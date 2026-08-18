/**
 * Offline parity manifest for adversarial scalar cases from Java CryptoJ/Besu RLP.
 * Keep these byte strings hard-coded: CI must not depend on Maven or a sibling checkout.
 */
export const javaRlpAdversarialVectors = Object.freeze({
  validLongs: Object.freeze([
    Object.freeze({ scalar: '0x', value: 0n }),
    Object.freeze({ scalar: '0x7fffffffffffffff', value: 9_223_372_036_854_775_807n }),
    Object.freeze({ scalar: '0x8000000000000000', value: -9_223_372_036_854_775_808n }),
    Object.freeze({ scalar: '0xffffffffffffffff', value: -1n }),
  ]),
  invalidScalars: Object.freeze([
    Object.freeze({ scalar: '0x00', error: 'minimal encoding' }),
    Object.freeze({ scalar: '0x0001', error: 'minimal encoding' }),
    Object.freeze({ scalar: '0x010000000000000000', error: '64-bit width' }),
  ]),
  encodedLongMinList: '0xc9888000000000000000',
});
