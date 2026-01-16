import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const ConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.string().default('info'),
  outputDir: z.string().default('./data/output'),
  timeout: z.number().default(10000),
  retries: z.number().default(3),
  thegraphApiKey: z.string().optional(),
  covalentApiKey: z.string().optional()
})

export type Config = z.infer<typeof ConfigSchema>

export function loadConfig(): Config {
  return ConfigSchema.parse({
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    outputDir: process.env.OUTPUT_DIR || './data/output',
    timeout: process.env.TIMEOUT ? parseInt(process.env.TIMEOUT, 10) : 10000,
    retries: process.env.RETRIES ? parseInt(process.env.RETRIES, 10) : 3,
    thegraphApiKey: process.env.THEGRAPH_API_KEY,
    covalentApiKey: process.env.COVALENT_API_KEY
  })
}

export * from './addresses.js'
export * from './chains.js'
