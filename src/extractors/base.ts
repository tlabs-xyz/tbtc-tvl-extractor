import { Chain, ExtractionResult, ExtractionSource, ExtractorOptions, ExtractionError } from '../types/index.js'
import { Logger } from '../utils/index.js'

export abstract class BaseExtractor {
  abstract readonly protocolName: string
  abstract readonly supportedChains: Chain[]
  abstract readonly source: ExtractionSource

  constructor(
    protected logger: Logger,
    protected options: ExtractorOptions = {}
  ) {}

  /**
   * Extract tBTC TVL for a specific chain
   * @throws {ExtractionError} If extraction fails after retries
   */
  abstract extract(chain: Chain): Promise<ExtractionResult>

  /**
   * Validate if extractor can handle this chain
   */
  canExtract(chain: Chain): boolean {
    return this.supportedChains.includes(chain)
  }

  /**
   * Built-in retry wrapper with exponential backoff
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    errorContext: string
  ): Promise<T> {
    const maxRetries = this.options.retries ?? 3
    let lastError: Error
    let delay = 1000

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        this.logger.warn({
          error: lastError.message,
          attempt,
          maxRetries,
          context: errorContext
        }, 'Retry attempt failed')

        if (attempt < maxRetries) {
          const backoffDelay = Math.min(delay * Math.pow(2, attempt), 10000)
          await new Promise(resolve => setTimeout(resolve, backoffDelay))
        }
      }
    }

    throw new ExtractionError(
      `Failed after ${maxRetries} attempts: ${errorContext}`,
      { cause: lastError! }
    )
  }
}
