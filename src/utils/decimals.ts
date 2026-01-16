import { parseUnits } from 'viem'

/**
 * Normalizes token amounts to 18 decimals (wei standard).
 * Handles both human-readable format (e.g., "6.45") and wei format (e.g., "6450000000000000000").
 *
 * @param amount - The amount as a string (can include decimals)
 * @param decimals - The number of decimals for the token
 * @returns BigInt value normalized to 18 decimals
 *
 * @example
 * normalizeToWei("100", 18) => 100000000000000000000n (already 18 decimals)
 * normalizeToWei("100.5", 6) => 100500000000000000000n (6 decimals scaled to 18)
 * normalizeToWei("1000000", 6) => 1000000000000000000n (1 USDC in wei format, scaled to 18)
 */
export function normalizeToWei(amount: string, decimals: number): bigint {
  // If amount contains a decimal point, it's in human-readable format
  if (amount.includes('.')) {
    // Use viem's parseUnits to convert to the token's smallest unit
    const weiValue = parseUnits(amount, decimals)

    // Normalize to 18 decimals
    return normalizeWeiValue(weiValue, decimals)
  } else {
    // Already in wei format for the token, just normalize to 18 decimals
    return normalizeWeiValue(BigInt(amount), decimals)
  }
}

/**
 * Normalizes a wei value from one decimal precision to 18 decimals.
 *
 * @param weiValue - The value in smallest unit for the given decimals
 * @param fromDecimals - The current decimal precision
 * @returns BigInt value normalized to 18 decimals
 */
function normalizeWeiValue(weiValue: bigint, fromDecimals: number): bigint {
  if (fromDecimals === 18) {
    return weiValue
  }

  if (fromDecimals < 18) {
    // Scale up: multiply by 10^(18 - fromDecimals)
    const scaleFactor = 10n ** BigInt(18 - fromDecimals)
    return weiValue * scaleFactor
  }

  // Scale down: divide by 10^(fromDecimals - 18)
  const scaleFactor = 10n ** BigInt(fromDecimals - 18)
  return weiValue / scaleFactor
}
