import { ExtractionResult, ValidationReport, ValidationWarning, ValidationError } from '../types/index.js'

export class Validator {
  private warnings: ValidationWarning[] = []
  private errors: ValidationError[] = []

  validate(results: ExtractionResult[]): ValidationReport {
    this.warnings = []
    this.errors = []

    // Schema validation (already done by Zod in extractors)

    // Business logic validation
    this.validateBusinessLogic(results)

    const totalChecks = results.length * 2 // 2 checks per result for now
    const errorCount = this.errors.length
    const warningCount = this.warnings.length
    const passedChecks = totalChecks - errorCount

    return {
      passed: errorCount === 0,
      warnings: this.warnings,
      errors: this.errors,
      summary: {
        totalChecks,
        passedChecks,
        warningCount,
        errorCount
      }
    }
  }

  private validateBusinessLogic(results: ExtractionResult[]): void {
    // 1 billion tBTC in wei (18 decimals)
    const ONE_BILLION_WEI = 1_000_000_000n * (10n ** 18n)

    for (const result of results) {
      // Check for negative TVL
      if (result.tvl < 0n) {
        this.errors.push({
          level: 'error',
          message: 'TVL cannot be negative',
          protocol: result.protocol,
          chain: result.chain,
          details: { tvl: result.tvl.toString() }
        })
      }

      // Check for extremely large TVL (> 1 billion tBTC - likely data error)
      if (result.tvl > ONE_BILLION_WEI) {
        this.errors.push({
          level: 'error',
          message: 'TVL suspiciously large (> 1B tBTC)',
          protocol: result.protocol,
          chain: result.chain,
          details: { tvl: result.tvl.toString() }
        })
      }

      // Warn if TVL is zero
      if (result.tvl === 0n) {
        this.warnings.push({
          level: 'warning',
          message: 'TVL is zero',
          protocol: result.protocol,
          chain: result.chain
        })
      }
    }
  }
}
