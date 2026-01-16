import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { AggregatedResult } from '../types/index.js'

/**
 * Custom JSON replacer to handle BigInt serialization.
 * Converts BigInt values to strings without exponential notation.
 */
function bigIntReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString()
  }
  return value
}

export async function writeResults(
  result: AggregatedResult,
  outputDir: string
): Promise<string> {
  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true })

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `results-${timestamp}.json`
  const filepath = join(outputDir, filename)

  // Write pretty-printed JSON with BigInt support
  await writeFile(filepath, JSON.stringify(result, bigIntReplacer, 2), 'utf-8')

  return filepath
}
