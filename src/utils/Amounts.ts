/**
 * Utility class for working with Wei amounts in GoldenEra blockchain.
 *
 * GoldenEra uses 8 decimal places for native tokens (1 token = 10^8 wei),
 * but supports up to 18 decimals for custom tokens.
 *
 * All amounts are represented as bigint (wei units).
 */

/**
 * Decimal constants for common token types.
 */
export const DECIMALS = {
  /** Standard token decimals (native token) */
  STANDARD: 8,
  /** Maximum supported decimals */
  MAX: 18,
} as const;

/**
 * Wei per whole native token (1 token = 10^8 wei).
 */
export const WEI_PER_TOKEN = 10n ** BigInt(DECIMALS.STANDARD);

/**
 * Utility functions for amount conversions.
 */
export const Amounts = {
  /**
   * Create a wei amount from whole tokens (9 decimals).
   *
   * @example
   * Amounts.tokens(100n) // 100 tokens in wei
   * Amounts.tokens(1n)   // 1 token in wei
   */
  tokens(tokens: bigint): bigint {
    return tokens * WEI_PER_TOKEN;
  },

  /**
   * Create a wei amount from a number of whole tokens.
   *
   * @example
   * Amounts.tokensNumber(100) // 100 tokens in wei
   */
  tokensNumber(tokens: number): bigint {
    return BigInt(tokens) * WEI_PER_TOKEN;
  },

  /**
   * Create a wei amount directly.
   */
  wei(wei: bigint): bigint {
    return wei;
  },

  /**
   * Parse a decimal string to wei (9 decimals default).
   *
   * @example
   * Amounts.parseTokens("1.5")      // 1.5 tokens in wei
   * Amounts.parseTokens("0.001")    // 0.001 tokens in wei
   * Amounts.parseTokens("123.456789012") // 123.456789012 tokens
   */
  parseTokens(tokensDecimal: string): bigint {
    return Amounts.parseWithDecimals(tokensDecimal, DECIMALS.STANDARD);
  },

  /**
   * Parse a decimal string with custom decimals.
   *
   * @param tokensDecimal - Token amount as decimal string (e.g., "1.5")
   * @param decimals - Number of decimal places (0-18)
   */
  parseWithDecimals(tokensDecimal: string, decimals: number): bigint {
    if (decimals < 0 || decimals > DECIMALS.MAX) {
      throw new Error(`Decimals must be between 0 and ${DECIMALS.MAX}, got: ${decimals}`);
    }

    // Handle negative values
    const isNegative = tokensDecimal.startsWith('-');
    const cleanValue = isNegative ? tokensDecimal.slice(1) : tokensDecimal;

    // Split into integer and fractional parts
    const parts = cleanValue.split('.');
    const integerPart = parts[0] || '0';
    const fractionalPart = (parts[1] || '').slice(0, decimals).padEnd(decimals, '0');

    // Combine and parse
    const combined = integerPart + fractionalPart;
    const result = BigInt(combined);

    return isNegative ? -result : result;
  },

  /**
   * Format wei to a token string with decimals.
   *
   * @example
   * Amounts.formatTokens(1500000000n) // "1.5"
   */
  formatTokens(wei: bigint): string {
    return Amounts.formatWithDecimals(wei, DECIMALS.STANDARD);
  },

  /**
   * Format wei to a string with custom decimals.
   */
  formatWithDecimals(wei: bigint, decimals: number): string {
    if (decimals < 0 || decimals > DECIMALS.MAX) {
      throw new Error(`Decimals must be between 0 and ${DECIMALS.MAX}, got: ${decimals}`);
    }

    const isNegative = wei < 0n;
    const absWei = isNegative ? -wei : wei;

    const divisor = 10n ** BigInt(decimals);
    const integerPart = absWei / divisor;
    const fractionalPart = absWei % divisor;

    let result = integerPart.toString();

    if (fractionalPart > 0n) {
      const fracStr = fractionalPart.toString().padStart(decimals, '0');
      // Trim trailing zeros
      const trimmed = fracStr.replace(/0+$/, '');
      if (trimmed) {
        result += '.' + trimmed;
      }
    }

    return isNegative ? '-' + result : result;
  },

  /**
   * Zero amount constant.
   */
  zero(): bigint {
    return 0n;
  },

  /**
   * Check if amount is zero.
   */
  isZero(amount: bigint): boolean {
    return amount === 0n;
  },

  /**
   * Check if amount is positive.
   */
  isPositive(amount: bigint): boolean {
    return amount > 0n;
  },

  /**
   * Add two amounts.
   */
  add(a: bigint, b: bigint): bigint {
    return a + b;
  },

  /**
   * Subtract two amounts.
   */
  subtract(a: bigint, b: bigint): bigint {
    return a - b;
  },

  /**
   * Compare two amounts. Returns -1, 0, or 1.
   */
  compare(a: bigint, b: bigint): -1 | 0 | 1 {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  },
} as const;
